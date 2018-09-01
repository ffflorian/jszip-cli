#!/usr/bin/env node

import * as program from 'commander';
import {JSZipCLI} from './';

const {name, version, description}: {name: string; version: string; description: string} = require('../package.json');

program.on('command:*', () => program.help());

program
  .name(name.replace(/^@[^/]+\//, ''))
  .version(version, '-v, --version')
  .description(description)
  .option('-l, --level <number>', 'Specify the compression level', 5)
  .option('-o, --output <dir>', 'Specify the output directory (default: stdout)')
  .option('-i, --ignore <entry>', 'Ignore a file or directory')
  .option('-f, --force', 'Force overwriting files', false)
  .option('-V, --verbose', 'Enable logging', false);

program
  .command('add')
  .description('Add files to the ZIP archive.')
  .option('-l, --level <number>', 'Specify the compression level', 5)
  .option('-o, --output <dir>', 'Specify the output directory (default: stdout)')
  .option('-i, --ignore <entry>', 'Ignore a file or directory')
  .option('-f, --force', 'Force overwriting files', false)
  .option('-V, --verbose', 'Enable logging', false)
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
  .description('Extract files from ZIP archive(s).')
  .option('-l, --level <number>', 'Specify the compression level', 5)
  .option('-o, --output <dir>', 'Specify the output directory (default: stdout)')
  .option('-i, --ignore <entry>', 'Ignore a file or directory')
  .option('-V, --verbose', 'Enable logging', false)
  .option('-f, --force', 'Force overwriting files', false)
  .option('-V, --verbose', 'Enable logging', false)
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

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.help();
}
