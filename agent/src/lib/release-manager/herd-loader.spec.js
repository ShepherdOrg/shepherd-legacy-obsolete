const HerdLoader = require('./herd-loader');
const inject = require('../inject/inject');
const pad = require('../padleft');
const exec = require('../exec');
const fakeLogger = require('../test-tools/fake-logger');

describe('herd.yaml loading', function () {
    let loader;
    let modifiedState = false;
    let ReleasePlan, releasePlan;
    let loaderLogger;

    beforeEach(function () {
        process.env.www_icelandair_com_image = 'testimage123';
        process.env.SUB_DOMAIN_PREFIX = 'testing123';
        process.env.PREFIXED_TOP_DOMAIN_NAME = 'testing123';
        process.env.MICROSERVICES_POSTGRES_RDS_HOST = 'testing123';
        process.env.MICRO_SITES_DB_PASSWORD = 'testing123';
        process.env.INFRASTRUCTURE_IMPORTED_ENV = 'thatsme';
        process.env.WWW_ICELANDAIR_IP_WHITELIST = 'YnVsbHNoaXRsaXN0Cg==';
        delete process.env.TPL_DOCKER_IMAGE;

        delete process.env.EXPORT1;
        delete process.env.EXPORT2;

        ReleasePlan = function () {

            releasePlan = {
                addedDockerDeployers: {},
                addedK8sDeployments: {},
                addDeployment(deployment) {
                    return new Promise(function (resolve, reject) {
                        if (!deployment.type) {
                            let message = "Illegal deployment, no deployment type attribute in " + JSON.stringify(deployment);
                            reject(message);
                        }
                        if (!deployment.identifier) {
                            let message = "Illegal deployment, no identifier attribute in " + JSON.stringify(deployment);
                            reject(message);
                        }
                        if (deployment.type === 'k8s') {
                            releasePlan.addedK8sDeployments[deployment.identifier] = deployment;
                        } else if (deployment.type === 'deployer') {
                            releasePlan.addedDockerDeployers[deployment.identifier] = deployment;
                        }
                        resolve({fakeState: true});
                    });
                }
            };
            return releasePlan;
        };

        modifiedState = false;
        loaderLogger = fakeLogger();
        loader = HerdLoader(inject({
            logger: loaderLogger,
            ReleasePlan: ReleasePlan,
            exec:exec
        }));
    });

    it('should load herd.yaml', function (done) {
        loader.loadHerd(__dirname + '/testdata/happypath/herd.yaml').then(function (plan) {
            expect(plan).to.be.ok();
            done();
        }).catch(function (error) {
            done.fail(error);
        });
    });

    it('should log infrastructure execution', function (done) {
        loader.loadHerd(__dirname + '/testdata/happypath/herd.yaml').then(function (plan) {
            expect(plan).to.be.ok();
            expect(loaderLogger.infoLogEntries[0].data[0]).to.be('Running infrastructure test-infrastructure:0.0.1');
            done();
        }).catch(function (error) {
            done.fail(error);
        });
    });

    it('should fail if file does not exist', function (done) {
        loader.loadHerd(__dirname + '/testdata/does-not-exist.yaml').then(function (plan) {
            expect().fail('Should not finish!')
        }).catch(function (error) {
            expect(error).to.equal('/code/lib/release-manager/testdata/does-not-exist.yaml does not exist!');
            done();
        });

    });

    describe('directory execution plan', function () {

        let loadedPlan;

        beforeEach(function (done) {
            loader.loadHerd(__dirname + '/testdata/happypath/herd.yaml').then(function (plan) {
                loadedPlan = plan;
                done();
            }).catch(function (error) {
                done.fail(error);
            });

        });


        it('should add k8s deployment found in scanned directory', function () {
            // expect().fail('LOADED PLAN' + JSON.stringify(loadedPlan, null, 2))

            expect(loadedPlan.addedK8sDeployments['Namespace_monitors'].origin).to.be("/code/lib/release-manager/testdata/happypath/namespaces");
        });

        it('should have herd name', function () {
            // expect().fail('LOADED PLAN' + JSON.stringify(loadedPlan, null, 2))

            expect(loadedPlan.addedK8sDeployments['Namespace_monitors'].herdName).to.be("kube-config - /code/lib/release-manager/testdata/happypath/namespaces");
        });


    });

    describe('images execution plan', function () {

        let loadedPlan;

        beforeEach(function (done) {
            process.env.CLUSTER_POLICY_MAX_CPU_REQUEST = '25m';

            loader.loadHerd(__dirname + '/testdata/happypath/herd.yaml').then(function (plan) {
                loadedPlan = plan;
                done();
            }).catch(function (error) {
                done.fail(error);
            });
        });

        it('should base64decode and untar deployment files under file path', function () {
            expect(loadedPlan.addedK8sDeployments['Service_www-icelandair-com'].origin).to.be('testenvimage:0.0.0:kube.config.tar.base64');
        });

        it('should extract herdName from herd.yaml', function () {
            expect(loadedPlan.addedK8sDeployments['Service_www-icelandair-com'].herdName).to.be('test-image');
        });

        it('should modify deployment documents and file under deployments under k8s service identity', function () {
            expect(loadedPlan.addedK8sDeployments['Service_www-icelandair-com'].descriptor).not.to.contain('${EXPORT1}');
        });

        it('should apply k8s deployment-time cluster policy', function () {
            // expect(JSON.stringify(Object.keys(loadedPlan),undefined,2)).to.contain('25m');
            expect(loadedPlan.addedK8sDeployments['Deployment_www-icelandair-com'].descriptor).to.contain('25m');
        });

        it('should be serializable', function () {

            function detectRecursion(obj) {

                function detect(obj, seenObjects) {
                    if (obj && typeof obj === 'object') {
                        if (seenObjects.indexOf(obj) !== -1) {
                            return ['RECURSION!'];
                        }
                        seenObjects.push(obj);
                        for (let key in obj) {
                            if (obj.hasOwnProperty(key)) {
                                let detected = detect(obj[key], seenObjects);
                                if (detected.length) {
                                    detected.unshift(key);
                                    return detected;
                                }
                            }
                        }
                        seenObjects.pop();
                    }
                    return [];
                }

                return detect(obj, []);
            }

            const fs = require('fs');
            let serializable = detectRecursion(loadedPlan);
            expect(serializable.join('.')).to.be('');
            expect(serializable.length).to.be(0);
        });
    });

    describe('deployer execution plan', function () {

        let loadedPlan;

        beforeEach(function (done) {
            loader.loadHerd(__dirname + '/testdata/happypath/herd.yaml').then(function (plan) {
                loadedPlan = plan;
                done();
            }).catch(function (error) {
                done.fail(error);
            });
        });

        it('should load deployer plan by migration image reference', function () {

            console.debug('loadedPlan.addedDockerDeployers',loadedPlan.addedDockerDeployers['testenvimage-migrations:0.0.0']);
            expect(loadedPlan.addedDockerDeployers['testenvimage-migrations:0.0.0'].dockerParameters).to.contain('testenvimage-migrations:0.0.0');
            expect(Object.keys(loadedPlan.addedDockerDeployers)).to.contain('testenvimage-migrations:0.0.0');
        });
    });


    xdescribe('SLOW TEST: non-existing image', function () {

        let loadedPlan;
        let loadError;

        // beforeEach(function() {
        //     originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
        //     jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
        // });

        beforeEach(function (done) {
            loader.loadHerd(__dirname + '/testdata/nonexistingimage/herd.yaml').then(function (plan) {
                loadedPlan = plan;
                done();
            }).catch(function (error) {
                loadError = error;
                done();
            });
        });


        it('should fail with meaningful error message', function () {
            expect(loadError).to.contain('nonexistingimage:0.0.0');
        });

        xit('should not output stderr from docker calls unless end result is an error', function () {

        });

    })
});

