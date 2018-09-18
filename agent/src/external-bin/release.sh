#!/usr/bin/env bash

THISDIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )

set -e

. ${THISDIR}/config.env
. ${THISDIR}/functions.sh
. ${PWD}/deployments.env

if [ -e ~/.icelandair/${ENV}.env ]
then
	echo "Using environment defined in ~/.icelandair/${ENV}.env. Used for development purposes when running migrations on developer machines."
	export DEV_MODE="true"
	source ~/.icelandair/${ENV}.env
fi

if [ -z "${HERDFILE}" ]; then
	export HERDFILE=/deployments/central/images.yaml
fi

pullIfLatest

tmpdir=$(mktemp -d)
echo Using tmpdir ${tmpdir}
trap "rm -rf ${tmpdir}" EXIT

generateDeploymentEnv

#echo "--------------------ENV follows ----------------------------------------"
#env
#echo "--------------------ENV list above ----------------------------------------"

echo "--------------------DOCKER ENV LIST FOLLOWS ----------------------------------------"
echo "From file: ${tmpdir}/_parameterlist.env"
cat ${tmpdir}/_parameterlist.env
echo "--------------------DOCKER ENV LIST ABOVE ----------------------------------------"

docker run \
		-v /var/run/docker.sock:/var/run/docker.sock \
		-v ${HOME}/.docker:/root/.docker \
		-v ${SHEPHERD_KUBECONFIG}:/root/.kube/config \
	    -v ~/.ssh:/root/.ssh \
		-v ${HOME}/.shepherdstore:/root/.shepherdstore \
	    -v /tmp:/tmp \
	    -v ${PWD}/deployments:/deployments \
	    --network host \
	    --env-file ${tmpdir}/_parameterlist.env \
	    --rm \
	icelandair/shepherd:${LABS_SHEPHERD_VERSION} ${HERDFILE} ${1}

echo "Shepherd deployments complete"
