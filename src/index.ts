import {BuildService} from './BuildService';
import {ExtractService} from './ExtractService';
import {CLIOptions} from './Interfaces';

const defaultOptions: Required<CLIOptions> = {
  compressionLevel: 5,
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
  private readonly options: Required<CLIOptions>;

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
