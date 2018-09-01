const JSZip = require('jszip');
const {JSZipCLI} = require('../dist');


describe('JSZipCLI', () => {
  let jsZipCLI;

  beforeEach(() => {
    jsZipCLI = new JSZipCLI({
      outputEntry: 'empty',
    });
  });

  it('adds specified files', async () => {
    const files = ['a.js', 'b.js'];

    jsZipCLI.add(files);

    spyOn(jsZipCLI, 'checkOutput').and.returnValue(Promise.resolve());
    spyOn(jsZipCLI, 'checkEntry').and.returnValue(Promise.resolve());
    spyOn(jsZipCLI, 'writeFile').and.returnValue(Promise.resolve());

    await jsZipCLI.save();

    expect(jsZipCLI.checkEntry).toHaveBeenCalledWith(jasmine.objectContaining({zipPath: 'a.js'}), jasmine.any(JSZip));
    expect(jsZipCLI.checkEntry).toHaveBeenCalledWith(jasmine.objectContaining({zipPath: 'b.js'}), jasmine.any(JSZip));
    expect(jsZipCLI.writeFile).toHaveBeenCalledTimes(1);
  });
});
