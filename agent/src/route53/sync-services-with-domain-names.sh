#!/bin/bash
if [ "${ROUTE53_SYNC_ENABLED}" = "true" ]; then
    OPTIONS=""
else
    OPTIONS="--debug --dryrun"
fi
nodejs ./sync-services-with-domain-names.js ${OPTIONS}