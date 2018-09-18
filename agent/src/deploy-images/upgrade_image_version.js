#!/usr/bin/nodejs
'use strict';

const YAML = require('js-yaml');
const fs = require('fs');


let imagefile = process.argv[2];

let upstreamImageName = process.env.UPSTREAM_IMAGE_NAME;
let upstreamImageTag = process.env.UPSTREAM_IMAGE_TAG;

if(!upstreamImageName) throw new Error('UPSTREAM_IMAGE_NAME env variable must have a value');
if(!upstreamImageTag) throw new Error('UPSTREAM_IMAGE_TAG env variable must have a value');

console.log('Upgrading ' + upstreamImageName + ' to ' + upstreamImageTag + ' in ' + imagefile);

function processImageFile(fileName){
    let images = YAML.safeLoad(fs.readFileSync(fileName, 'utf8') );
    let imglist = images.images;

    let targetImage = imglist[upstreamImageName];
    if(targetImage){
        if(targetImage.imagetag !== upstreamImageTag){
            console.log(fileName + ": Upgrading",upstreamImageName, "version", targetImage.imagetag, "to", upstreamImageTag);
            targetImage.imagetag = upstreamImageTag;

            let yml = YAML.safeDump(images);
            let file = fs.openSync(fileName, 'w+');
            fs.writeSync(file, yml);
            fs.closeSync(file);
        } else {
            console.log(fileName, upstreamImageName + ": upstream image tag unchanged, no changes made:", upstreamImageTag);
        }
    }
}

if(fs.existsSync(imagefile)){
    processImageFile(imagefile);
} else{
    console.error(imagefile + ' does not exist!')
}
