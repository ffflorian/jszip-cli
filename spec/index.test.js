const JSZip = require('jszip');
const {JSZipCLI} = require('../dist');

describe('BuildService', () => {
  let jsZipCLI;

  beforeEach(() => {
    jsZipCLI = new JSZipCLI({
      outputEntry: 'file.zip',
    });
  });

  it('adds specified files', async () => {
    const files = ['a.js', 'b.js'];
    const buildService = jsZipCLI.add(files);

    spyOn(buildService, 'checkOutput').and.returnValue(Promise.resolve());
    spyOn(buildService, 'checkEntry').and.returnValue(Promise.resolve());
    spyOn(buildService.fileService, 'writeFile').and.returnValue(Promise.resolve());

    await jsZipCLI.save();

    expect(buildService.checkEntry).toHaveBeenCalledWith(jasmine.objectContaining({zipPath: 'a.js'}));
    expect(buildService.checkEntry).toHaveBeenCalledWith(jasmine.objectContaining({zipPath: 'b.js'}));
    expect(buildService.fileService.writeFile).toHaveBeenCalledTimes(1);
  });
});
