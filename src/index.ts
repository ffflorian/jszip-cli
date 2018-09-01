import {CLIOptions} from './Interfaces';
import {BuildService} from './BuildService';
import {ExtractService} from './ExtractService';

const defaultOptions: Required<CLIOptions> = {
  force: false,
  ignoreEntries: [],
  compressionLevel: 5,
  outputEntry: null,
  verbose: false,
};

export class JSZipCLI {
  private readonly buildService: BuildService;
  private readonly extractService: ExtractService;
  private options: Required<CLIOptions>;

  constructor(options: CLIOptions = defaultOptions) {
    this.options = {...defaultOptions, ...options};
    this.buildService = new BuildService(this.options);
    this.extractService = new ExtractService(this.options);
  }

  public add(rawEntries: string[]): BuildService {
    return this.buildService.add(rawEntries);
  }

  public extract(rawEntries: string[]): Promise<ExtractService> {
    return this.extractService.extract(rawEntries);
  }

  public save(): Promise<BuildService> {
    return this.buildService.save();
  }
}
