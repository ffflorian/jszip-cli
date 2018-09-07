import * as JSZip from 'jszip';
import * as logdown from 'logdown';
import * as os from 'os';
import * as path from 'path';
import * as progress from 'progress';
import {FileService, fsPromise} from './FileService';
import {CLIOptions} from './Interfaces';

class ExtractService {
  private readonly fileService: FileService;
  private readonly logger: logdown.Logger;
  private readonly options: Required<CLIOptions>;
  private readonly progressBar: progress;
  public outputDir: string | null;
  public extractedFilesCount: number;

  constructor(options: Required<CLIOptions>) {
    this.fileService = new FileService(options);
    this.options = options;
    this.logger = logdown('jszip-cli/ExtractService', {
      logger: console,
      markdown: false,
    });
    this.logger.state = {isEnabled: this.options.verbose};
    this.outputDir = this.options.outputEntry ? path.resolve(this.options.outputEntry) : null;
    this.progressBar = new progress('Extracting [:bar] :percent :elapseds', {
      complete: '=',
      incomplete: ' ',
      total: 100,
      width: 20,
    });
    this.extractedFilesCount = 0;
  }

  public async extract(rawEntries: string[]): Promise<ExtractService> {
    const isWin32 = os.platform() === 'win32';

    for (const entry of rawEntries) {
      const jszip = new JSZip();
      if (this.outputDir) {
        await this.fileService.ensureDir(this.outputDir);
      }

      const resolvedPath = path.resolve(entry);
      const data = await this.fileService.readFile(resolvedPath);
      const entries: Array<[string, JSZip.JSZipObject]> = [];

      await jszip.loadAsync(data, {createFolders: true});

      if (!this.outputDir) {
        this.printStream(jszip.generateNodeStream());
        return this;
      }

      jszip.forEach((filePath, entry) => entries.push([filePath, entry]));
      let lastPercent = 0;

      await Promise.all(
        entries.map(async ([filePath, entry], index) => {
          const resolvedFilePath = path.join(this.outputDir!, filePath);
          if (entry.dir) {
            await this.fileService.ensureDir(resolvedFilePath);
          } else {
            const data = await entry.async('nodebuffer');
            await fsPromise.writeFile(resolvedFilePath, data, {
              encoding: 'utf-8',
            });

            this.extractedFilesCount++;

            const diff = Math.floor(index / entries.length) - Math.floor(lastPercent);
            if (diff && !this.options.quiet) {
              this.progressBar.tick(diff);
              lastPercent = Math.floor(index / entries.length);
            }
          }

          if (isWin32) {
            entry.dosPermissions && (await fsPromise.chmod(resolvedFilePath, entry.dosPermissions));
          } else {
            entry.unixPermissions && (await fsPromise.chmod(resolvedFilePath, entry.unixPermissions));
          }
        })
      );
    }
    return this;
  }

  private printStream(fileStream: NodeJS.ReadableStream): Promise<void> {
    return new Promise((resolve, reject) => {
      const stream = fileStream.pipe(process.stdout);
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
  }
}

export {ExtractService};
