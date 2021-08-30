#!/usr/bin/env node

import {program as commander} from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';

import {JSZipCLI} from './JSZipCLI';
import {defaultOptions} from './defaultOptions';

const defaultPackageJsonPath = path.join(__dirname, 'package.json');
const packageJsonPath = fs.existsSync(defaultPackageJsonPath)
  ? defaultPackageJsonPath
  : path.join(__dirname, '../package.json');

const {description, name, version}: {description: string; name: string; version: string} =
  fs.readJSONSync(packageJsonPath);

interface CLIOptions {
  config?: string;
  dereference?: boolean;
  force?: boolean;
  ignore?: string;
  level?: string;
  noconfig?: boolean;
  output?: string;
  quiet?: boolean;
  verbose?: boolean;
}

commander
  .name(name.replace(/^@[^/]+\//, ''))
  .description(description)
  .option('--noconfig', "don't look for a configuration file")
  .option('-c, --config <path>', 'use a configuration file')
  .option('-d, --dereference', 'dereference (follow) links', false)
  .option('-f, --force', 'force overwriting files and directories when extracting', false)
  .option('-i, --ignore <entry>', 'ignore a file or directory')
  .option('-l, --level <number>', 'set the compression level', '5')
  .option('-o, --output <dir>', 'set the output file or directory (default: stdout)')
  .option('-q, --quiet', "don't log anything", false)
  .option('-V, --verbose', 'enable verbose logging', false)
  .version(version, '-v, --version')
  .on('command:*', args => {
    console.error(`\n  error: invalid command \`${args[0]}'\n`);
    process.exit(1);
  });

commander
  .command('add')
  .alias('a')
  .description('add files and directories to a new ZIP archive')
  .option('--noconfig', "don't look for a configuration file")
  .option('-c, --config <path>', 'use a configuration file')
  .option('-d, --dereference', 'dereference (follow) symlinks', false)
  .option('-f, --force', 'force overwriting files and directories when extracting', false)
  .option('-i, --ignore <entry>', 'ignore a file or directory')
  .option('-l, --level <number>', 'set the compression level', '5')
  .option('-o, --output <dir>', 'set the output file or directory (default: stdout)')
  .option('-q, --quiet', "don't log anything excluding errors", false)
  .option('-V, --verbose', 'enable verbose logging', false)
  .arguments('[entries...]')
  .action((entries: string[]) => {
    const options = commander.opts() as CLIOptions;
    try {
      new JSZipCLI({
        compressionLevel: Number(options.level) ?? defaultOptions.compressionLevel,
        configFile: options.config ?? (options.noconfig && false) ?? defaultOptions.configFile,
        dereferenceLinks: options.dereference ?? defaultOptions.dereferenceLinks,
        force: options.force ?? defaultOptions.force,
        ignoreEntries: options.ignore ? [options.ignore] : defaultOptions.ignoreEntries,
        outputEntry: options.output ?? defaultOptions.outputEntry,
        quiet: options.quiet ?? defaultOptions.quiet,
        verbose: options.verbose ?? defaultOptions.verbose,
      })
        .add(entries)
        .save()
        .then(({outputFile, compressedFilesCount}) => {
          if (options.output && !options.quiet) {
            console.info(`Done compressing ${compressedFilesCount} files to "${outputFile}".`);
          }
        })
        .catch(error => {
          console.error('Error:', (error as Error).message);
          process.exit(1);
        });
    } catch (error) {
      console.error('Error:', (error as Error).message);
      process.exit(1);
    }
  });

commander
  .command('extract')
  .alias('e')
  .description('extract files and directories from ZIP archive(s)')
  .option('--noconfig', "don't look for a configuration file", false)
  .option('-c, --config <path>', 'use a configuration file')
  .option('-o, --output <dir>', 'set the output file or directory (default: stdout)')
  .option('-i, --ignore <entry>', 'ignore a file or directory')
  .option('-f, --force', 'force overwriting files and directories', false)
  .option('-V, --verbose', 'enable verbose logging', false)
  .option('-q, --quiet', "don't log anything excluding errors", false)
  .arguments('<archives...>')
  .action((archives: string[]) => {
    const options = commander.opts() as CLIOptions;
    try {
      new JSZipCLI({
        configFile: options.config ?? (options.noconfig && false) ?? defaultOptions.configFile,
        force: options.force ?? defaultOptions.force,
        ignoreEntries: options.ignore ? [options.ignore] : defaultOptions.ignoreEntries,
        outputEntry: options.output ?? defaultOptions.outputEntry,
        quiet: options.quiet ?? defaultOptions.quiet,
        verbose: options.verbose ?? defaultOptions.verbose,
      })
        .extract(archives)
        .then(({outputDir, extractedFilesCount}) => {
          if (options.output && !options.quiet) {
            console.info(`Done extracting ${extractedFilesCount} files to "${outputDir}".`);
          }
        })
        .catch(error => {
          console.error('Error:', (error as Error).message);
          process.exit(1);
        });
    } catch (error) {
      console.error('Error:', (error as Error).message);
      process.exit(1);
    }
  });

commander.parse(process.argv);

const commanderOptions = commander.opts();

if (!commander.args.length) {
  if (commanderOptions.noconfig) {
    commander.outputHelp();
    process.exit(1);
  }
  try {
    new JSZipCLI({
      configFile: commanderOptions.config || true,
      ...(commanderOptions.force && {force: commanderOptions.force}),
      ...(commanderOptions.ignore && {ignoreEntries: [commanderOptions.ignore]}),
      ...(commanderOptions.output && {outputEntry: commanderOptions.output}),
      ...(commanderOptions.quiet && {quiet: commanderOptions.quiet}),
      ...(commanderOptions.verbose && {verbose: commanderOptions.verbose}),
    })
      .fileMode()
      .catch(error => {
        console.error('Error:', (error as Error).message);
        process.exit(1);
      });
  } catch (error) {
    console.error('Error:', (error as Error).message);
    process.exit(1);
  }
}
