import type {TerminalOptions} from './interfaces';

export const defaultOptions: Required<TerminalOptions> = {
  compressionLevel: 5,
  configFile: true,
  dereferenceLinks: false,
  force: false,
  ignoreEntries: [],
  outputEntry: null,
  quiet: false,
  verbose: false,
};
