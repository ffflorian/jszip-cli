import * as fs from 'fs';
import * as path from 'path';
import * as JSZip from 'jszip';
import * as logdown from 'logdown';
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
  force?: boolean;
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
  private force: boolean;
  private ignoreEntries: RegExp[];
  private compressionLevel: number;
  private outputEntry: string | null;
  private readonly logger: logdown.Logger;

  constructor(options: CLIOptions) {
    const {ignoreEntries = [], level = 5, outputEntry = null} = options || {};

    this.jszip = new JSZip();
    this.compressionLevel = level;
    this.entries = [];
    this.force = options.force || false;
    this.ignoreEntries = ignoreEntries.map(entry => new RegExp(entry.replace('*', '.*')));
    this.outputEntry = outputEntry ? path.resolve(outputEntry) : null;
    this.logger = logdown('jszip-cli/JSZipCli', {
      logger: console,
      markdown: false,
    });
  }

  private addDir(entry: Entry): JSZip {
    return this.jszip.folder(entry.zipPath);
  }

  private async addFile(entry: Entry, jszip: JSZip): Promise<void> {
    const {resolvedPath} = entry;
    const fileName = path.basename(resolvedPath);
    const fileData = await fsPromise.readFile(resolvedPath);
    const fileStat = await fsPromise.lstat(resolvedPath);

    jszip.file(fileName, fileData, {
      date: fileStat.mtime,
      createFolders: false,
      binary: true,
      dir: false,
      dosPermissions: fileStat.mode,
      unixPermissions: fileStat.mode,
    });
  }

  private async addLink(entry: Entry, jszip: JSZip): Promise<void> {
    const {resolvedPath} = entry;
    const fileName = path.basename(resolvedPath);
    const fileData = await fsPromise.readLink(entry.resolvedPath);
    const fileStat = await fsPromise.lstat(entry.resolvedPath);

    jszip.file(fileName, fileData, {
      dosPermissions: fileStat.mode,
      unixPermissions: fileStat.mode,
    });
  }

  private async checkEntry(entry: Entry, jszip: JSZip): Promise<void> {
    const fileStat = await fsPromise.lstat(entry.resolvedPath);
    const ignoreEntries = this.ignoreEntries.filter(ignoreEntry => Boolean(entry.resolvedPath.match(ignoreEntry)));

    if (ignoreEntries.length) {
      this.logger.info(
        `Found ${entry.resolvedPath}. Not adding since it's on the ignore list:`,
        ignoreEntries.map(entry => String(entry))
      );
      return;
    }

    this.logger.info(`Found ${entry.resolvedPath}. Adding to the ZIP file.`);

    if (fileStat.isDirectory()) {
      const jszip = this.addDir(entry);
      await this.walkDir(entry, jszip);
    } else if (fileStat.isFile()) {
      await this.addFile(entry, jszip);
    } else if (fileStat.isSymbolicLink()) {
      await this.addLink(entry, jszip);
    } else {
      this.logger.info(`Unknown file type.`, fileStat);
      throw new Error(`Can't read: ${entry}`);
    }
  }

  private async walkDir(entry: Entry, jszip: JSZip): Promise<void> {
    this.logger.info(`Walking directory ${entry.resolvedPath} ...`);
    const files = await fsPromise.readDir(entry.resolvedPath);
    for (const file of files) {
      const newZipPath = entry.zipPath + '/' + file;
      const newResolvedPath = path.join(entry.resolvedPath, file);
      await this.checkEntry(
        {
          resolvedPath: newResolvedPath,
          zipPath: newZipPath,
        },
        jszip
      );
    }
  }

  public add(rawEntries: string[]): JSZipCLI {
    this.logger.info(`Adding ${rawEntries.length} entr${rawEntries.length === 1 ? 'y' : 'ies'} to ZIP file.`);
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
      this.logger.info(`Directory ${dirPath} already exists. Not creating.`);
    } catch (error) {
      this.logger.info(`Directory ${dirPath} doesn't exist yet. Creating.`);
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
      const entries: [string, JSZip.JSZipObject][] = [];

      await jszip.loadAsync(data, {createFolders: true});

      if (!this.outputEntry) {
        this.printStream(jszip.generateNodeStream());
        return;
      }

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

  private async fileIsWritable(filePath: string): Promise<boolean> {
    const dirExists = await this.dirExists(path.dirname(filePath));
    if (dirExists) {
      try {
        await fsPromise.access(filePath, fs.constants.F_OK | fs.constants.R_OK);
        this.logger.info(`File "${filePath}" already exists.`, this.force ? 'Forcing overwrite.' : '');
        return this.force;
      } catch (error) {
        return true;
      }
    }
    return false;
  }

  private async dirExists(dirPath: string): Promise<boolean> {
    try {
      await fsPromise.access(dirPath, fs.constants.F_OK);
      try {
        await fsPromise.access(dirPath, fs.constants.W_OK);
        return true;
      } catch (error) {
        this.logger.info(`Directory "${dirPath}" exists but is not writable.`);
        return false;
      }
    } catch (error) {
      this.logger.info(`Directory "${dirPath}" doesn't exist.`);
      if (this.force) {
        await this.ensureDir(dirPath);
        return true;
      }
      return false;
    }
  }

  private async writeFile(data: Buffer, filePath: string): Promise<void> {
    const fileIsWritable = await this.fileIsWritable(filePath);
    if (fileIsWritable) {
      return fsPromise.writeFile(filePath, data);
    }
    throw new Error(`File "${this.outputEntry}" already exists.`);
  }

  private async checkOutput(): Promise<void> {
    if (this.outputEntry) {
      if (this.outputEntry.match(/\.\w+$/)) {
        const dirExists = await this.dirExists(path.dirname(this.outputEntry));

        if (!dirExists) {
          throw new Error(`Directory "${path.dirname(this.outputEntry)}" doesn't exist or is not writable.`);
        }

        const fileIsWritable = await this.fileIsWritable(this.outputEntry);
        if (!fileIsWritable) {
          throw new Error(`File "${this.outputEntry}" already exists.`);
        }
      } else {
        const dirExists = await this.dirExists(this.outputEntry);

        if (!dirExists) {
          throw new Error(`Directory "${this.outputEntry}" doesn't exist or is not writable.`);
        }
      }
    }
  }

  public async save(): Promise<void> {
    await this.checkOutput();

    await Promise.all(this.entries.map(entry => this.checkEntry(entry, this.jszip)));
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
