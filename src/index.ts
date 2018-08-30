import * as fs from 'fs';
import * as path from 'path';
import * as JSZip from 'jszip';
import {promisify} from 'util';

const fsReadFilePromise = promisify(fs.readFile);
const fsLstatPromise = promisify(fs.lstat);
const fsReadLinkPromise = promisify(fs.readlink);
const fsReadDirPromise = promisify(fs.readdir);

export interface CLIOptions {
  ignoreEntries?: string[];
  entries: string[];
  outputFile: string;
}

export class JSZipCLI {
  private jszip: JSZip;
  private outputDir: string;

  constructor(private readonly options: CLIOptions) {
    this.jszip = new JSZip();
    this.outputDir = path.resolve(options.outputFile);
  }

  private async addFile(filePath: string): Promise<void> {
    const fileData = await fsReadFilePromise(filePath);
    this.jszip.file(filePath, fileData);
  }

  private async checkFile(filePath: string): Promise<void> {
    const fileStat = await fsLstatPromise(filePath);

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

    await Promise.all(this.options.entries.map(entry => this.checkFile(entry)));
    const data = await this.jszip.generateAsync({type: 'nodebuffer'});

    await promisify(fs.writeFile)(this.outputDir, data);
  }
}
