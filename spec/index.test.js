const {JSZipCLI} = require('../dist');

describe('JSZipCLI', () => {
  let jsZipCLI;

  beforeEach(() => {
    jsZipCLI = new JSZipCLI({
      outputFile: 'empty'
    });
  });

  it('adds specified files', async () => {
    const files = ['a.js', 'b.js'];

    jsZipCLI.add(files);

    spyOn(jsZipCLI, 'checkFile').and.returnValue(Promise.resolve());
    spyOn(jsZipCLI, 'writeFileStream').and.returnValue(Promise.resolve());

    await jsZipCLI.save();

    expect(jsZipCLI.checkFile).toHaveBeenCalledWith('a.js');
    expect(jsZipCLI.checkFile).toHaveBeenCalledWith('b.js');
  });
});
