#!/usr/bin/env bash

export THISDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

set -e

DEPLOYMENT_FOLDER=${1}

echo Deploying from ${DEPLOYMENT_FOLDER}

export PATH=/code/utils:$PATH

if [ -z "${TIME_TO_LIVE_HOURS}" ]; then
	export TIME_TO_LIVE_HOURS=120
fi

if [ -z "${FEATURE_NAME}" ];then
	echo "\${FEATURE_NAME} not set, is required!"
	exit -1
fi

export FEATURE_NAME=$(echo ${FEATURE_NAME/\//--} | tr '[:upper:]' '[:lower:]')

ls -laRrt ${DEPLOYMENT_FOLDER}

tmpdir=$(mktemp -d -p /tmp/)
trap "rm -rf ${tmpdir}" EXIT

cp ${DEPLOYMENT_FOLDER}/* ${tmpdir}


CONFIGMAP_COUNT=$(cat ${tmpdir}/* | grep "kind: ConfigMap" | wc -l )

if [ ${CONFIGMAP_COUNT} -gt 1 ]; then
	echo "ERROR: Cannot modify deployment with multiple configmaps."
	exit 255
fi

if [ ${CONFIGMAP_COUNT} -eq 1 ]; then
	echo "Found one configmap in deployment"
	export CONFIG_MAP_NAME_TO_MODIFY=$(cat ${tmpdir}/*.config.y* | yq -r .metadata.name)
	echo CONFIG_MAP_NAME_TO_MODIFY ${CONFIG_MAP_NAME_TO_MODIFY}
fi

function ymlenvsubst(){
	set -e
	ymlfile=${1}

	if [[ ( ! -z "${CONFIG_MAP_NAME_TO_MODIFY}" ) && ( $(cat ${ymlfile} | grep "kind: ConfigMap" | wc -l ) = "1" ) ]]; then
		echo "Modifying config map file ${ymlfile} for feature name ${FEATURE_NAME}"
		sed -i "s/${CONFIG_MAP_NAME_TO_MODIFY}/${CONFIG_MAP_NAME_TO_MODIFY}-${FEATURE_NAME}/g" ${ymlfile}
	else
		echo "Modifying for feature deployment: ${ymlfile} ${FEATURE_NAME} ${TIME_TO_LIVE_HOURS}"
		${THISDIR}/kube-modify-featuredeployment.js ${ymlfile} ${FEATURE_NAME} ${TIME_TO_LIVE_HOURS} ${CONFIG_MAP_NAME_TO_MODIFY}
	fi

	chmod 777 ${ymlfile}
	echo ${ymlfile} modified.
}

export -f ymlenvsubst

if [ ! "${ENV}" = "dev" ]; then
	echo "Please only use this deployment method for dev environment!"
fi

if [ -e ~/.aws/config ] && [ -z "${AWS_DEFAULT_PROFILE}" ]; then
	echo "AWS_DEFAULT_PROFILE not defined, using default."
	export AWS_DEFAULT_PROFILE=default
fi


echo "Temp contents:"
ls -lartR ${tmpdir}

find ${DEPLOYMENT_FOLDER}/* -name "*.yml"  | xargs -n 1 -I {} bash -c 'ymlenvsubst "$@"' _ {}
DEPLOYFAILURE=$?
if [ ! ${DEPLOYFAILURE} ]; then
	echo Failure modifying deployment descriptor, exit code: ${DEPLOYFAILURE}
	exit ${DEPLOYFAILURE}
fi

echo "Deployments modified in ${DEPLOYMENT_FOLDER}/"



