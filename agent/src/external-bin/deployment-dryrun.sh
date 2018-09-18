#!/usr/bin/env bash

# See documentation in makefile
# Move into Shepherd
THISDIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )

echo "Shepherd release dry-run"

. ${PWD}/deployments.env

. ${THISDIR}/functions.sh

tmpdir=/tmp/dryrun

rm -rf ${tmpdir} && mkdir ${tmpdir}

if [ -z "${LABS_SHEPHERD_VERSION}" ]; then
	echo "LABS_SHEPHERD_VERSION not set, cannot continue"
	exit -1
fi


pullIfLatest

if [ -z "${ENV}" ]; then
	export ENV=$(${THISDIR}/git-branchname.sh)
fi

echo "Creating dryrun directory and cleaning files"
mkdir -p ${PWD}/dryrun > /dev/null 2>&1
rm -f ${PWD}/deployments/central/testreference/*sorted
rm -rf ${PWD}/dryrun/*

set -e

echo "Loading environment for dryrun"

source ${PWD}/deployments.env
source ${THISDIR}/config.env


function addFakeSecretEnv(){
	CREDFILE="${1}"
	echo "Adding fake secret variables from ${CREDFILE}"
	set +e
	SECRET_ENV_LIST=$(cat ${CREDFILE} | grep "\[.*\]" | cut -d "'" -f6 | grep . )
	SECRET_ENV_LIST2=$(cat ${CREDFILE} | grep "\[.*\]" | cut -d "'" -f8 2>/dev/null | grep .)
	set -e
	echo "${SECRET_ENV_LIST}" | grep -v "SHEPHERD.*" > ${tmpdir}/envlist
	echo "${SECRET_ENV_LIST2}" | grep -v "SHEPHERD.*" >> ${tmpdir}/envlist


	arrayString=$(cat  ${tmpdir}/envlist |tr "\n" " ")
	SECRET_ENV_ARR=($arrayString)

	for envvar in "${SECRET_ENV_ARR[@]}"
	do
		if [ ! $(echo ${envvar} | tr -d '[:space:]') = "" ]; then
			echo $(echo ${envvar} | tr -d '[:space:]')="\""value_censored"\"" >> ${tmpdir}/secretenv-unsorted.env
		fi
	done
	cat ${tmpdir}/secretenv-unsorted.env | sort >> ${tmpdir}/secretenv.env
}

echo "set -a" > ${tmpdir}/secretenv.env

addFakeSecretEnv credentials.groovy
if [ -e "${PWD}/${ENV}/credentials.groovy" ]; then
	addFakeSecretEnv "${PWD}/${ENV}/credentials.groovy"
fi
source ${tmpdir}/secretenv.env

if [ ! -z "${UPSTREAM_IMAGE_NAME}" ]; then
	# When triggered deployment, only compare generated files, do not check if all deployments are performed.
	export TEST_PARTIAL_DEPLOYMENT=true
fi

if [ -z "${HERDFILE}" ]; then
	export HERDFILE=/deployments/central/images.yaml
fi


# Has to be testrun for ES-CLEANER
export ENV=testrun

generateDeploymentEnv
# cat ${tmpdir}/_parameterlist.env

TOOLCHAIN_PARAMS="./deployment-dryrun.sh ${HERDFILE}"

echo "Running deployment dryrun. Full log located in /tmp/dryrun.log"
set +e

docker run \
	-v /var/run/docker.sock:/var/run/docker.sock \
	-v ${HOME}/.docker:/root/.docker \
	-v ${HOME}/.shepherdstore:/root/.shepherdstore \
	-e "ENV=${ENV}" \
    -v /tmp:/tmp \
	-v ${PWD}/dryrun:/dryrun \
	-v ${PWD}/deployments:/deployments \
	--network host \
	--env-file ${tmpdir}/_parameterlist.env \
	--rm \
	icelandair/shepherd:${LABS_SHEPHERD_VERSION} ${TOOLCHAIN_PARAMS} > /tmp/dryrun.log 2>&1
TESTEXITCODE=$?
if [ ! "${TESTEXITCODE}" = "0" ]; then
	echo "Dryrun failed with exit code ${TESTEXITCODE}, execution log follows."
	cat /tmp/dryrun.log
else
	tail -n 1 /tmp/dryrun.log
fi
exit ${TESTEXITCODE}