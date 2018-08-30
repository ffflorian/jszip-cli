import * as fs from 'fs';
import * as path from 'path';
import * as JSZip from 'jszip';
import {promisify} from 'util';

const fsLstatPromise = promisify(fs.lstat);
const fsReadDirPromise = promisify(fs.readdir);
const fsReadFilePromise = promisify(fs.readFile);
const fsReadLinkPromise = promisify(fs.readlink);
const fsWriteFilePromise = promisify(fs.writeFile);

export interface CLIOptions {
  entries: string[];
  ignoreEntries?: string[];
  outputFile: string;
}

export class JSZipCLI {
  private readonly jszip: JSZip;
  private entries: string[];
  private ignoreEntries: RegExp[];
  private outputDir: string;

  constructor({entries = [], ignoreEntries = [], outputFile = '.'}: CLIOptions) {
    this.jszip = new JSZip();
    this.entries = entries;
    this.ignoreEntries = ignoreEntries.map(entry => new RegExp(entry.replace('*', '.*')));
    this.outputDir = path.resolve(outputFile);
  }

  private async addFile(filePath: string): Promise<void> {
    const fileData = await fsReadFilePromise(filePath);
    this.jszip.file(filePath, fileData);
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
    this.jszip.file(filePath, fileData);
  }

  private async walkDir(filePath: string): Promise<void> {
    const files = await fsReadDirPromise(filePath);
    for (const file of files) {
      const newPath = path.join(filePath, file);
      await this.checkFile(newPath);
    }
  }

  public async save(): Promise<void> {
    if (!this.outputDir.match(/\.\w+$/)) {
      this.outputDir = path.join(this.outputDir, 'data.zip');
    }

    await Promise.all(this.entries.map(entry => this.checkFile(entry)));
    const data = await this.jszip.generateAsync({type: 'nodebuffer'});

    await fsWriteFilePromise(this.outputDir, data);
  }
}
