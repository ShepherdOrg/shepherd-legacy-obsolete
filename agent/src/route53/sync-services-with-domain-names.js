#!/usr/bin/nodejs
"use strict";

let targetTopDomain = process.env.TOP_DOMAIN_NAME;
let env = process.env.ENV;

if(!targetTopDomain){
    throw "TOP_DOMAIN_NAME environment variable has to be set"
}

if(!env){
    throw "ENV environment variable has to be set"
}

let debug = process.argv.indexOf('--debug') > 0;
let dryrun = process.argv.indexOf('--dryrun') > 0;

if(dryrun){
    console.log("Running in dryrun mode. Changes will be calculated but not applied.");
}

let cmd = require('./lib/cmd');
let sync = require('./lib/sync-kubernetes-services-with-dns-names')({
    cmd:cmd,
    timeout:10000,
    env:env,
    dryrun:dryrun,
    debug:debug,
    done:function (err, result) {
        if(result.conflicts.length > 0 ){
            console.log("Conflicts - DNS records in the way:\n", JSON.stringify(result.conflicts, null, 2));
        }

        console.log("Unchanged count: ", result.notchanged.length);
        console.debug("Unchanged: ", result.notchanged.join(" "));
        console.log("Upserts count: ", result.upserts.length);
        console.log("Delete count: ", result.deletes.length);
        console.log("Assumed control count: ", result.assumed.length);
        console.log("Not managed count: ", result.notmanaged.length);
        console.log("Conflicts count: ", result.conflicts.length);

        if(err){
            console.log("ERROR WHILE SYNCING ROUTE53 DNS RECORDS FOR KUBE CLUSTER! ", err);
            process.exit(-1);
        }
    }

});

sync.syncDNSRecords(targetTopDomain);
