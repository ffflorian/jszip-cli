import cosmiconfig = require('cosmiconfig');
import * as logdown from 'logdown';
import {BuildService} from './BuildService';
import {ExtractService} from './ExtractService';
import {ConfigFileOptions, TerminalOptions} from './interfaces';

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
  private readonly configExplorer: cosmiconfig.Explorer;
  private readonly configFile?: string;
  private options: Required<TerminalOptions> & Partial<ConfigFileOptions>;
  private readonly terminalOptions?: TerminalOptions;

  constructor(options?: TerminalOptions) {
    this.terminalOptions = options;
    this.logger = logdown('jszip-cli/index', {
      logger: console,
      markdown: false,
    });
    this.configExplorer = cosmiconfig('jszip');

    this.options = {...defaultOptions, ...this.terminalOptions};
    this.logger.state = {isEnabled: this.options.verbose};

    this.checkConfigFile();

    this.logger.info('Loaded options', this.options);

    this.buildService = new BuildService(this.options);
    this.extractService = new ExtractService(this.options);
  }

  /**
   * Add files and directories to the ZIP file.
   * @param rawEntries The entries (files, directories) to add.
   * If not specified, entries from configuration file are used.
   */
  public add(rawEntries?: string[]): BuildService {
    if (!rawEntries || !rawEntries.length) {
      if (this.options.entries) {
        rawEntries = this.options.entries;
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
      if (this.options.entries) {
        rawEntries = this.options.entries;
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
  public async fileMode(): Promise<JSZipCLI> {
    if (!this.options.mode && !this.configFile) {
      throw new Error('No configuration file and no mode specified.');
    }
    if (this.options.mode === 'add') {
      const {outputFile, compressedFilesCount} = await this.add().save();

      if (this.options.outputEntry && !this.options.quiet) {
        console.log(`Done compressing ${compressedFilesCount} files to "${outputFile}".`);
      }

      return this;
    } else if (this.options.mode === 'extract') {
      const {outputDir, extractedFilesCount} = await this.extract();

      if (this.options.outputEntry && !this.options.quiet) {
        console.log(`Done extracting ${extractedFilesCount} files to "${outputDir}".`);
      }

      return this;
    } else {
      throw new Error('No or invalid mode in configuration file defined.');
    }
  }

  public save(): Promise<BuildService> {
    return this.buildService.save();
  }

  private checkConfigFile(): void {
    if (!this.options.configFile) {
      this.logger.info('Not using any configuration file.');
      return;
    }

    let configResult: cosmiconfig.CosmiconfigResult = null;

    if (typeof this.options.configFile === 'string') {
      try {
        configResult = this.configExplorer.loadSync(this.options.configFile);
      } catch (error) {
        throw new Error(`Can't read configuration file: ${error.message}`);
      }
    } else if (this.options.configFile === true) {
      try {
        configResult = this.configExplorer.searchSync();
      } catch (error) {
        this.logger.error(error);
      }
    }

    if (!configResult || configResult.isEmpty) {
      this.logger.info('Not using any configuration file.');
      return;
    }

    const configFileData = configResult.config as ConfigFileOptions;

    this.logger.info(`Using configuration file ${configResult.filepath}`);

    this.options = {...defaultOptions, ...configFileData, ...this.terminalOptions};
    this.logger.state = {isEnabled: this.options.verbose};
  }
}
