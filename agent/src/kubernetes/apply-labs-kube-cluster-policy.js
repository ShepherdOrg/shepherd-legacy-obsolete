#!/usr/bin/nodejs
'use strict';

/*
 * Add custom ttl-hours field to deployment descriptors that should be deleted after a given period of time
 * in the development/test clusters.
 * */

const JSYAML = require('js-yaml');
const fs = require('fs');
const applyPolicies = require('../lib/apply-k8s-policy').applyPolicies;
const usingStdin = process.argv.indexOf('--stdin') > 0;

function applyPoliciesToDoc(rawDoc) {
    try {
        let parsedDoc = JSYAML.safeLoad(rawDoc);

        let modified = applyPolicies(parsedDoc);

        if(modified) {
            let yml = JSYAML.safeDump(parsedDoc, 1);
            console.log(yml.trim())
        }else{
            console.log(rawDoc.trim());
        }
        return modified;
    } catch (e) {
        console.error(rawDoc);
        console.error("There was an error applying cluster policy to stdin (see above): \n", e);
        process.exit(-1);
    }
}

let modified = false;

if (usingStdin) {
    let stdin = "";
    try {
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: false
        });
        // Cannot log to console, suppress info messages
        console.info = function () {

        };

        let yamlFoobarLines = [];
        rl.on('line', function (line) {
            if (line.toLowerCase().indexOf("'off'") >= 0) {
                yamlFoobarLines.push(line);
            }
            if (line.trim() === "---") {
                modified = modified || applyPoliciesToDoc(stdin);
                stdin = "";
                console.log("---");
            } else {
                stdin += line + "\n";
            }
        });

        rl.on('close', function () {

            applyPoliciesToDoc(stdin);
        });
    } catch (e) {
        console.error(stdin);
        console.error("There was an error applying cluster policy to stdin (see above): \n", e);
        process.exit(-1);
    }

} else {
    let deploymentfile = process.argv[2];
    console.debug("Processing deployment file " + deploymentfile);
    try {
        console.info = console.log;

        if (!deploymentfile || !fs.existsSync(deploymentfile)) {
            console.info("Invalid arguments: " + process.argv.join(' '));
            console.info("Usage: apply-labs-kube-cluster-policy.js <kubedeploymentdocument> | --stdin")
            process.exit(-1, "Invalid arguments");
            return 255;
        }
        let filecontents = fs.readFileSync(deploymentfile, 'utf8');

        let files = filecontents.split('\n---\n');

        let outfiles = "";
        for (let filec of files) {
            let parsedDoc = JSYAML.safeLoad(filec);
            modified = applyPolicies(parsedDoc);
            let yml = JSYAML.safeDump(parsedDoc);
            if (outfiles.length > 0) {
                outfiles += "\n---\n"
            }
            outfiles += yml.trim()
        }
        if(modified){
            let file = fs.openSync(deploymentfile, 'w+');
            fs.writeSync(file, outfiles);
            fs.closeSync(file);
        }
    }
    catch (e) {
        console.error("Error applying cluster policy to deployment file ", deploymentfile, "\n", e);
        process.exit(-1);
    }

}

