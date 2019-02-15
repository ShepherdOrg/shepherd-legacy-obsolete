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
fi
