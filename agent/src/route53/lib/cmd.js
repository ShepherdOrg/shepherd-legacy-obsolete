/**
 * Created by gulli on 23/03/17.
 */
"use strict";

const spawn = require('child_process').spawn;
const cmd = {
    exec(command, params, callback, errorHandler){
        console.debug(command + " " + params.join(" "));
        let output = "";
        let stderr = "";
        let spawnedProcess = spawn(command, params, {
            shell: false
        });
        spawnedProcess.stdout.setEncoding('utf8');
        spawnedProcess.stderr.setEncoding('utf8');
        spawnedProcess.stdout.on('data', (data) => {
            output += data;
        });

        spawnedProcess.stderr.on('data', (data) => {
            stderr += data;
        });

        spawnedProcess.on('close', (code) => {
            if (code) {
                if(errorHandler){
                    return errorHandler(stderr, code);
                } else{
                    console.log(command, params, " execution failed with exit code ", code);
                    console.log(output);
                    console.log(stderr);
                    process.exit(code);
                }
            } else {
                callback(output);
            }
        });
    }
};
module.exports=cmd;