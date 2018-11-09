const expect = require('chai').expect
const execFile = require('child_process').execFile;

describe('yq command line', function() {

  const testYaml = 'lineOne:\n  lineTwo: {"prop":"somePropValue"}\n'
  it("should use jq to process query", (done) => {

    let child = execFile(__dirname + '/yq',['-r','.lineOne.lineTwo.prop'], (error, stdout, stderr)=>{
      expect(error).to.be.not.ok
      expect(stderr).to.be.not.ok
      expect(stdout.trim()).to.equal('somePropValue')
      done()
    });

    child.stdin.setEncoding = 'utf-8';
    child.stdin.write(testYaml + "\n");
    child.stdin.end();
  });
})