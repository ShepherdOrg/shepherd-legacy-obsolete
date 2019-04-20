#!/bin/bash
# TODO: Remove this file, obsolete legacy stuff.
set -e
set -o pipefail

THISDIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )

if [ "${SECRET_NAMESPACE}" = "" ];
then
	export SECRET_NAMESPACE="default"
fi

echo "Apply secret env file ${SECRET_TEMPLATE_FILE} using name ${SECRET_NAME} SECRET_KEY=${SECRET_KEY}"
YAML_TEMPLATE_FILE=${THISDIR}/../kubernetes/templates/env-secret-template.yaml
export SECRET_TEXT=$(cat ${SECRET_TEMPLATE_FILE} | envsubst)
SECRET_YAML=$(cat ${YAML_TEMPLATE_FILE} | envsubst | base64envsubst.js -n )

echo "${SECRET_YAML}" | kubectl apply -f -

