#!/usr/bin/nodejs
'use strict';

/*
* Add custom ttl-hours field to deployment descriptors that should be deleted after a given period of time
* in the development/test clusters.
* */

const YAML = require('js-yaml');
const fs = require('fs');

let deploymentfile = process.argv[2];
let hours = process.argv[3];

let deploymentdoc = YAML.safeLoad(fs.readFileSync(deploymentfile, 'utf8') );

if(!deploymentdoc.metadata){
    deploymentdoc.metadata = {};
}
if(!deploymentdoc.metadata.labels){
    deploymentdoc.metadata.labels = {};
}
deploymentdoc.metadata.labels["ttl-hours"] = hours;

let yml = YAML.safeDump(deploymentdoc);
let file = fs.openSync(deploymentfile, 'w+');
fs.writeSync(file, yml);
fs.closeSync(file);
