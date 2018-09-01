#!/usr/bin/env node

import * as program from 'commander';
import {JSZipCLI} from './';

const {name, version, description}: {name: string; version: string; description: string} = require('../package.json');

program.on('command:*', () => program.help());

program
  .name(name.replace(/^@[^/]+\//, ''))
  .version(version, '-v, --version')
  .description(description)
  .option('-o, --output <dir>', 'set the output directory (default: stdout)')
  .option('-i, --ignore <entry>', 'ignore a file or directory')
  .option('-f, --force', 'force overwriting files (default: false)')
  .option('-l, --level <number>', 'set the compression level', 5)
  .option('-V, --verbose', 'enable logging (default: false)');

program
  .command('add')
  .description('add files to a new ZIP archive')
  .option('-o, --output <dir>', 'set the output directory (default: stdout)')
  .option('-i, --ignore <entry>', 'ignore a file or directory')
  .option('-f, --force', 'force overwriting files (default: false)')
  .option('-l, --level <number>', 'set the compression level', 5)
  .option('-V, --verbose', 'enable logging (default: false)')
  .arguments('<entries...>')
  .action((entries: string[], {parent}: program.Command) => {
    new JSZipCLI({
      ...(parent.force && {force: parent.force}),
      ...(parent.ignore && {ignoreEntries: [parent.ignore]}),
      ...(parent.level && {compressionLevel: parent.level}),
      ...(parent.output && {outputEntry: parent.output}),
      ...(parent.verbose && {verbose: parent.verbose}),
    })
      .add(entries)
      .save()
      .then(() => parent.output && console.log('Done.'))
      .catch(error => {
        console.error('Error:', error.message);
        process.exit(1);
      });
  });

program
  .command('extract')
  .description('extract files from ZIP archive(s)')
  .option('-o, --output <dir>', 'set the output directory (default: stdout)')
  .option('-i, --ignore <entry>', 'ignore a file or directory')
  .option('-f, --force', 'force overwriting files (default: false)')
  .option('-l, --level <number>', 'set the compression level', 5)
  .option('-V, --verbose', 'enable logging (default: false)')
  .arguments('<archives...>')
  .action((files: string[], {parent}: program.Command) => {
    new JSZipCLI({
      ...(parent.force && {force: parent.force}),
      ...(parent.ignore && {ignoreEntries: [parent.ignore]}),
      ...(parent.output && {outputEntry: parent.output}),
      ...(parent.verbose && {verbose: parent.verbose}),
    })
      .extract(files)
      .then(() => parent.output && console.log('Done.'))
      .catch(error => {
        console.error('Error:', error.message);
        process.exit(1);
      });
  });

program
  .command('help')
  .description('output usage information')
  .action(() => program.help());

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.help();
}
