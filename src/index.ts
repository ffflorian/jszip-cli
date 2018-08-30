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

  private async addFile(jszip: JSZip, filePath: string): Promise<void> {
    const fileData = await promisify(fs.readFile)(filePath);
    jszip.file(filePath, fileData);
  }

  private addFolder(dirPath: string): JSZip {
    return this.jszip.folder(dirPath);
  }

  private async checkFile(jszip: JSZip, filePath: string): Promise<void> {
    const fileStat = await promisify(fs.lstat)(filePath);

    if (fileStat.isSymbolicLink()) {
      await this.addLink(jszip, filePath);
    } else if (fileStat.isDirectory()) {
      await this.walkDir(jszip, filePath);
    } else if (fileStat.isFile()) {
      await this.addFile(jszip, filePath);
    } else {
      throw new Error(`Unknown file: ${filePath}`);
    }
  }

  private async addLink(jszip: JSZip, filePath: string): Promise<void> {
    const fileData = await promisify(fs.readlink)(filePath);
    jszip.file(filePath, fileData);
  }

  private async walkDir(jszip: JSZip, filePath: string): Promise<void> {
    const files = await promisify(fs.readdir)(filePath);
    for (const file of files) {
      const newPath = path.join(filePath, file);
      await this.checkFile(jszip, newPath);
    }
  }

  public async save(): Promise<void> {
    const outputFile = path.join(this.options.outputDir, 'data.zip');

    await Promise.all(this.options.entries.map(file => this.checkFile(this.jszip, file)));
    const data = await this.jszip.generateAsync({type: 'nodebuffer'});

    await promisify(fs.writeFile)(outputFile, data);
  }
}
