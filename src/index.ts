import * as fs from 'fs';
import * as path from 'path';
import * as JSZip from 'jszip';
import {promisify} from 'util';

export interface CLIOptions {
  ignoreEntries?: string[];
  entries: string[];
  outputDir: string;
}

export class JSZipCLI {
  private jszip: JSZip;

  constructor(private readonly options: CLIOptions) {
    this.jszip = new JSZip();
  }

  private async addFile(filePath: string): Promise<void> {
    const fileData = await promisify(fs.readFile)(filePath);
    this.jszip.file(filePath, fileData);
  }

  private async checkFile(filePath: string): Promise<void> {
    const fileStat = await promisify(fs.lstat)(filePath);

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
    const fileData = await promisify(fs.readlink)(filePath);
    this.jszip.file(filePath, fileData);
  }

  private async walkDir(filePath: string): Promise<void> {
    const files = await promisify(fs.readdir)(filePath);
    for (const file of files) {
      const newPath = path.join(filePath, file);
      await this.checkFile(newPath);
    }
  }

  public async save(): Promise<void> {
    const outputFile = path.join(this.options.outputDir, 'data.zip');

    await Promise.all(this.options.entries.map(file => this.checkFile(file)));
    const data = await this.jszip.generateAsync({type: 'nodebuffer'});

    await promisify(fs.writeFile)(outputFile, data);
  }
}
