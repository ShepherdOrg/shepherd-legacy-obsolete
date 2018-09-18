const https = require('https');
const fs = require('fs');
const url = require('url');
const _ = require('lodash');


function getUserHome() {
    return process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
}

function loadAuth(registry){
    let authJson=fs.readFileSync(getUserHome() + "/.docker/config.json");
    let authDoc=JSON.parse(authJson);
    let auth=authDoc.auths[registry];
    if(auth){
        return auth.auth;
    } else{
        throw new Error("Docker config does not contain authentication for " + registry);
    }
}

function httpsRequest(url, basicAuth, path,accept,headers, done ) {
    console.log(`Requesting ${url} ${path}`);
    accept = accept || '*';
    path = path || ``;
    let options = {
        host: url,
        port: 443,
        path: path,
        method: 'GET',
        headers: {}
    };
    if (basicAuth) {
        options.headers.Authorization = `Basic ${basicAuth}`
    }
    if (accept) {
        options.headers.Accept = accept;
    }
    if (headers) {
        _.extend(options.headers, headers);
    }
    let resbuf = "";
    console.log("Making request", JSON.stringify(options));
    const req = https.request(options, function (res) {
        console.log(res.statusCode);
        res.on('data', function (d) {
            resbuf += d;
        });
        res.on('end', function (/*enddata*/) {
            console.log("END OF REQUEST RESPONSE");
            console.log(JSON.stringify(res.headers));
            done(resbuf, res);
        })
    });
    req.end();
    req.on('error', function (e) {
        console.error(e);
    });
}

describe('Docker registry API - get manifest - basicauth', function () {

    let REGISTRY_URL = "registry.hub.docker.com";
    let basicAuth = loadAuth(REGISTRY_URL);

    let IMAGE = "icelandair/shepherd";
    let IMAGE_TAG = "latest";


    beforeEach(function () {

    });

    it('Should call  registry', function (done) {
        // Just checking for a wiring/injection error
        //  done();
        //  return;
        httpsRequest(REGISTRY_URL, basicAuth, `/v2/${IMAGE}/manifests/${IMAGE_TAG}`, 'application/vnd.docker.distribution.manifest.v2+json', null, function (resbuf) {
            let manifestobj = JSON.parse(resbuf);
            fs.writeFileSync("../response.json", resbuf);
            console.log("wrote file");
            let configdigest = manifestobj.config.digest;
            console.log("configdigest", configdigest);

            console.log("Next request");
            httpsRequest(REGISTRY_URL, basicAuth, `/v2/${IMAGE}/blobs/${configdigest}`,'*', null, function (resbuffer, res) {
                if(res.statusCode === 307){
                    console.log("Redirect...");
                    let redirectHeaders = res.headers;
                    let redirectUrl = redirectHeaders.location;
                    let parsedUrl = url.parse(redirectUrl, true);
                    // let newHeaders = parsedUrl.query;
                    let path = parsedUrl.path;
                    let host = parsedUrl.host;
                    httpsRequest(host, undefined, path, undefined, undefined, function (buffer, response) {
                        console.log("Redirect response", response.statusCode, buffer);

                        fs.writeFileSync("./metadata.json", buffer);

                        done();
                    });

                } else {
                    console.error("Dont know how to deal with response code ", res.statusCode, ": Respose body: " + resbuffer);
                }
            })

        } );
    });

    it('Should parse redirect', function () {

    })


});