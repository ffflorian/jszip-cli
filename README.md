# jszip-cli [![Build Status](https://api.travis-ci.org/ffflorian/jszip-cli.svg?branch=master)](https://travis-ci.org/ffflorian/jszip-cli/) [![Dependabot Status](https://api.dependabot.com/badges/status?host=github&repo=ffflorian/jszip-cli)](https://dependabot.com)

A zip CLI based on [jszip](https://www.npmjs.com/package/jszip).

## Installation

Run `yarn global add @ffflorian/jszip-cli` or `npm i -g @ffflorian/jszip-cli`.

## Usage

```
Usage: jszip-cli [options] [command]

A zip CLI based on jszip.

Options:

  -v, --version                    output the version number
  -l, --level <number>             Specify the compression level (default: 5)
  -o, --output <dir>               Specify the output directory (default: stdout)
  -i, --ignore <entry>             Ignore a file or directory
  -f, --force                      Force overwriting files
  -h, --help                       output usage information

Commands:

  add [options] <entries...>       Add files to the ZIP archive.
  extract [options] <archives...>  Extract files from ZIP archive(s).
```

## Examples

```
jszip-cli add dist package.json -i *.map -o deploy.zip
jszip-cli extract deploy.zip -o my_deployment/
```
