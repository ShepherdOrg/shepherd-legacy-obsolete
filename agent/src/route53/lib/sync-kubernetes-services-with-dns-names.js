#!/usr/bin/nodejs
"use strict";

const fs = require('fs');

if(process.env.DEBUG_LOG){
    console.debug = console.log;
} else{
    console.debug = function () {};
}

const FIVE_MINUTES = 5*60*1000;


module.exports = function (options) {
    const cmd = options.cmd || require("./cmd");
    const timeout = options.timeout || 10000;
    const dryrun = options.dryrun || false;

    if (options.debug) {
        console.debug = console.log
    }
    const env = options.env;
    if (!env) {
        throw new Error("Must provide env in options");
    }
    const toolchainManagedValue = '"' + env + '_toolchain_managed"';
    const done = options.done || function () {
        console.debug("Calling empty callback");
        };

    let knownHostedZoneIds = {};

    function changeComment(changeRecord, newComment) {
        changeRecord.Comment = newComment;
        return changeRecord;
    }

    function createUpsertChange(dnsRecordClone, comment) {
        return {
            "Comment": comment,
            "Changes": [
                {
                    "Action": "UPSERT",
                    "ResourceRecordSet": dnsRecordClone
                }
            ]
        };
    }

    function createDeleteChange(dnsRecord) {
        if (dnsRecord.Type === "TXT" && dnsRecord.ResourceRecords.length > 1) {
            let dnsRecordClone = JSON.parse(JSON.stringify(dnsRecord));
            for (let i = 0; i < dnsRecordClone.ResourceRecords.length; i++) {
                if (dnsRecordClone.ResourceRecords[i].Value === toolchainManagedValue) {
                    dnsRecordClone.ResourceRecords.splice(i, 1);
                }
            }
            return createUpsertChange(dnsRecordClone, "Kubernetes service gone - remove toolchain marker value.")
        }
        return {
            "Comment": "Kubernetes service gone - DELETE DNS record.",
            "Changes": [
                {
                    "Action": "DELETE",
                    "ResourceRecordSet": dnsRecord
                }
            ]
        }
    }

    function createDnsTxtRecordConfig(serviceDnsName) {

        return {
            "Comment": "Kubernetes ELB DNS TXT record - " + "UPSERT",
            "Changes": [
                {
                    "Action": "UPSERT",
                    "ResourceRecordSet": {
                        "Name": serviceDnsName,
                        "Type": "TXT",
                        "TTL": 60,
                        "ResourceRecords": [
                            {
                                "Value": toolchainManagedValue
                            }
                        ]
                    }
                }
            ]
        }
    }

    function createDnsARecordConfig(serviceDnsName, ElbHostedZoneId, ElbHostName) {

        return {
            "Comment": "Kubernetes ELB DNS A record - " + "UPSERT",
            "Changes": [
                {
                    "Action": "UPSERT",
                    "ResourceRecordSet": {
                        "Name": serviceDnsName,
                        "Type": "A",
                        "AliasTarget": {
                            "HostedZoneId": ElbHostedZoneId,
                            "EvaluateTargetHealth": false,
                            "DNSName": "dualstack." + ElbHostName
                        }
                    }
                }
            ]
        }
    }

    function queryKubernetesServices(callback) {
        function doQuery(callback) {
            cmd.exec("kubectl", ["get", "services", "-o", "json"], function (stdout) {
                console.debug("kubernetes services \n", stdout);
                let queryResult = JSON.parse(stdout);
                callback(queryResult);
            });
        }
        let accumulatedTime=0;

        function queryUntilAllServicesHaveELBs() {
            doQuery(function (kubeServices) {
                if (kubeServices.items && kubeServices.items.length > 0) {
                    // Only continue to perform route-53 sync when all ELBs are available.
                    let allElbsAvailable = true;
                    let elbServices = [];

                    for (let serviceInfo of kubeServices.items) {
                        let serviceName = serviceInfo.metadata.name;
                        if (serviceInfo.metadata.labels && (serviceInfo.metadata.labels["subdomain"] || serviceInfo.metadata.labels["topdomain"])) {

                            if (serviceInfo.spec.type === "LoadBalancer") {
                                let elbHostName = serviceInfo.status
                                    && serviceInfo.status.loadBalancer
                                    && serviceInfo.status.loadBalancer.ingress
                                    && serviceInfo.status.loadBalancer.ingress.length
                                    && serviceInfo.status.loadBalancer.ingress[0].hostname;
                                if (elbHostName) {
                                    let elbName = elbHostName.split("-")[0];
                                    console.debug("Service " + serviceName + " using ELB ", elbName);
                                } else {
                                    allElbsAvailable = false;
                                    console.log("No ELB (yet) available for kubernetes service " + serviceName)
                                }
                            } else {
                                console.debug("Service " + serviceName + " is not of type LoadBalancer");
                            }
                            elbServices.push(serviceInfo);
                        }
                    }

                    if (allElbsAvailable) {
                        callback(elbServices);
                    } else {
                        accumulatedTime+=timeout;
                        if(accumulatedTime < FIVE_MINUTES){
                            console.log("ELBs for one or more services not allocated yet, waiting " + timeout + " ms before checking again.");
                            setTimeout(function () {
                                queryUntilAllServicesHaveELBs();
                            }, timeout);
                        } else {
                            console.error("Timed out waiting for all ELBs to be created, after " + FIVE_MINUTES + "ms ");
                            process.exit(-1);
                        }
                    }
                }
            })
        }

        queryUntilAllServicesHaveELBs();
    }

    function updateRoute53(hostedZoneId, route53Changes, done) {


        fs.writeFileSync('/tmp/dnsconfig.tmp.json', JSON.stringify(route53Changes));

        if (dryrun) {
            console.log("DRYRUN - would apply following changes in HostedZoneId " + hostedZoneId + "\n", JSON.stringify(route53Changes, null, 2));
            done(null, "DRYRUN");
        } else {
            cmd.exec("aws", ["route53", "change-resource-record-sets", "--hosted-zone-id", hostedZoneId, "--change-batch", "file:///tmp/dnsconfig.tmp.json"], function (stdout) {
                console.log("Applied route53 DNS change in hostedZoneId " + hostedZoneId + "\n", JSON.stringify(route53Changes,undefined, 2));
                console.debug("route53 change-resource-record-sets:\n", stdout);
                let changeInfo = JSON.parse(stdout);
                if (changeInfo.ChangeInfo && changeInfo.ChangeInfo.Status === "PENDING") {
                    done(null, changeInfo);
                } else {
                    done("Unexpected response to ", "UPSERT", ": ", stdout);
                }
            })
        }
    }

    function lookupELBHostedZoneId(elbName, callback) {
        cmd.exec("aws", ["elb", "describe-load-balancers", "--load-balancer-names", elbName, "--output", "json"], function (stdout) {
            console.debug("aws command result:", stdout);
            console.debug("describe-load-balancers " + elbName + " :\n", stdout);

            let elbDescription = JSON.parse(stdout);
            if (elbDescription.LoadBalancerDescriptions && elbDescription.LoadBalancerDescriptions.length > 0) {
                if (elbDescription.LoadBalancerDescriptions.length > 1) {
                    console.log("More than one LoadBalancerDescriptions returned! ", elbDescription.LoadBalancerDescriptions);
                }
                let elbHostedZoneId = elbDescription.LoadBalancerDescriptions[0].CanonicalHostedZoneNameID;

                console.debug("elbHostedZoneId", elbHostedZoneId);
                callback(null, elbHostedZoneId);

            } else {
                callback("Load balancer description for " + elbName + " not found!");
            }
        }, function(stderr, exitcode){
            callback("Load balancer description for " + elbName + " not found!");
        });
    }

    function areSameARecord(existingARecord, desiredARecord) {
        return existingARecord.AliasTarget.HostedZoneId === desiredARecord.AliasTarget.HostedZoneId &&
            existingARecord.AliasTarget.DNSName === desiredARecord.AliasTarget.DNSName &&
            existingARecord.AliasTarget.EvaluateTargetHealth === desiredARecord.AliasTarget.EvaluateTargetHealth;
    }

    function processKubeServices(hostedZoneId, kubeServices, targetTopDomain, dnsRecords) {
        let nonConflictingRecordTypes = {
            "MX": "MX",
            "NS": "NS",
            "SOA": "SOA",
            "TXT": "TXT"
        };

        let existingRecordsByTypeAndName = {};
        let existingUnsafeRecordsByName = {};
        for (let rec of dnsRecords.ResourceRecordSets) {
            if (!rec.Type || !rec.Name) {
                console.log("DNS record without type or name!", rec);
                continue;
            }
            if (!existingRecordsByTypeAndName[rec.Type]) {
                existingRecordsByTypeAndName[rec.Type] = {};
            }
            existingRecordsByTypeAndName[rec.Type][rec.Name] = rec;

            if (!nonConflictingRecordTypes[rec.Type]) {
                existingUnsafeRecordsByName[rec.Name] = rec;
            }
        }

        let desiredRecords = {};

        let responseCount = 0;

        let ignoredELBs = [];

        for (let serviceInfo of kubeServices) {
            let subdomain = serviceInfo.metadata.labels && serviceInfo.metadata.labels.subdomain;
            let topdomain = serviceInfo.metadata.labels && serviceInfo.metadata.labels.topdomain;
            let fullServiceDNSName = subdomain + "." + targetTopDomain;

            let elbHostName = serviceInfo.status
                && serviceInfo.status.loadBalancer
                && serviceInfo.status.loadBalancer.ingress
                && serviceInfo.status.loadBalancer.ingress.length
                && serviceInfo.status.loadBalancer.ingress[0].hostname;
            if (!elbHostName) {
                throw new Error("Invalid service info, no ELB information: " + JSON.stringify(serviceInfo));
            }
            let elbName = elbHostName.split("-")[0];


            if(elbName==="internal"){
                console.debug(elbHostName + " is an internal load balancer, ignoring.");
                ignoredELBs.push(elbHostName);
                responseCount++;
            } else {
                console.debug(`Looking up ELBHostedZoneId for <${elbName}>`);
                lookupELBHostedZoneId(elbName, function (err, elbHostedZoneId) {
                    function addDNSRecordPair(dnsRecordName, elbHostedZoneId, elbHostName) {
                        desiredRecords["A"][dnsRecordName] = createDnsARecordConfig(dnsRecordName, elbHostedZoneId, elbHostName + ".");
                        desiredRecords["TXT"][dnsRecordName] = createDnsTxtRecordConfig(dnsRecordName);
                    }
                    responseCount++;

                    if (err) {
                        console.log(err);
                        console.log(`Unable to manage DNS records for ${elbHostName}, names: ( ${subdomain} and/or ${topdomain} ) ` );
                        ignoredELBs.push(elbHostName);
                    } else {
                        let dnsRecordName = fullServiceDNSName + ".";

                        desiredRecords["A"] = desiredRecords["A"] || {};
                        desiredRecords["TXT"] = desiredRecords["TXT"] || {};
                        addDNSRecordPair(dnsRecordName, elbHostedZoneId, elbHostName);
                        if (topdomain) {
                            addDNSRecordPair(topdomain + ".", elbHostedZoneId, elbHostName);
                        }
                    }

                    function haveResponseToAllRequests() {
                        return responseCount === kubeServices.length;
                    }

                    function applyRoute53Changes(changes, done) {

                        let route53Actions = {
                            "Comment": "toolchain - sync service deployments with route53.",
                            "Changes": []
                        };
                        for (let actionRecord of changes) {
                            route53Actions.Changes = route53Actions.Changes.concat(actionRecord.Changes);
                        }
                        if(route53Actions.Changes.length > 0 ){
                            updateRoute53(hostedZoneId, route53Actions, function (err, result) {
//                                console.log(route53Actions, "Route53 changes requested", result);
                                done();
                            });
                        } else {
                            console.log(route53Actions, "No Route53 changes at this time");
                            done();
                        }
                    }

                    function hasManagedMarkerValue(resourceRecords) {
                        for (let rr of resourceRecords) {
                            if (rr.Value === toolchainManagedValue) {
                                return true;
                            }
                        }
                        return false;
                        return false;
                    }

                    if (haveResponseToAllRequests()) {
                        let upserts = [];
                        let notmanaged = [];
                        let conflicts = [];
                        let assumed = [];
                        let notchanged = [];

                        for (let potentialTxtUpsertName in desiredRecords["TXT"]) {
                            console.debug("potentialTxtUpsert", potentialTxtUpsertName);
                            if (existingRecordsByTypeAndName['A'][potentialTxtUpsertName]) {
                                // DNS already has A record.
                                console.debug("DNS has A record", potentialTxtUpsertName);
                                if (existingRecordsByTypeAndName['TXT'][potentialTxtUpsertName]) {
                                    let existingTXTRecord = existingRecordsByTypeAndName['TXT'][potentialTxtUpsertName];
                                    if (existingTXTRecord && existingTXTRecord.ResourceRecords && hasManagedMarkerValue(existingTXTRecord.ResourceRecords)) {
                                        console.debug("Have managed TXT record for ", potentialTxtUpsertName);

                                        let desiredArecordChange = desiredRecords['A'][potentialTxtUpsertName];
                                        let desiredARecord = desiredArecordChange.Changes[0].ResourceRecordSet;
                                        if (!areSameARecord(existingRecordsByTypeAndName['A'][potentialTxtUpsertName], desiredARecord)) {
                                            upserts.push(changeComment(desiredRecords['A'][potentialTxtUpsertName], "toolchain - updating existing record."));
                                        } else {
                                            console.debug(potentialTxtUpsertName + " has not changed");
                                            notchanged.push(potentialTxtUpsertName);
                                        }
                                    } else {
                                        console.log("Found TXT record for ", potentialTxtUpsertName, " which does not contain required toolchain managed value indicator:", toolchainManagedValue);
                                        notmanaged.push(potentialTxtUpsertName);
                                    }
                                } else {
                                    console.log("A record found, but no TXT record, for " + potentialTxtUpsertName);
                                    let existingARecord = existingRecordsByTypeAndName['A'][potentialTxtUpsertName];
                                    let desiredArecordChange = desiredRecords['A'][potentialTxtUpsertName];
                                    let desiredARecord = desiredArecordChange.Changes[0].ResourceRecordSet;
                                    if (areSameARecord(existingARecord, desiredARecord)) {
                                        console.log("Have matching A record fields, assuming control of record",potentialTxtUpsertName);
                                        assumed.push(potentialTxtUpsertName);
                                        upserts.push(changeComment(desiredRecords['TXT'][potentialTxtUpsertName], "toolchain - assuming control of 100% matching A record."));
                                    } else {
                                        console.log("A record fields for " + potentialTxtUpsertName + " do not match, not managing.");
                                        notmanaged.push(potentialTxtUpsertName);
                                    }
                                }
                            } else {
                                if (existingUnsafeRecordsByName[potentialTxtUpsertName]) {
                                    console.debug("Found DNS record of another type with same name. Not safe to apply DNS change for ", potentialTxtUpsertName);
                                    conflicts.push(existingUnsafeRecordsByName[potentialTxtUpsertName]);
                                } else {
                                    // There is no record with this name, safe to take control of this DNS record.
                                    console.debug("There is no A record, safe to take control of this DNS record.", potentialTxtUpsertName);
                                    if (existingRecordsByTypeAndName['TXT'][potentialTxtUpsertName]) {
                                        console.debug("Existing TXT record found for " + potentialTxtUpsertName + ", appending marker to it.");
                                        var dnsRecordClone = JSON.parse(JSON.stringify(existingRecordsByTypeAndName['TXT'][potentialTxtUpsertName]));
                                        dnsRecordClone.ResourceRecords.push({Value: toolchainManagedValue});
                                        upserts.push(createUpsertChange(dnsRecordClone, "toolchain - existing A record not found, taking control."));

                                    } else {
                                        console.debug("No TXT record found for " + potentialTxtUpsertName + ", upsert TXT record.");
                                        upserts.push(changeComment(desiredRecords['TXT'][potentialTxtUpsertName], "toolchain - existing A record not found, creating new"));

                                    }
                                    upserts.push(changeComment(desiredRecords['A'][potentialTxtUpsertName], "toolchain - existing A record not found, creating new"));
                                }
                            }
                        }

                        // * go through all desired records, check if there is actual A record for it.
                        // * if not, we upsert A and txt record (record does not exist at all, create it)
                        // * if there is an A record, check for TXT record. If there is a txt record,
                        // * upsert ( exists, is managed, update it).
                        // * else log a warning and ignore (record exists, but no txt record, which means
                        // that DNS record is not managed in code.
                        //
                        // Check if ELB endpoint and domain name match exactly, if so,
                        // upsert TXT and A records.
                        // )

                        let deletes = [];
                        // go through all actual txt records which indicate toolchain managed.
                        // If toolchain managed,
                        // check if there is desired record for it.
                        // If no desired record add DELETE A record and DELETE TXT change record to deletes.

                        if (existingRecordsByTypeAndName['TXT']) {
                            for (let potentialDeleteName in existingRecordsByTypeAndName['TXT']) {
                                let potentialTxtDelete = existingRecordsByTypeAndName['TXT'][potentialDeleteName];
                                if (desiredRecords["TXT"][potentialDeleteName]) {
                                    continue;
                                } else {
                                    if (potentialTxtDelete.ResourceRecords && hasManagedMarkerValue(potentialTxtDelete.ResourceRecords)) {
                                        let recordAToDelete = existingRecordsByTypeAndName['A'][potentialDeleteName];
                                        let txtChange = createDeleteChange(potentialTxtDelete);
                                        if (txtChange.Changes[0].Action === "DELETE") {
                                            deletes.push(txtChange);
                                        } else {
                                            upserts.push(txtChange);
                                        }
                                        deletes.push(createDeleteChange(recordAToDelete));
                                    }
                                }
                            }
                        }

                        let actionsDone = function () {
                            console.debug("DONE!!");
                            done(null, {
                                upserts: upserts,
                                deletes: deletes,
                                assumed: assumed,
                                conflicts: conflicts,
                                notmanaged: notmanaged,
                                notchanged: notchanged,
                                internal: ignoredELBs
                            });
                        };

                        applyRoute53Changes(upserts.concat(deletes), actionsDone);
                    }else {
                        console.debug("Have " + responseCount, "responses, out of", kubeServices.length, " requests.");
                    }
                })
            }

        }
        console.debug("Processing done");
    }

    function getHostedZoneId(targetTopDomain, callback) {
        if (knownHostedZoneIds[targetTopDomain]) {
            callback(knownHostedZoneIds[targetTopDomain]);
            return;
        }
        cmd.exec("aws", ["route53", "list-hosted-zones", "--output", "json"], function (stdout) {
            console.debug("Hosted zones:\n", stdout);
            let hostedZones = JSON.parse(stdout);
            for (let i = 0; i < hostedZones.HostedZones.length; i++) {
                let hz = hostedZones.HostedZones[i];

                if (hz.Name === targetTopDomain + ".") {
                    knownHostedZoneIds[targetTopDomain] = hz.Id;
                    callback(hz.Id);
                    return;
                }
            }
            throw new Error("HostedZoneId for " + targetTopDomain + " not found, exiting.");
        });
    }

    function performSyncDNSRecords(kubeServices, dnsRecords, targetTopDomain) {
        getHostedZoneId(targetTopDomain, function (hostedZoneId) {
            processKubeServices(hostedZoneId, kubeServices, targetTopDomain, dnsRecords);
        });

    }

    function listRoute53Records(targetTopDomain, callback) {
        getHostedZoneId(targetTopDomain, function (hostedZoneId) {
            cmd.exec("aws", ["route53", "list-resource-record-sets", "--hosted-zone-id", hostedZoneId], function (json) {
                console.debug("route53 record sets:\n", json);
                let records = JSON.parse(json);
                callback(records);
            });
        });
    }

    function syncDNSRecords(targetTopDomain) {
        let kubeServices, route53Records;

        function performSyncWhenDataAvailable() {
            if (kubeServices && route53Records) {
                performSyncDNSRecords(kubeServices, route53Records, targetTopDomain);
            }
        }

        queryKubernetesServices(function (services) {
            if (services.length === 0) {
                console.log("No kubernetes services found with subdomain/topdomain labels, there is nothing to add to route53.");
            }
            kubeServices = services;
            performSyncWhenDataAvailable()
        });

        listRoute53Records(targetTopDomain, function (records) {
            route53Records = records;
            performSyncWhenDataAvailable()
        })
    }

    return {
        syncDNSRecords
    }
};
