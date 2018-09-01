import * as logdown from 'logdown';
import * as JSZip from 'jszip';
import * as path from 'path';
import {CLIOptions} from './Interfaces';
import {fsPromise, FileService} from './FileService';

class ExtractService {
  private readonly fileService: FileService;
  private readonly logger: logdown.Logger;
  private readonly options: Required<CLIOptions>;

  constructor(options: Required<CLIOptions>) {
    this.fileService = new FileService(options);
    this.options = options;
    this.logger = logdown('jszip-cli/ExtractService', {
      logger: console,
      markdown: false,
    });
    this.logger.state = {isEnabled: this.options.verbose};
  }

  private printStream(fileStream: NodeJS.ReadableStream): Promise<void> {
    return new Promise((resolve, reject) => {
      const stream = fileStream.pipe(process.stdout);
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
  }

  public async extract(rawEntries: string[]): Promise<ExtractService> {
    for (const entry of rawEntries) {
      const jszip = new JSZip();
      if (this.options.outputEntry) {
        await this.fileService.ensureDir(this.options.outputEntry);
      }

      const resolvedPath = path.resolve(entry);
      const data = await fsPromise.readFile(resolvedPath);
      const entries: [string, JSZip.JSZipObject][] = [];

      await jszip.loadAsync(data, {createFolders: true});

      if (!this.options.outputEntry) {
        this.printStream(jszip.generateNodeStream());
        return this;
      }

      jszip.forEach((filePath, entry) => entries.push([filePath, entry]));

      await Promise.all(
        entries.map(async ([filePath, entry]) => {
          const resolvedFilePath = path.join(this.options.outputEntry!, filePath);
          if (entry.dir) {
            await this.fileService.ensureDir(resolvedFilePath);
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
    return this;
  }
}

export {ExtractService};
