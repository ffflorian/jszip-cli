#!/usr/bin/env node

import * as program from 'commander';
import * as path from 'path';

import {JSZipCLI} from './';

const {name, version, description}: {name: string; version: string; description: string} = require('../package.json');

program
  .name(name.replace(/^@[^/]+\//, ''))
  .version(version, '-v, --version')
  .description(description)
  .arguments('<entries...>')
  .option('-o, --output <dir>', 'Specify the output directory', path.resolve('.', 'data.zip'))
  .option('-i, --ignore <entry>', 'Ignore a file or directory')
  .action((entries, options) => {
    new JSZipCLI({
      entries,
      ignoreEntries: options.ignore,
      outputFile: options.output,
    })
      .save()
      .then(() => console.log('Done.'))
      .catch(console.error);
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.help();
}
