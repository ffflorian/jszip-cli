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

export interface Entry {
  resolvedPath: string;
  zipPath: string;
}

export class JSZipCLI {
  private jszip: JSZip;
  private entries: Entry[];
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

  private async addFile(entry: Entry): Promise<void> {
    const {resolvedPath, zipPath} = entry;
    const fileData = await fsPromise.readFile(resolvedPath, {encoding: 'utf-8'});
    const fileStat = await fsPromise.lstat(resolvedPath);
    console.log({resolvedPath, zipPath});

    this.jszip.file(zipPath, fileData, {
      dosPermissions: fileStat.mode,
      unixPermissions: fileStat.mode,
    });
  }

  private async addLink(entry: Entry): Promise<void> {
    const fileName = path.basename(entry.resolvedPath);
    const jsZipPath = entry.zipPath + '/' + fileName;
    const fileData = await fsPromise.readLink(entry.resolvedPath);
    const fileStat = await fsPromise.lstat(entry.resolvedPath);

    this.jszip.file(jsZipPath, fileData, {
      dosPermissions: fileStat.mode,
      unixPermissions: fileStat.mode,
    });
  }

  private async checkEntry(entry: Entry): Promise<void> {
    const fileStat = await fsPromise.lstat(entry.resolvedPath);
    const ignoreEntry = this.ignoreEntries.some(ignoreEntry => Boolean(entry.resolvedPath.match(ignoreEntry)));

    if (ignoreEntry) {
      return;
    }

    if (fileStat.isDirectory()) {
      await this.walkDir(entry);
    } else if (fileStat.isFile()) {
      await this.addFile(entry);
    } else if (fileStat.isSymbolicLink()) {
      await this.addLink(entry);
    } else {
      throw new Error(`Can't read: ${entry}`);
    }
  }

  private async walkDir(entry: Entry): Promise<void> {
    const files = await fsPromise.readDir(entry.resolvedPath);
    for (const file of files) {
      const newZipPath = entry.zipPath + '/' + file;
      const newResolvedPath = path.join(entry.resolvedPath, file);
      await this.checkEntry({
        resolvedPath: newResolvedPath,
        zipPath: newZipPath,
      });
    }
  }

  public add(rawEntries: string[]): JSZipCLI {
    this.entries = rawEntries.map(rawEntry => {
      const resolvedPath = path.resolve(rawEntry);
      const baseName = path.basename(rawEntry);
      return {
        resolvedPath,
        zipPath: baseName,
      };
    });
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
      return fsPromise.writeFile(filePath, data);
    }
    throw new Error('File already exists.');
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
