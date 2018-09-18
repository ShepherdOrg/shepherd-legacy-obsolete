#!/bin/bash
THISDIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )


envfile=${1}

tmpdir=$(mktemp -d -p /tmp/)

trap " rm -rf ${tmpdir}" EXIT


function generateDockerEnvFile(){
	envfile=${1}
	# Import environment vars from current shell, except for those on the exclusionlist
	compgen -e | sort > ${tmpdir}/completeenvlist.txt
	comm -23 ${tmpdir}/completeenvlist.txt ${THISDIR}/../generic-tools/docker-env-exclusionlist.txt > ${tmpdir}/envlist.txt
	mapfile -t arr < ${tmpdir}/envlist.txt

	for i in "${arr[@]}"
	do
		echo $i=\${$i} >> ${tmpdir}/_envmap.env
	done

	cat ${tmpdir}/_envmap.env | envsubst  > ${envfile}
}


generateDockerEnvFile ${envfile}