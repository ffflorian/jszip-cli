const fs = require('fs');
const {JSZipCLI} = require('../dist');

describe('BuildService', () => {
  let jsZipCLI;

  beforeEach(() => {
    jsZipCLI = new JSZipCLI({
      outputEntry: 'file.zip',
      quiet: true,
      verbose: true,
    });
  });

  it('adds specified files', async () => {
    const files = ['a.js', 'b.js'];
    const buildService = jsZipCLI.add(files);

    spyOn(buildService, 'checkOutput').and.returnValue(Promise.resolve());
    spyOn(buildService, 'checkEntry').and.callThrough();
    spyOn(buildService.fileService, 'fileStat').and.returnValue(
      Promise.resolve({isDirectory: () => false, isFile: () => true})
    );
    spyOn(buildService.fileService, 'readFile').and.returnValue(Promise.resolve(Buffer.from([])));
    spyOn(buildService.fileService, 'writeFile').and.returnValue(Promise.resolve());

    const {compressedFilesCount} = await jsZipCLI.save();
    expect(compressedFilesCount).toBe(2);

    expect(buildService.checkEntry).toHaveBeenCalledWith(jasmine.objectContaining({zipPath: 'a.js'}));
    expect(buildService.checkEntry).toHaveBeenCalledWith(jasmine.objectContaining({zipPath: 'b.js'}));
    expect(buildService.fileService.writeFile).toHaveBeenCalledTimes(1);
  });
});
