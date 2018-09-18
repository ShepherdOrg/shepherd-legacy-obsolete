const script = require('../lib/test-tools/script-test');
const fs = require('fs');
const _ = require('lodash');

describe('route53 sync', function () {

    beforeEach(function () {
        jasmine.DEFAULT_TIMEOUT_INTERVAL = 1500;
        if (!fs.existsSync("./.build")) {
            fs.mkdirSync("./.build");
            if (!fs.existsSync("./.build/actual")) {
                fs.mkdirSync("./.build/actual");
            }
        }
    });

    fit('should generate expected sync from setup', function (done) {
        script.execute('./test-sync-kubernetes-services-with-dns-names.js',
            [],
            {
                env: _.extend(process.env),
                cwd: __dirname,
                debug: false
            },
            true)
            .done(function (stdout) {
                done();
            });
    });
});