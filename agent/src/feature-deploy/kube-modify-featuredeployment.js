#!/usr/bin/nodejs
'use strict';
/*
 * Obsolete entry point
 * Add custom ttl-hours field to deployment descriptors that should be deleted after a given period of time
 * in the development/test clusters.
 * */

const fs = require('fs');

let deploymentfile = process.argv[2];
let newName = process.argv[3];
let ttlHours = process.argv[4];
let configMapName=process.argv[5];
let skipSubdomainPrefix=process.argv.indexOf("--skipSubdomainPrefix")>=0;

const modifyDeploymentDocument = require('../lib/k8s-feature-deployment/modify-deployment-document.js').modifyRawDocument;

newName = newName.toLowerCase().replace("/","--").replace("_","--");

if(!newName || !ttlHours){
    console.log("Invalid arguments: " + process.argv.join(' '));
    console.log("Usage: kube-modify-featuredeployment <kubedeploymentdocument> <new name> <timeToLive>");
    process.exit(-1, "Invalid arguments");
    return 255;
}


let filecontents = fs.readFileSync(deploymentfile, 'utf8');

let outfiles = modifyDeploymentDocument(filecontents, {
    newName,
    ttlHours,
    configMapName,
    skipSubdomainPrefix
});

let file = fs.openSync(deploymentfile, 'w+');
fs.writeSync(file, outfiles);
fs.closeSync(file);
