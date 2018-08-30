import * as fs from 'fs';
import * as path from 'path';
import * as JSZip from 'jszip';
import {promisify} from 'util';

const fsChmodPromise = promisify(fs.chmod);
const fsAccessPromise = promisify(fs.access);
const fsLstatPromise = promisify(fs.lstat);
const fsMkdirPromise = promisify(fs.mkdir);
const fsReadDirPromise = promisify(fs.readdir);
const fsReadFilePromise = promisify(fs.readFile);
const fsReadLinkPromise = promisify(fs.readlink);

export interface CLIOptions {
  ignoreEntries?: string[];
  level?: number;
  outputDir?: string;
}

export class JSZipCLI {
  private jszip: JSZip;
  private entries: string[];
  private ignoreEntries: RegExp[];
  private compressionLevel: number;
  private outputDir: string | null;

  constructor(options: CLIOptions) {
    const {ignoreEntries = [], level = 5, outputDir = null} = options || {};

    this.jszip = new JSZip();
    this.compressionLevel = level;
    this.entries = [];
    this.ignoreEntries = ignoreEntries.map(entry => new RegExp(entry.replace('*', '.*')));
    this.outputDir = typeof outputDir === 'string' ? path.resolve(outputDir) : outputDir;
  }

  private async addFile(filePath: string): Promise<void> {
    const fileData = await fsReadFilePromise(filePath);
    this.jszip.file(filePath, fileData, {
      compression: '',
    });
  }

  private async checkFile(filePath: string): Promise<void> {
    const fileStat = await fsLstatPromise(filePath);
    const ignoreEntry = this.ignoreEntries.some(entry => Boolean(filePath.match(entry)));

    if (ignoreEntry) {
      return;
    }

    if (fileStat.isSymbolicLink()) {
      await this.addLink(filePath);
    } else if (fileStat.isDirectory()) {
      await this.walkDir(filePath);
    } else if (fileStat.isFile()) {
      await this.addFile(filePath);
    } else {
      throw new Error(`Can't read: ${filePath}`);
    }
  }

  private async addLink(filePath: string): Promise<void> {
    const fileData = await fsReadLinkPromise(filePath);
    const {mode} = await fsLstatPromise(filePath);
    this.jszip.file(filePath, fileData, {
      dosPermissions: mode,
      unixPermissions: mode,
    });
  }

  private async walkDir(filePath: string): Promise<void> {
    const files = await fsReadDirPromise(filePath);
    for (const file of files) {
      const newPath = path.join(filePath, file);
      await this.checkFile(newPath);
    }
  }

  public add(entries: string[]): JSZipCLI {
    this.entries = entries;
    return this;
  }

  private writeFileStream(fileStream: NodeJS.ReadableStream, filePath: string, fileMode?: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const stream = fileStream.pipe(fs.createWriteStream(filePath, {
        mode: fileMode,
      }));
      stream.on('finish', resolve);
      stream.on('error', error => reject(error));
    });
  }

  private async ensureDir(dirPath: string): Promise<void> {
    try {
      await fsAccessPromise(dirPath, fs.constants.R_OK);
    } catch(error) {
      console.log('Creating', dirPath)
      await fsMkdirPromise(dirPath);
    }
  }

  public async extract(files: string[]): Promise<void> {
    for (const file of files) {
      this.jszip = new JSZip();
      if (this.outputDir) {
        await this.ensureDir(this.outputDir);
      }

      const resolvedPath = path.resolve(file);
      const entries: [string, JSZip.JSZipObject][] = [];
      const data = await fsReadFilePromise(resolvedPath);

      await this.jszip.loadAsync(data, {createFolders: true});
      this.jszip.forEach((filePath, entry) => entries.push([filePath, entry]));

      await Promise.all(
        entries.map(async ([filePath, entry]) => {
          if (this.outputDir) {
            const resolvedFilePath = path.join(this.outputDir, filePath);
            if (entry.dir) {
              await this.ensureDir(resolvedFilePath);
            } else {
              await this.writeFileStream(entry.nodeStream(), resolvedFilePath, entry.unixPermissions ? Number(entry.unixPermissions) : undefined);
            }
          } else {
            this.printStream(entry.nodeStream());
          }
        })
      );
    }
  }

  public getStream(): NodeJS.ReadableStream {
    const compressionType = this.compressionLevel === 0 ? 'STORE' : 'DEFLATE';

    return this.jszip.generateNodeStream({
      type: 'nodebuffer',
      compression: compressionType,
      compressionOptions: {
        level: this.compressionLevel,
      },
    });
  }

  private printStream(fileStream: NodeJS.ReadableStream): Promise<void> {
    return new Promise((resolve, reject) => {
      const stream = fileStream.pipe(process.stdout);
      stream.on('finish', resolve);
      stream.on('error', error => reject(error));
    });
  }

  public async save(): Promise<void> {
    await Promise.all(this.entries.map(entry => this.checkFile(entry)));

    if (this.outputDir) {
      if (!this.outputDir.match(/\.\w+$/)) {
        this.outputDir = path.join(this.outputDir, 'data.zip');
      }

      await this.writeFileStream(this.getStream(), this.outputDir);
    } else {
      await this.printStream(this.getStream());
    }
  }
}
