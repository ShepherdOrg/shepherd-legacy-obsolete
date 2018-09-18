const script = require('../lib/test-tools/script-test');
const fs = require('fs');

describe('generate docker environment', function () {

    beforeEach(function () {
        if (!fs.existsSync("/tmp/.build")) {
            fs.mkdirSync("/tmp/.build");
        }
        if (!fs.existsSync("/tmp/.build/actual")) {
            fs.mkdirSync("/tmp/.build/actual");
        }
    });

    it('should generate env list for docker executed', function (done) {
        script.execute('generate-docker-env.sh', ['/tmp/.build/actual/_docker.env'],
            {
                env: {
                    NOT_THERE: 'false',
                    PATH: 'some path',
                    ENV:'testrun'
                },
                debug: false
            }).output('/tmp/.build/actual/_docker.env').shouldEqual('./lib/expected/_docker.env').done(done);
    });
});
