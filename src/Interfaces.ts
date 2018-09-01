interface CLIOptions {
  force?: boolean;
  ignoreEntries?: string[];
  compressionLevel?: number;
  outputEntry?: string | null;
  verbose?: boolean;
}

interface Entry {
  resolvedPath: string;
  zipPath: string;
}

export {CLIOptions, Entry};
