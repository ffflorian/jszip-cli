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
  .option('-f, --force', 'Force overwriting files', false);

program
  .command('add')
  .description('Add files to the ZIP archive.')
  .option('-l, --level <number>', 'Specify the compression level', 5)
  .option('-o, --output <dir>', 'Specify the output directory (default: stdout)')
  .option('-i, --ignore <entry>', 'Ignore a file or directory')
  .option('-f, --force', 'Force overwriting files', false)
  .arguments('<entries...>')
  .action((entries, options) => {
    new JSZipCLI({
      force: options.parent.force,
      ignoreEntries: options.parent.ignore ? [options.parent.ignore] : undefined,
      level: options.parent.level,
      outputEntry: options.parent.output,
    })
      .add(entries)
      .save()
      .then(() => {
        if (options.parent.output) {
          console.log('Done.');
        }
      })
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
  .option('-f, --force', 'Force overwriting files', false)
  .arguments('<archives...>')
  .action((files, options) => {
    new JSZipCLI({
      force: options.parent.force,
      ignoreEntries: options.parent.ignore ? [options.parent.ignore] : undefined,
      outputEntry: options.parent.output,
    })
      .extract(files)
      .then(() => {
        if (options.parent.output) {
          console.log('Done.');
        }
      })
      .catch(error => {
        console.error('Error:', error.message);
        process.exit(1);
      });
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.help();
}
