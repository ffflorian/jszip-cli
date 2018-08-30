#!/usr/bin/env node

import * as program from 'commander';
import * as path from 'path';

import {JSZipCLI} from './';

const {name, version, description}: {name: string; version: string; description: string} = require('../package.json');

program.on('command:*', () => program.help());

program
  .name(name.replace(/^@[^/]+\//, ''))
  .version(version, '-v, --version')
  .description(description)
  .option('-o, --output <dir>', 'Specify the output directory', path.resolve('.', 'data.zip'))
  .option('-i, --ignore <entry>', 'Ignore a file or directory');

program
  .command('add')
  .description('Add files to the ZIP archive.')
  .arguments('<entries...>')
  .action((entries, options) => {
    new JSZipCLI({
      ignoreEntries: options.ignore ? [options.ignore] : undefined,
      outputFile: options.output,
    })
      .add(entries)
      .save()
      .then(() => console.log('Done.'))
      .catch(console.error);
  });

program
  .command('extract')
  .description('Extract files from a ZIP archive.')
  .action((entries, options) => {
    new JSZipCLI({
      ignoreEntries: options.ignore ? [options.ignore] : undefined,
      outputFile: options.output,
    })
      .add(entries)
      .save()
      .then(() => console.log('Done.'))
      .catch(console.error);
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.help();
}
