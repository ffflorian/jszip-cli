const {JSZipCLI} = require('../dist');
const fs = require('fs');

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

    spyOn(jsZipCLI, 'checkEntry').and.returnValue(Promise.resolve());
    spyOn(jsZipCLI, 'writeFile').and.returnValue(Promise.resolve());

    await jsZipCLI.save();

    expect(jsZipCLI.checkEntry).toHaveBeenCalledWith(jasmine.objectContaining({zipPath: 'a.js'}));
    expect(jsZipCLI.checkEntry).toHaveBeenCalledWith(jasmine.objectContaining({zipPath: 'b.js'}));
    expect(jsZipCLI.writeFile).toHaveBeenCalledTimes(1);
  });
});
