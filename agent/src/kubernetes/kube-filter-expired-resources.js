#!/usr/bin/nodejs
'use strict';
const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

if(process.env.DEBUG_LOG){
    console.debug = console.log;
} else{
    console.debug = function () {};
}

let stdin ="";

rl.on('line', function(line){
    stdin += line + "\n";
});

rl.on('close', function(){
    let resourceQueryResult=JSON.parse(stdin);

    let items = resourceQueryResult.items;

    for(let item of items){
        if(item.metadata && item.metadata.labels && item.metadata.labels["ttl-hours"]){

            let timeToLive = Number.MAX_SAFE_INTEGER;
            try{
                timeToLive = parseInt(item.metadata.labels["ttl-hours"],10);
            }catch(e){
                timeToLive = Number.MAX_SAFE_INTEGER;
            }
            let creationTimestamp = new Date(item.metadata.creationTimestamp);
            let now = new Date();

            let ageInHours = (Math.abs(now - creationTimestamp) / 36e5 );

            if(ageInHours > timeToLive){
                console.log(item.kind.toLowerCase(), item.metadata.name);
            }


        }
    }
    process.exit(0);
});
