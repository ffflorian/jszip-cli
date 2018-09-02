interface CLIOptions {
  compressionLevel?: number;
  dereferenceLinks?: boolean;
  force?: boolean;
  ignoreEntries?: string[];
  outputEntry?: string | null;
  quiet?: boolean;
  verbose?: boolean;
}

interface Entry {
  resolvedPath: string;
  zipPath: string;
}

export {CLIOptions, Entry};
