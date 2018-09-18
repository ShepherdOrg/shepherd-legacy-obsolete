#!/bin/bash
set -e

export THISDIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )

. ${THISDIR}/../kubernetes/functions.sh
. ${THISDIR}/../lib/sh/functions.sh

export HERDFILE=$1
export TESTMODE=$2
export EXPORT_DIR=$3


if [ -z "${HERDFILE}" ]; then # default herdfile for backwards compatibility
	export HERDFILE=/deployments/central/images.yaml
fi

requireVariable HERDFILE
requireFilePresent ${HERDFILE}


function releaseherd(){
	if [ "${DEBUG_LOG}" = "true" ]; then
		echo "Applying secrets/services/deployments/configmaps from docker image metadata"
	fi
	echo "Shepherd releasing herd in $1"
	shepherd.js $1 $TESTMODE $EXPORT_DIR
}

export -f releaseherd

function update-route53(){
	if [ "${ROUTE53_SYNC_ENABLED}" = "true" ]; then
		echo "Update DNS entries for kubernetes cluster in route53."
		if [ -z "${TOP_DOMAIN_NAME}" ]; then
			echo "TOP_DOMAIN_NAME must be set for route53 sync to function"
			exit 255
		fi
		cd ${THISDIR}/../route53 && ENV=${ENV} TOP_DOMAIN_NAME=${TOP_DOMAIN_NAME} ROUTE53_SYNC_ENABLED=true ./sync-services-with-domain-names.sh
	fi
}

if [[ $2 = "reset" ]]; then
   echo "Not performing deployment when ${2}"
else
	echo "Deployments contents"
	ls -lart /deployments

	configureKubeCtl

	if [ ! "${TESTRUN_MODE}" = "true" ]; then
		echo "Expiring kubernetes resources"
		${THISDIR}/../kubernetes/delete-expired-resources.sh
	fi

	echo "Deploy herd in ${HERDFILE}"
	cat ${HERDFILE}

	releaseherd ${HERDFILE}
	echo "Done deploying images"

	# todo Then from deployment folder

	if [ -z "${TESTRUN_MODE}" ]; then
		update-route53
	else
		echo "TESTRUN_MODE ${TESTRUN_MODE}, skipping route53 update"
	fi

fi
