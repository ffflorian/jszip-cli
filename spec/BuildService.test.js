const {JSZipCLI} = require('../dist');

describe('BuildService', () => {
  let jsZipCLI;

  const addDefaultSpies = buildService => {
    spyOn(buildService, 'checkOutput').and.returnValue(Promise.resolve());
    spyOn(buildService, 'addFile').and.callThrough();
    spyOn(buildService.fileService, 'fileStat').and.returnValue(
      Promise.resolve({isDirectory: () => false, isFile: () => true})
    );
    spyOn(buildService.fileService, 'readFile').and.returnValue(Promise.resolve(Buffer.from([])));
    spyOn(buildService.fileService, 'writeFile').and.returnValue(Promise.resolve());
  }

  beforeEach(() => {
    jsZipCLI = new JSZipCLI({
      outputEntry: 'file.zip',
      quiet: true,
      verbose: false,
    });
  });

  it('adds specified files', async () => {
    const files = ['a.js', 'b.js'];
    const buildService = jsZipCLI.add(files);

    addDefaultSpies(buildService);

    const {compressedFilesCount} = await jsZipCLI.save();
    expect(compressedFilesCount).toBe(2);

    expect(buildService.addFile).toHaveBeenCalledWith(jasmine.objectContaining({zipPath: 'a.js'}));
    expect(buildService.addFile).toHaveBeenCalledWith(jasmine.objectContaining({zipPath: 'b.js'}));
    expect(buildService.fileService.writeFile).toHaveBeenCalledTimes(1);
  });

  it('ignores specified files', async () => {
    jsZipCLI = new JSZipCLI({
      outputEntry: 'file.zip',
      quiet: true,
      verbose: false,
      ignoreEntries: ['*.map']
    });
    const files = ['a.js', 'b.js', 'b.js.map'];
    const buildService = jsZipCLI.add(files);

    addDefaultSpies(buildService);

    const {compressedFilesCount} = await jsZipCLI.save();
    expect(compressedFilesCount).toBe(2);

    expect(buildService.addFile).toHaveBeenCalledWith(jasmine.objectContaining({zipPath: 'a.js'}));
    expect(buildService.addFile).toHaveBeenCalledWith(jasmine.objectContaining({zipPath: 'b.js'}));
    expect(buildService.addFile).not.toHaveBeenCalledWith(jasmine.objectContaining({zipPath: 'b.js.map'}));
    expect(buildService.fileService.writeFile).toHaveBeenCalledTimes(1);
  });
});
