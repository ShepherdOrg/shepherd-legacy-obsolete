const Loader = require('.');
const FakeExec = require('../../test-tools/fake-exec.js');
const FakeLogger = require('../../test-tools/fake-logger');
const fs = require('fs');

describe('Docker infrastructure image plan loader', function () {

    let loader;
    let fakeExec;
    let fakeLogger;

    beforeEach(function () {
        fakeLogger = FakeLogger();
        fakeExec = FakeExec();
        loader = Loader(inject({
            exec:fakeExec,
            logger:fakeLogger
        }));
    });

    describe('loaded plan', function () {
        let plan;
        let envFile;

        beforeEach(function () {
            envFile=undefined;
            delete process.env.TESTEXPORT1;
            process.env.ENVVALUEONE='42';
            process.env.DRYRUN_MODE='true';
            fakeExec.onExec = function(command, params, options, err, success){

                let tmpDir = params[4].split(':')[0];
                let tmpFile = tmpDir + '/export.env';
                fs.writeFileSync(tmpFile,'TESTEXPORT1=testvalueone\n');

                envFile = fs.readFileSync(params[6], 'utf-8');

                success('Infrastructure run successful');

            };
            return loader({
                imageDefinition: {
                    herdName: 'megaFake',
                    image: 'fakeImageOne',
                    imagetag: '0.0.0'
                }
            }).then(function (loadedPlan) {
                plan = loadedPlan;
            });
        });

        afterEach(function () {
            delete process.env.DRYRUN_MODE;
        });

        it('should create docker run parameters', function () {
            let i = 0;
            expect(plan.dockerParameters[i++]).to.be('run');
            expect(plan.dockerParameters[i++]).to.be('-i');
            expect(plan.dockerParameters[i++]).to.be('--rm');
            expect(plan.dockerParameters[i++]).to.be('-v');
            expect(plan.dockerParameters[i++]).to.contain(':/exports');
            expect(plan.dockerParameters[i++]).to.be('--env-file');
            expect(plan.dockerParameters[i++]).to.contain('.env');
            expect(plan.dockerParameters[i++]).to.be('--network');
            expect(plan.dockerParameters[i++]).to.be('host');
            expect(plan.dockerParameters[i++]).to.be('fakeImageOne:0.0.0');
        });

        it('should create env file in tmp folder', function () {
            expect(envFile).to.contain('ENVVALUEONE=42');
        });

        it('should generate env mapping string', function () {
            expect(plan.envMap).to.contain('ENVVALUEONE');
        });

        it('should be run immediately', function () {
            expect(fakeExec.executedCommands.length).to.be(1)
        });

        it('should pass DRYRUN_MODE env variable on to infrastructure loader', function () {
            expect(plan.envMap).to.contain('DRYRUN_MODE');
        })

    });


});