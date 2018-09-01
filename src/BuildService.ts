import * as logdown from 'logdown';
import * as JSZip from 'jszip';
import * as path from 'path';
import {CLIOptions, Entry} from './Interfaces';
import {fsPromise, FileService} from './FileService';

class BuildService {
  private readonly fileService: FileService;
  private readonly jszip: JSZip;
  private readonly logger: logdown.Logger;
  private readonly options: Required<CLIOptions>;
  private entries: Entry[];
  private ignoreEntries: RegExp[];
  private outputEntry: string | null;

  constructor(options: Required<CLIOptions>) {
    this.fileService = new FileService(options);
    this.jszip = new JSZip();
    this.logger = logdown('jszip-cli/BuildService', {
      logger: console,
      markdown: false,
    });
    this.logger.state = {isEnabled: options.verbose};
    this.options = options;
    this.jszip = new JSZip();
    this.entries = [];
    this.ignoreEntries = this.options.ignoreEntries.map(entry => new RegExp(entry.replace('*', '.*')));
    this.outputEntry = this.options.outputEntry ? path.resolve(this.options.outputEntry) : null;
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

  public add(rawEntries: string[]): BuildService {
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

  public getBuffer(): Promise<Buffer> {
    const compressionType = this.options.compressionLevel === 0 ? 'STORE' : 'DEFLATE';

    return this.jszip.generateAsync({
      type: 'nodebuffer',
      compression: compressionType,
      compressionOptions: {
        level: this.options.compressionLevel,
      },
    });
  }

  private async checkOutput(): Promise<void> {
    if (this.outputEntry) {
      if (this.outputEntry.match(/\.\w+$/)) {
        const dirExists = await this.fileService.dirExists(path.dirname(this.outputEntry));

        if (!dirExists) {
          throw new Error(`Directory "${path.dirname(this.outputEntry)}" doesn't exist or is not writable.`);
        }

        const fileIsWritable = await this.fileService.fileIsWritable(this.outputEntry);
        if (!fileIsWritable) {
          throw new Error(`File "${this.outputEntry}" already exists.`);
        }
      } else {
        const dirExists = await this.fileService.dirExists(this.outputEntry);

        if (!dirExists) {
          throw new Error(`Directory "${this.outputEntry}" doesn't exist or is not writable.`);
        }
      }
    }
  }

  public async save(): Promise<BuildService> {
    await this.checkOutput();

    await Promise.all(this.entries.map(entry => this.checkEntry(entry, this.jszip)));
    const data = await this.getBuffer();

    if (this.outputEntry) {
      if (!this.outputEntry.match(/\.\w+$/)) {
        this.outputEntry = path.join(this.outputEntry, 'data.zip');
      }

      await this.fileService.writeFile(data, this.outputEntry);
    } else {
      process.stdout.write(data);
    }
    return this;
  }
}

export {BuildService};
