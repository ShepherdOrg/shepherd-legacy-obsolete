const untarBase64String = require('../../untar-string');
const identifyDocument = require('../../k8s-deployment-document-identifier');
const expandEnv = require('../../expandenv');
const applyClusterPolicies = require('../../apply-k8s-policy').applyPoliciesToDoc;
const JSYAML = require('js-yaml');
const yamlLoad = require('../../k8s-feature-deployment/multipart-yaml-load');
const modifyDeploymentDocument = require('../../k8s-feature-deployment/modify-deployment-document').modifyRawDocument;
const base64EnvSubst = require('../../base64-env-subst').processLine;
const options = require('../options');
const path = require('path');

module.exports = function (injected) {
    const kubeSupportedExtensions = injected('kubeSupportedExtensions');

    function calculateFileDeploymentPlan(deploymentFileContent, imageMetadata, fileName, featureDeploymentConfig) {
        return new Promise(function (resolve, reject) {
            let origin = imageMetadata.imageDefinition.image + ':' + imageMetadata.imageDefinition.imagetag + ':kube.config.tar.base64';

            let lines = deploymentFileContent.content.split('\n');
            try {
                if(options.testRunMode()){
                    process.env.TPL_DOCKER_IMAGE = 'fixed-for-testing-purposes'
                } else {
                    process.env.TPL_DOCKER_IMAGE = imageMetadata.imageDefinition.image + ':' + imageMetadata.imageDefinition.imagetag;
                }
                _.each(lines, function (line, idx) {
                    try {
                        lines[idx] = expandEnv(line);
                        lines[idx] = base64EnvSubst(lines[idx], {})
                    } catch (error) {
                        let message = 'In line ' + idx + '\n';
                        message += error;
                        throw new Error(message);
                        }
                });
                delete process.env.TPL_DOCKER_IMAGE;
            } catch (error) {
                let message = 'In file ' + fileName + '\n';
                message += error;
                reject(message);
                return;
            }
            let fileContents = lines.join('\n');
            if (featureDeploymentConfig.isFeatureDeployment) {
                fileContents = modifyDeploymentDocument(fileContents, {
                    ttlHours: imageMetadata.imageDefinition.timeToLiveHours,
                    newName: featureDeploymentConfig.newName,
                    nameReferenceChanges: featureDeploymentConfig.nameReferenceChanges
                });
                origin = featureDeploymentConfig.origin
            }

            let deploymentDescriptor = applyClusterPolicies(fileContents);

            let documentIdentifier = identifyDocument(deploymentDescriptor);

            let plan = {
                operation: imageMetadata.imageDefinition.delete ? "delete" : "apply",
                identifier: documentIdentifier,
                version: imageMetadata.imageDefinition.imagetag,
                descriptor: deploymentDescriptor,
                origin: origin,
                type: 'k8s',
                fileName: fileName,
                herdName:imageMetadata.imageDefinition.herdName
            };
            resolve(plan);

        });
    }

    function getKubeConfigTarLabel (imageMetadata) {
        return imageMetadata.dockerLabels['is.icelandairlabs.kube.config.tar.base64'] || imageMetadata.dockerLabels['shepherd.kube.config.tar.base64'];
    }

    function getDeployerLabel (imageMetadata) {
        return imageMetadata.dockerLabels['is.icelandairlabs.deployer'] ||  imageMetadata.dockerLabels['shepherd.deployer'];
    }

    function getDeployerCommandLabel (imageMetadata) {
        return imageMetadata.dockerLabels['is.icelandairlabs.deployer.command'];
    }

    function getEnvVariablesLabel (imageMetadata) {
        let newVar = imageMetadata.dockerLabels['is.icelandairlabs.environment.variables'] || imageMetadata.dockerLabels['is.icelandairlabs.deployer.environment'];
        return newVar;
    }

    function calculateImagePlan(imageMetadata) {
        return new Promise(function (resolve, reject) {
            let plan = {
                herdName:imageMetadata.imageDefinition.herdName
            };

            if (imageMetadata.dockerLabels) {
                if (getKubeConfigTarLabel(imageMetadata)) {
                    let deploymentFilesArchive = getKubeConfigTarLabel(imageMetadata);
                    untarBase64String(deploymentFilesArchive).then(function (files) {
                        plan.files = files;
                        plan.deployments = {};
                        let planPromises = [];
                        let nameReferenceChanges = {};
                        let featureDeploymentConfig = {
                            isFeatureDeployment:false
                        };

                        if(process.env.UPSTREAM_IMAGE_NAME === imageMetadata.imageDefinition.herdName && process.env.FEATURE_NAME ){
                            let cleanedName = process.env.FEATURE_NAME.replace(/\//g,'--').toLowerCase();
                            featureDeploymentConfig.isFeatureDeployment = true;
                            featureDeploymentConfig.ttlHours = process.env.FEATURE_TTL_HOURS;
                            featureDeploymentConfig.newName = cleanedName;
                            featureDeploymentConfig.origin = imageMetadata.imageDefinition.herdName + '::' + cleanedName
                        }

                        if (imageMetadata.imageDefinition.featureDeployment) {
                            featureDeploymentConfig.isFeatureDeployment = true;
                            featureDeploymentConfig.ttlHours = imageMetadata.imageDefinition.timeToLiveHours;
                            featureDeploymentConfig.newName = imageMetadata.imageDefinition.herdName;
                            featureDeploymentConfig.origin = imageMetadata.imageDefinition.herdName + '::feature';
                        }

                        if (featureDeploymentConfig.isFeatureDeployment){
                            _.forEach(plan.files, function (deploymentFileContent, fileName) {
                                if(!kubeSupportedExtensions[path.extname(fileName)]){
                                    // console.debug('Unsupported extension ', path.extname(fileName));
                                    return;
                                }

                                if(deploymentFileContent.content){
                                    let parsedMultiContent = yamlLoad(deploymentFileContent.content);
                                    _.forEach(parsedMultiContent, function(parsedContent){
                                        if(parsedContent){
                                            nameReferenceChanges[parsedContent.kind] = nameReferenceChanges[parsedContent.kind] || {};
                                            nameReferenceChanges[parsedContent.kind][parsedContent.metadata.name] =  parsedContent.metadata.name + '-' + featureDeploymentConfig.newName;
                                        } else {
                                            console.warn('Parsed content is NULL!!!', deploymentFileContent.content);
                                        }
                                    });
                                }
                            });
                            featureDeploymentConfig.nameReferenceChanges = nameReferenceChanges;
                        }

                        _.forEach(plan.files, function (deploymentFileContent, fileName) {
                            if(!kubeSupportedExtensions[path.extname(fileName)]){
                                // console.debug('Unsupported extension ', path.extname(fileName));
                                return;
                            }

                            try {
                                if (deploymentFileContent.content) {
                                    // let deployment = calculateFileDeploymentPlan();
                                    //
                                    // let addDeploymentPromise = releasePlan.addK8sDeployment(deployment);
                                    planPromises.push(calculateFileDeploymentPlan(deploymentFileContent, imageMetadata, fileName, featureDeploymentConfig));

                                }
                            } catch (e) {
                                let error = 'When processing ' + fileName + ':\n';
                                reject(error + e)
                            }
                        });
                        Promise.all(planPromises).then(function (allPlans) {
                            resolve(allPlans);
                        }).catch(function (err) {
                            let message = 'In ' + JSYAML.safeDump(imageMetadata.imageDefinition, 1);
                            message += err;
                            reject(message);
                        });


                    }).catch(function (err) {
                        reject('When processing tar.base64 of docker image ' + JSON.stringify(imageMetadata) + '\n' + err);
                    })

                } else if (getDeployerLabel(imageMetadata)) {
                    try {

                        let herdName = imageMetadata.imageDefinition.herdName;

                        let deployerPlan = {
                            dockerParameters: ['-i','--rm','-e', expandEnv("ENV=${ENV}")],
                            forTestParameters:undefined,
                            imageWithoutTag:undefined,
                            origin: herdName,
                            type: 'deployer',
                            operation: 'run',
                            command: 'deploy',
                            herdName: herdName
                        };

                        let envList = [];

                        if (getDeployerCommandLabel(imageMetadata)) {
                            deployerPlan.command = getDeployerCommandLabel(imageMetadata);
                        }
                        if (getEnvVariablesLabel(imageMetadata)) {
                            let envLabel = getEnvVariablesLabel(imageMetadata);
                            envLabel = expandEnv(envLabel);
                            envList = envList.concat(envLabel.split(','));
                        }

                        envList.forEach(function (env_item) {
                            deployerPlan.dockerParameters.push("-e");
                            deployerPlan.dockerParameters.push((env_item));
                        });

                        deployerPlan.forTestParameters = deployerPlan.dockerParameters.slice(0); // Clone array
                        let dockerImageWithVersion = imageMetadata.imageDefinition.dockerImage || (imageMetadata.imageDefinition.image + ':' + imageMetadata.imageDefinition.imagetag);
                        deployerPlan.imageWithoutTag = dockerImageWithVersion.replace(/:.*/g, "");

                        deployerPlan.dockerParameters.push(dockerImageWithVersion);
                        deployerPlan.forTestParameters.push(deployerPlan.imageWithoutTag + ':[image_version]');

                        if(deployerPlan.command){
                            deployerPlan.dockerParameters.push(deployerPlan.command);
                            deployerPlan.forTestParameters.push(deployerPlan.command);
                        }

                        deployerPlan.identifier = herdName;
                        resolve([deployerPlan]);


                    } catch (e) {
                        reject(e);
                    }
                } else {
                    reject("No plan in place to deal with " + JSON.stringify(imageMetadata))
                }
            } else {
                reject("No plan in place to deal with " + JSON.stringify(imageMetadata))
            }
        })
    }

    return calculateImagePlan;

};