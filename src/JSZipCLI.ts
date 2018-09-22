import {BuildService} from './BuildService';
import {ExtractService} from './ExtractService';
import {ConfigFileOptions, TerminalOptions} from './Interfaces';
import * as fs from 'fs-extra';
import * as logdown from 'logdown';
import * as path from 'path';

const defaultOptions: Required<TerminalOptions> = {
  compressionLevel: 5,
  configFile: true,
  dereferenceLinks: false,
  force: false,
  ignoreEntries: [],
  outputEntry: null,
  quiet: false,
  verbose: false,
};

export class JSZipCLI {
  private readonly buildService: BuildService;
  private readonly extractService: ExtractService;
  private readonly logger: logdown.Logger;
  private configFile?: string;
  private mode?: 'add' | 'extract';
  private options: Required<TerminalOptions> & Partial<ConfigFileOptions>;
  private rawEntries?: string[];
  private terminalOptions?: TerminalOptions;

  constructor(options?: TerminalOptions) {
    this.terminalOptions = options;
    this.logger = logdown('jszip-cli/index', {
      logger: console,
      markdown: false,
    });

    this.options = {...defaultOptions, ...this.terminalOptions};
    this.logger.state = {isEnabled: this.options.verbose};

    if (this.options.configFile) {
      if (typeof this.options.configFile === 'string') {
        this.readConfigFile(this.options.configFile);
      } else if (this.options.configFile === true) {
        this.readConfigFile('.jsziprc.json', true);
      }
    } else {
      this.logger.info('Not using any configuration file.');
    }

    this.logger.info('Loaded configuration', this.options);

    this.buildService = new BuildService(this.options);
    this.extractService = new ExtractService(this.options);
  }

  private readConfigFile(configFile: string, loose = false): void {
    const resolvedDir = path.resolve(configFile);
    try {
      fs.accessSync(resolvedDir, fs.constants.F_OK | fs.constants.R_OK);
      this.configFile = resolvedDir;
    } catch (error) {
      if (!loose) {
        throw new Error(`Can't read configuration file "${resolvedDir}".`);
      }
      this.logger.info('Not using any configuration file (default configuration file not found).');
      return;
    }

    this.logger.info(`Using configuration file "${resolvedDir}".`);

    try {
      const configFileData: ConfigFileOptions = require(resolvedDir);
      if (configFileData.entries) {
        this.rawEntries = configFileData.entries;
        delete configFileData.entries;
      }
      if (configFileData.mode) {
        this.mode = configFileData.mode;
        delete configFileData.mode;
      }

      this.options = {...defaultOptions, ...configFileData, ...this.terminalOptions};
      this.logger.state = {isEnabled: this.options.verbose};
    } catch (error) {
      this.logger.error(error);
      throw new Error(`Malformed configuration file "${resolvedDir}": ${error.message}`);
    }
  }

  /**
   * Add files and directories to the ZIP file.
   * @param rawEntries The entries (files, directories) to add.
   * If not specified, entries from configuration file are used.
   */
  public add(rawEntries?: string[]): BuildService {
    if (!rawEntries || !rawEntries.length) {
      if (this.rawEntries) {
        rawEntries = this.rawEntries;
      } else {
        throw new Error('No entries to add.');
      }
    }
    return this.buildService.add(rawEntries);
  }

  /**
   * Add files and directories to the ZIP file.
   * @param rawEntries The entries (files, directories) to extract.
   * If not specified, entries from configuration file are used.
   */
  public extract(rawEntries?: string[]): Promise<ExtractService> {
    if (!rawEntries || !rawEntries.length) {
      if (this.rawEntries) {
        rawEntries = this.rawEntries;
      } else {
        throw new Error('No entries to extract.');
      }
    }
    return this.extractService.extract(rawEntries);
  }

  /**
   * Run in file mode - reads entries and settings from configuration file.
   * Options from the constructor still take precedence.
   */
  public fileMode(): Promise<JSZipCLI> {
    if (!this.configFile) {
      throw new Error('No configuration file and no mode specified.');
    }
    if (this.mode === 'add') {
      return this.add()
        .save()
        .then(({outputFile, compressedFilesCount}) => {
          if (this.options.outputEntry && !this.options.quiet) {
            console.log(`Done compressing ${compressedFilesCount} files to "${outputFile}".`);
          }
          return this;
        });
    } else if (this.mode === 'extract') {
      return this.extract().then(({outputDir, extractedFilesCount}) => {
        if (this.options.outputEntry && !this.options.quiet) {
          console.log(`Done extracting ${extractedFilesCount} files to "${outputDir}".`);
        }
        return this;
      });
    } else {
      throw new Error('No or invalid mode in configuration file defined.');
    }
  }

  public save(): Promise<BuildService> {
    return this.buildService.save();
  }
}
