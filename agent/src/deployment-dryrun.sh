#!/usr/bin/env bash

# Put dryrun/fake kubectl/aws at front in path
export PATH=/code/testbin:/code/bin:${PATH}
export KUBE_CONFIG=/code/testbin/kubectl # Needs to point to existing file to prevent attempt to fetch kubectl from aws

set -e
echo "Executing dry-run"
DRYRUN_MODE=true \
	TESTRUN_MODE=true \
	KUBECONFIG=${KUBE_CONFIG} \
	execute-deployment.sh ${1} testrun-mode /dryrun/
echo "Dry-run successful"
