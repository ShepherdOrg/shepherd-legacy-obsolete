#!/usr/bin/nodejs

"use strict";
const fs = require('fs')


let kubeServicesWithELB = JSON.parse(fs.readFileSync('./testdata/kube-services-with-elb.json'));
let kubeServicesNoELB = JSON.parse(fs.readFileSync('./testdata/kube-services-no-elb.json'));
let hostedZones =  JSON.parse(fs.readFileSync('./testdata/hostedzones.json'));
let oneManagedDNSRecords = JSON.parse(fs.readFileSync("./testdata/dns-recordsets-managed.json"));

function assertEqual(actual, expected, message) {
    if (actual !== expected) throw new Error(message + " expected " + expected + " does not match actual " + actual);
}



let elb_ae371b = JSON.parse(fs.readFileSync('./testdata/loadbalancers/ae371b07eb71911e6b8da06ac32a160f.json','utf-8'));
let elb_ae411 = JSON.parse(fs.readFileSync('./testdata/loadbalancers/ae411bef1b71911e6b8da06ac32a160f.json','utf-8'));
let elb_newweb = JSON.parse(fs.readFileSync('./testdata/loadbalancers/ae411bef1b71911e6b8da06ac3newweb.json','utf-8'));
let responseMap = {
    "kubectl get services -o json": [kubeServicesNoELB, kubeServicesWithELB, kubeServicesWithELB],
    "aws route53 list-hosted-zones --output json": [hostedZones, hostedZones],
    "aws elb describe-load-balancers --load-balancer-names ae371b07eb71911e6b8da06ac32a160f --output json": [elb_ae371b, elb_ae371b],
    "aws elb describe-load-balancers --load-balancer-names ae411bef1b71911e6b8da06ac32a160f --output json": [elb_ae411, elb_ae411],
    "aws elb describe-load-balancers --load-balancer-names ae411bef1b71911e6b8da06ac3newweb --output json": [elb_newweb, elb_newweb],
    "aws route53 list-resource-record-sets --hosted-zone-id /hostedzone/ZTMCDMUMZC1SF": [oneManagedDNSRecords,oneManagedDNSRecords],
    "aws route53 change-resource-record-sets --hosted-zone-id /hostedzone/ZTMCDMUMZC1SF --change-batch file:///tmp/dnsconfig.tmp.json": function (updateCmd) {

        let actualConfigJsonString = fs.readFileSync('/tmp/dnsconfig.tmp.json','utf-8');

        let actualConfig = JSON.parse(actualConfigJsonString);

        let expectedChanges = "./expected/route53changes.json";

        if(!fs.existsSync(expectedChanges)){
            console.log("Expected file should contain\n\n\n", actualConfigJsonString);

            throw new Error("Expected file to exist for comparison " + expectedChanges);
        }

        let expectedConfigJsonString = JSON.stringify(JSON.parse(fs.readFileSync(expectedChanges,'utf-8').trim()));

        assertEqual( actualConfigJsonString + "\n", expectedConfigJsonString + "\n", expectedChanges);

        return JSON.stringify({ChangeInfo: {Status: "PENDING"}})
    }
};


let cmd = {
    exec: function (command, params, callback) {
        let commandKey = command + " " + params.join(" ");
        if (responseMap[commandKey]) {
            if (typeof responseMap[commandKey] === "function") {
                callback(responseMap[commandKey](commandKey));
                return;
            } else if (responseMap[commandKey].length) {
                callback(JSON.stringify(responseMap[commandKey].shift()));
                return;
            }
        }
        throw new Error("Don't have any response to " + commandKey);
    }
};

let syncDone = false;
let Route53Sync = require('./lib/sync-kubernetes-services-with-dns-names');

let upsertSync = Route53Sync({
    cmd: cmd,
    timeout: 1,
    action: "UPSERT",
    env: "unittest",
    dryrun: false,
    debug:false,
    done: function (err, result) {
        syncDone = true;
        assertEqual(result.assumed.length, 1, "Assumed...");
        assertEqual(result.upserts.length, 5, "Upserts");
        assertEqual(result.deletes.length, 1, "Deletes");
        assertEqual(result.notmanaged.length, 0, "Not managed");
        assertEqual(result.conflicts.length, 1, "Conflicts");
        assertEqual(result.internal.length, 1, "Internal");
    }
});

upsertSync.syncDNSRecords("mycompany.is");

process.on('exit', function () {
    if(!syncDone){
        throw new Error("Sync was not completed in test!");
    }
});



// processQueryOutput(kubeServicesNoELB);


