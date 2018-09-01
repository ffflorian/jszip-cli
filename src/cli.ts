#!/usr/bin/env node

import * as program from 'commander';
import {JSZipCLI} from './';

const {name, version, description}: {name: string; version: string; description: string} = require('../package.json');

program
  .name(name.replace(/^@[^/]+\//, ''))
  .version(version, '-v, --version')
  .description(description)
  .option('-o, --output <dir>', 'set the output directory (default: stdout)')
  .option('-i, --ignore <entry>', 'ignore a file or directory')
  .option('-f, --force', 'force overwriting files (default: false)')
  .option('-l, --level <number>', 'set the compression level', 5)
  .option('-V, --verbose', 'enable logging (default: false)')
  .on('command:*', args => {
    console.error(`\n  error: invalid command \`${args[0]}'\n`)
    process.exit(1);
  });

program
  .command('add')
  .alias('a')
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
  .alias('e')
  .description('extract files from ZIP archive(s)')
  .option('-o, --output <dir>', 'set the output directory (default: stdout)')
  .option('-i, --ignore <entry>', 'ignore a file or directory')
  .option('-f, --force', 'force overwriting files (default: false)')
  .option('-l, --level <number>', 'set the compression level', 5)
  .option('-V, --verbose', 'enable logging (default: false)')
  .arguments('[archives...]')
  .action((archives: string[], {parent}: program.Command) => {
    new JSZipCLI({
      ...(parent.force && {force: parent.force}),
      ...(parent.ignore && {ignoreEntries: [parent.ignore]}),
      ...(parent.output && {outputEntry: parent.output}),
      ...(parent.verbose && {verbose: parent.verbose}),
    })
      .extract(archives)
      .then(() => parent.output && console.log('Done.'))
      .catch(error => {
        console.error('Error:', error.message);
        process.exit(1);
      });
  });

program.parse(process.argv);

if (!program.args.length) {
  program.help();
}
