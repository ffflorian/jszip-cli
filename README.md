# jszip-cli [![Build Status](https://api.travis-ci.org/ffflorian/jszip-cli.svg?branch=master)](https://travis-ci.org/ffflorian/jszip-cli/) [![Dependabot Status](https://api.dependabot.com/badges/status?host=github&repo=ffflorian/jszip-cli)](https://dependabot.com)

A zip CLI based on [jszip](https://www.npmjs.com/package/jszip).

## Installation

Run `yarn global add @ffflorian/jszip-cli` or `npm i -g @ffflorian/jszip-cli`.

## Usage

```
Usage: jszip-cli [options] [command]

A zip CLI based on jszip.

Options:

  -v, --version                      output the version number
  -o, --output <dir>                 set the output directory (default: stdout)
  -i, --ignore <entry>               ignore a file or directory
  -f, --force                        force overwriting files and directories (default: false)
  -d, --dereference                  dereference links (default: false)
  -l, --level <number>               set the compression level (default: 5)
  -V, --verbose                      enable verbose logging (default: false)
  -q, --quiet                        Don't log anything (default: false)
  -h, --help                         output usage information

Commands:

  add|a [options] <entries...>       add files and directories to a new ZIP archive
  extract|e [options] [archives...]  extract files and directories from ZIP archive(s)
```

## Examples

```
jszip-cli add --ignore *.map --output deploy.zip dist/ package.json

jszip-cli add --ignore *.map dist/ package.json > deploy.zip

jszip-cli extract --output deployment_files/ deploy.zip
```
