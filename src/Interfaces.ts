interface CLIOptions {
  force?: boolean;
  ignoreEntries?: string[];
  compressionLevel?: number;
  outputEntry?: string | null;
  quiet?: boolean;
  verbose?: boolean;
}

interface Entry {
  resolvedPath: string;
  zipPath: string;
}

export {CLIOptions, Entry};
