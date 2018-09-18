#!/usr/bin/nodejs
'use strict';

const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});
const processLine = require('../lib/base64-env-subst').processLine;

const appendNewline = process.argv.indexOf('-n') >= 0;


rl.on('line', function(line){
  try{
    if (line !== null && line !== undefined) {
      console.log(processLine(line, {appendNewline}));
    }
  } catch(e){
      console.error(e);
      process.exit(-1);
  }
  console.log(""); // Add end of line
});
