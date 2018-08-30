const {JSZipCLI} = require('../dist');

describe('JSZipCLI', () => {
  let jsZipCLI;

  it('adds specified files', async () => {
    const files = ['a.js', 'b.js'];

    jsZipCLI = new JSZipCLI({
      entries: files,
    });

    spyOn(jsZipCLI, 'checkFile').and.returnValue(Promise.resolve());

    await jsZipCLI.save();

    expect(jsZipCLI.checkFile).toHaveBeenCalledWith('a.js');
    expect(jsZipCLI.checkFile).toHaveBeenCalledWith('b.js');
  });
});
