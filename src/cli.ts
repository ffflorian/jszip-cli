#!/usr/bin/env node

import {program as commander} from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';

import {JSZipCLI} from './JSZipCLI';
import {OptionValues} from 'commander';

const defaultPackageJsonPath = path.join(__dirname, 'package.json');
const packageJsonPath = fs.existsSync(defaultPackageJsonPath)
  ? defaultPackageJsonPath
  : path.join(__dirname, '../package.json');

const {description, name, version}: {description: string; name: string; version: string} =
  fs.readJSONSync(packageJsonPath);

commander
  .name(name.replace(/^@[^/]+\//, ''))
  .description(description)
  .option('--noconfig', "don't look for a configuration file")
  .option('-c, --config <path>', 'use a configuration file (default: .jsziprc.json)')
  .option('-o, --output <dir>', 'set the output directory (default: stdout)')
  .option('-i, --ignore <entry>', 'ignore a file or directory')
  .option('-f, --force', 'force overwriting files and directories when extracting (default: false)')
  .option('-d, --dereference', 'dereference (follow) links (default: false)')
  .option('-l, --level <number>', 'set the compression level', '5')
  .option('-V, --verbose', 'enable verbose logging (default: false)')
  .option('-q, --quiet', "don't log anything (default: false)")
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
  .option('-c, --config <path>', 'use a configuration file (default: .jsziprc.json)')
  .option('-o, --output <dir>', 'set the output directory (default: stdout)')
  .option('-i, --ignore <entry>', 'ignore a file or directory')
  .option('-f, --force', 'force overwriting files and directories when extracting (default: false)')
  .option('-d, --dereference', 'dereference (follow) symlinks (default: false)')
  .option('-l, --level <number>', 'set the compression level', '5')
  .option('-V, --verbose', 'enable verbose logging (default: false)')
  .option('-q, --quiet', "don't log anything excluding errors (default: false)")
  .arguments('[entries...]')
  .action((entries: string[], {parent}: OptionValues) => {
    try {
      new JSZipCLI({
        ...(parent.level && {compressionLevel: parent.level}),
        ...((parent.config && {configFile: parent.config}) || (parent.noconfig && {configFile: false})),
        ...(parent.dereference && {dereferenceLinks: parent.dereference}),
        ...(parent.force && {force: parent.force}),
        ...(parent.ignore && {ignoreEntries: [parent.ignore]}),
        ...(parent.output && {outputEntry: parent.output}),
        ...(parent.quiet && {quiet: parent.quiet}),
        ...(parent.verbose && {verbose: parent.verbose}),
      })
        .add(entries)
        .save()
        .then(({outputFile, compressedFilesCount}) => {
          if (parent.output && !parent.quiet) {
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
  .option('-c, --config <path>', 'use a configuration file (default: .jsziprc.json)')
  .option('-o, --output <dir>', 'set the output directory (default: stdout)')
  .option('-i, --ignore <entry>', 'ignore a file or directory')
  .option('-f, --force', 'force overwriting files and directories (default: false)')
  .option('-V, --verbose', 'enable verbose logging (default: false)')
  .option('-q, --quiet', "don't log anything excluding errors (default: false)")
  .arguments('<archives...>')
  .action((archives: string[], {parent}: OptionValues) => {
    try {
      new JSZipCLI({
        ...((parent.config && {configFile: parent.config}) || (parent.noconfig && {configFile: false})),
        ...(parent.force && {force: parent.force}),
        ...(parent.ignore && {ignoreEntries: [parent.ignore]}),
        ...(parent.output && {outputEntry: parent.output}),
        ...(parent.quiet && {quiet: parent.quiet}),
        ...(parent.verbose && {verbose: parent.verbose}),
      })
        .extract(archives)
        .then(({outputDir, extractedFilesCount}) => {
          if (parent.output && !parent.quiet) {
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
