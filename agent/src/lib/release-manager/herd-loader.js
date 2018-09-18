const fs = require('fs');
const path = require('path');
const YAML = require('js-yaml');
const _ = require('lodash');
const kubeSupportedExtensions = require('./kubeSupportedExtensions');

const calculateImagePlan = require('./image-loader')(inject({
    kubeSupportedExtensions
}));

module.exports = function (injected) {

    const ReleasePlan = injected('ReleasePlan');

    const scanDir = require('./folder-loader')(inject({
        kubeSupportedExtensions: {
            '.yml': true,
            '.yaml': true,
            '.json': true
        }
    }));

    const logger = injected('logger');

    const cmd = injected('exec');

    const calculateInfrastructurePlan = require('./infrastructure-loader')(inject({
        logger,
        exec: cmd
    }));

    function calculateFoldersPlan (imagesPath, herdFolder) {
        return scanDir(path.resolve(imagesPath + '/' + herdFolder.path));
    }

    function loadImageMetadata (imageDef, retryCount) {
        return new Promise(function (resolve, reject) {
            let dockerImage = imageDef.dockerImage || imageDef.image + ':' + imageDef.imagetag;
            logger.debug('Extracting labels from image ' + dockerImage);
            cmd.exec('docker', [
                'inspect', dockerImage
            ], process.env, function (err) {
                logger.debug('docker inspect error:', err);
                if (err.indexOf('No such') >= 0) {
                    if (retryCount > 1) {
                        reject('ERROR:' + dockerImage + ': ' + err);
                    }
                    logger.debug('Going to pull ', JSON.stringify(imageDef));

                    cmd.exec('docker', ['pull', dockerImage], process.env, function (err) {
                            reject('Error pulling ' + dockerImage + '\n' + err);
                        },
                        function (/*stdout*/) {
                            logger.info(dockerImage + ' pulled, retrying inspect to load metadata');
                            loadImageMetadata(imageDef, 2).then(function (result) {
                                resolve(result);
                            }).catch(function (e) {
                                reject(e);
                            });
                        });
                } else {
                    reject('Error inspecting ' + dockerImage + ':\n' + err);
                }
            }, function (stdout) {
                try {

                    let dockerMetadata = JSON.parse(stdout);
                    let ContainerConfig = dockerMetadata[0].ContainerConfig;
                    let Labels = ContainerConfig.Labels;

                    let imageMetadata = {
                        imageDefinition: imageDef,
                        dockerLabels: Labels
                    };
                    if (Labels) {
                        logger.debug(dockerImage + ' has image metadata with the following Labels', Object.keys(Labels).join(', '));
                    }
                    resolve(imageMetadata);
                } catch (e) {
                    reject('Error processing metadata retrieved from docker inspect of image ' + dockerImage + ':\n' + e + '\nMetadata document:\n' + stdout);
                }
            });

        });
    }

    return {
        loadHerd (fileName) {
            return new Promise(function (resolve, reject) {
                try {

                    if (fs.existsSync(fileName)) {
                        let releasePlan = ReleasePlan();

                        let infrastructurePromises = [];
                        let allDeploymentPromises = [];
                        const imagesPath = path.dirname(fileName);

                        let herd = YAML.load(fs.readFileSync(fileName, 'utf8'));

                        let imageDependencies = {};

                        function addDependencies (imageMetaData) {
                            return new Promise(function (resolve, reject) {
                                let dependency;
                                if (imageMetaData.dockerLabels['is.icelandairlabs.dbmigration']) { // TODO PUBLISH - SUPPORT shepherd.dbmigration label here.
                                    logger.debug('add dependencies from ', imageMetaData.dockerLabels['is.icelandairlabs.dbmigration']);
                                    dependency = imageMetaData.dockerLabels['is.icelandairlabs.dbmigration'];
                                }
                                if (dependency) {
                                    imageDependencies[dependency] = {
                                        dockerImage: dependency
                                    };
                                }

                                resolve(imageMetaData);
                            });
                        }

                        let infrastructureLoader = function (infrastructure) {
                            return new Promise(function (resolve) {
                                resolve(_.map(infrastructure, function (herdDefinition, herdName) {
                                    herdDefinition.herdName = herdName;
                                    return loadImageMetadata(herdDefinition)
                                        .then(calculateInfrastructurePlan)
                                        .catch(function (e) {
                                            reject('When processing ' + herdName + ': ' + e + (e.stack ? e.stack : ''));
                                        });
                                }));

                            });

                        };

                        infrastructurePromises.push(infrastructureLoader(herd.infrastructure || {})
                            .then(function (addedPromises) {
                                return Promise.all(addedPromises).catch(reject);
                            }).catch(reject));

                        let loaders = {
                            folders: function (folders) {
                                return new Promise(function (resolve) {
                                    resolve(_.map(folders, function (herdFolder, herdFolderName) {
                                        herdFolder.herdName = herdFolderName;

                                        return calculateFoldersPlan(imagesPath, herdFolder).then(function (plans) {
                                            return Promise.each(plans, function (deploymentPlan) {
                                                deploymentPlan.herdName = `${herdFolder.herdName} - ${deploymentPlan.origin}`;
                                                return releasePlan.addDeployment(deploymentPlan);
                                            });
                                        }).catch(function (e) {
                                            reject('When processing folder ' + herdFolderName + '\n' + e + (e.stack ? e.stack : ''));
                                        });
                                    }));

                                });

                            },
                            images: function (images) {
                                return new Promise(function (resolve) {
                                    resolve(_.map(images, function (imgObj, imgName) {
                                        imgObj.herdName = imgName;
                                        logger.debug('Deployment image - loading image meta data for docker image', JSON.stringify(imgObj));

                                        return loadImageMetadata(imgObj)
                                            .then(addDependencies)
                                            .then(calculateImagePlan)
                                            .then(function (imagePlans) {
                                                return Promise.each(imagePlans, releasePlan.addDeployment);
                                            }).then(function (imgPlans) {
                                                return imgPlans;
                                            }).catch(function (e) {
                                                let errorMessage = 'When processing image ' + imgName + '\n' + JSON.stringify(e) + (e.stack ? e.stack : '');
                                                reject(errorMessage);
                                            });
                                    }));

                                });

                            }
                        };

                        let envMap = {};

                        // TODO: infrastructurePromises obsolete - remove this code.
                        Promise.each(infrastructurePromises, function (infrastructureResults) {

                            _.each(infrastructureResults, function (infrastructureResult) {
                                if (infrastructureResult.exportedEnv && infrastructureResult.exportedEnv.parsed) {
                                    _.extend(envMap, infrastructureResult.exportedEnv.parsed);

                                }
                            });

                            return envMap;

                        }).then(function (infrastructureResults) {

                            _.extend(process.env, envMap);

                            _.each(herd, function (herderDefinition, herderName) {
                                if (loaders[herderName]) {
                                    allDeploymentPromises.push(loaders[herderName](herderDefinition)
                                        .then(function (addedPromises) {
                                            return Promise.all(addedPromises).catch(function (e) {
                                                reject(e);
                                            });
                                        }).catch(reject));
                                }
                            });

                            Promise.all(allDeploymentPromises).then(function () {
                                return loaders.images(imageDependencies).then(function (planPromises) {
                                    return Promise.all(planPromises).catch(function (e) {
                                        reject(e);
                                    });
                                }).catch(function (e) {
                                    reject(e);
                                });
                            }).then(function () {
                                resolve(releasePlan);
                            }).catch(reject);

                        });

                    }
                    else {
                        reject(fileName + ' does not exist!');
                    }

                }
                catch
                    (e) {
                    reject(e);
                }
            });

        }
    };
};