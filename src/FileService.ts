import * as fs from 'fs';
import * as path from 'path';
import * as logdown from 'logdown';
import {promisify} from 'util';
import {CLIOptions} from './Interfaces';

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

class FileService {
  private readonly logger: logdown.Logger;
  private readonly options: Required<CLIOptions>;
  constructor(options: Required<CLIOptions>) {
    this.options = options;
    this.logger = logdown('jszip-cli/FileService', {
      logger: console,
      markdown: false,
    });
    this.logger.state = {isEnabled: this.options.verbose};
  }

  public async fileIsWritable(filePath: string): Promise<boolean> {
    const dirExists = await this.dirExists(path.dirname(filePath));
    if (dirExists) {
      try {
        await fsPromise.access(filePath, fs.constants.F_OK | fs.constants.R_OK);
        this.logger.info(`File "${filePath}" already exists.`, this.options.force ? 'Forcing overwrite.' : 'Not overwriting.');
        return this.options.force;
      } catch (error) {
        return true;
      }
    }
    return false;
  }

  public async ensureDir(dirPath: string): Promise<FileService> {
    try {
      await fsPromise.access(dirPath, fs.constants.R_OK);
      this.logger.info(`Directory ${dirPath} already exists. Not creating.`);
    } catch (error) {
      this.logger.info(`Directory ${dirPath} doesn't exist yet. Creating.`);
      await fsPromise.mkdir(dirPath);
    } finally {
      return this;
    }
  }

  public async dirExists(dirPath: string): Promise<boolean> {
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
      if (this.options.force) {
        await this.ensureDir(dirPath);
        return true;
      }
      return false;
    }
  }

  public async writeFile(data: Buffer, filePath: string): Promise<FileService> {
    const fileIsWritable = await this.fileIsWritable(filePath);
    if (fileIsWritable) {
      await fsPromise.writeFile(filePath, data);
      return this;
    }
    throw new Error(`File "${this.options.outputEntry}" already exists.`);
  }
}

export {fsPromise, FileService};
