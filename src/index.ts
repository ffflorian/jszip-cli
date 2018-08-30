import * as fs from 'fs';
import * as path from 'path';
import * as JSZip from 'jszip';
import {promisify} from 'util';

const fsPromise = {
  access: promisify(fs.access),
  chmod: promisify(fs.writeFile),
  lstat: promisify(fs.lstat),
  mkdir: promisify(fs.mkdir),
  readDir: promisify(fs.readdir),
  readFile: promisify(fs.readFile),
  readLink: promisify(fs.readlink),
  writeFile: promisify(fs.writeFile),
};

export interface CLIOptions {
  ignoreEntries?: string[];
  level?: number;
  outputEntry?: string;
}

export class JSZipCLI {
  private jszip: JSZip;
  private entries: string[];
  private ignoreEntries: RegExp[];
  private compressionLevel: number;
  private outputEntry: string | null;

  constructor(options: CLIOptions) {
    const {ignoreEntries = [], level = 5, outputEntry = null} = options || {};

    this.jszip = new JSZip();
    this.compressionLevel = level;
    this.entries = [];
    this.ignoreEntries = ignoreEntries.map(entry => new RegExp(entry.replace('*', '.*')));
    this.outputEntry = typeof outputEntry === 'string' ? path.resolve(outputEntry) : outputEntry;
  }

  private async addFile(filePath: string, fileMode: number): Promise<void> {
    const fileData = await fsPromise.readFile(filePath);
    this.jszip.file(filePath, fileData, {
      compression: '',
      dosPermissions: fileMode,
      unixPermissions: fileMode,
    });
  }

  private async checkEntry(filePath: string): Promise<void> {
    const fileStat = await fsPromise.lstat(filePath);
    const ignoreEntry = this.ignoreEntries.some(entry => Boolean(filePath.match(entry)));

    if (ignoreEntry) {
      return;
    }

    if (fileStat.isDirectory()) {
      await this.walkDir(filePath);
    } else if (fileStat.isFile()) {
      await this.addFile(filePath, fileStat.mode);
    } else if (fileStat.isSymbolicLink()) {
      await this.addLink(filePath, fileStat.mode);
    } else {
      throw new Error(`Can't read: ${filePath}`);
    }
  }

  private async addLink(linkPath: string, fileMode: number): Promise<void> {
    const fileData = await fsPromise.readLink(linkPath);

    this.jszip.file(linkPath, fileData, {
      dosPermissions: fileMode,
      unixPermissions: fileMode,
    });
  }

  private async walkDir(filePath: string): Promise<void> {
    const files = await fsPromise.readDir(filePath);
    for (const file of files) {
      const newPath = path.join(filePath, file);
      await this.checkEntry(newPath);
    }
  }

  public add(entries: string[]): JSZipCLI {
    this.entries = entries;
    return this;
  }

  private async ensureDir(dirPath: string): Promise<void> {
    try {
      await fsPromise.access(dirPath, fs.constants.R_OK);
    } catch (error) {
      await fsPromise.mkdir(dirPath);
    }
  }

  public async extract(files: string[]): Promise<void> {
    for (const file of files) {
      const jszip = new JSZip();
      if (this.outputEntry) {
        await this.ensureDir(this.outputEntry);
      }

      const resolvedPath = path.resolve(file);
      const data = await fsPromise.readFile(resolvedPath);

      await jszip.loadAsync(data, {createFolders: true});

      if (!this.outputEntry) {
        this.printStream(jszip.generateNodeStream());
        return;
      }

      const entries: [string, JSZip.JSZipObject][] = [];

      jszip.forEach((filePath, entry) => entries.push([filePath, entry]));

      await Promise.all(
        entries.map(async ([filePath, entry]) => {
          const resolvedFilePath = path.join(this.outputEntry!, filePath);
          if (entry.dir) {
            await this.ensureDir(resolvedFilePath);
          } else {
            const data = await entry.async('nodebuffer');
            await fsPromise.writeFile(resolvedFilePath, data, {
              encoding: 'utf-8',
            });
            if (entry.unixPermissions) {
              await fsPromise.chmod(resolvedFilePath, entry.unixPermissions);
            }
          }
        })
      );
    }
  }

  public getBuffer(): Promise<Buffer> {
    const compressionType = this.compressionLevel === 0 ? 'STORE' : 'DEFLATE';

    return this.jszip.generateAsync({
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
      stream.on('error', reject);
    });
  }

  private async writeFile(data: Buffer, filePath: string): Promise<void> {
    try {
      await fsPromise.access(filePath, fs.constants.R_OK);
    } catch (error) {
      return fsPromise.writeFile(data, filePath);
    }
  }

  public async save(): Promise<void> {
    await Promise.all(this.entries.map(entry => this.checkEntry(entry)));
    const data = await this.getBuffer();

    if (this.outputEntry) {
      if (!this.outputEntry.match(/\.\w+$/)) {
        this.outputEntry = path.join(this.outputEntry, 'data.zip');
      }

      await this.writeFile(data, this.outputEntry);
    } else {
      process.stdout.write(data);
    }
  }
}
