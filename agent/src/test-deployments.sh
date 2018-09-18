#!/usr/bin/env bash
set -e

echo -------------------- ABOUT SHEPHERD  ------------------------
cat /code/metadata/about.env
echo ------------------------ ABOUT END --------------------------

export PATH=/code/testbin:/code/bin:${PATH}
export KUBECONFIG=/code/testbin/kubectl # Needs to point to existing file for kubectl commands to be run.

if [ ! -e "${KUBECONFIG}" ]; then
	echo "File ${KUBECONFIG} does not exist!"
	ls -la
	ls -la /code/testbin
	exit 255
fi

set -e

FILE_MATCH_PATTERN="*"

TESTRUN_MODE=true execute-deployment.sh /deployments/ testrun-mode /testrun/

REF_FIND_PATTERN="/testreference/${FILE_MATCH_PATTERN}"
ACTUAL_FIND_PATTERN="/testrun/${FILE_MATCH_PATTERN}"


function comparefile(){
	expectedfile=$1
	actualfile=${expectedfile/testreference/testrun}

	if [ ! -e ${actualfile} ] && [ ! -z ${TEST_PARTIAL_DEPLOYMENT} ]; then
		# Ignore absence of actual file.
		exit 0
	fi

	difference=$(diff ${expectedfile} ${actualfile})
	if [ ! "$?" = "0" ]; then
		echo "Actual result ${actualfile} differs from expected reference file ${expectedfile}:"
		echo ${difference}

		echo "TEST FAILED!"
		exit -1
#	else
		#echo "Actual and expected $actualfile $expectedfile match."
	fi

}

function decodesecrets(){
	secretyamlfile=$1
	decodedsecret=$(cat ${secretyamlfile} | grep [A-Za-z\-]\.conf |  awk '{print $2}' | base64 -d 2>/dev/null)

	if [ ! -z "${decodedsecret}" ]; then
		echo "${decodedsecret}" > ${secretyamlfile}.decoded
	fi

	decodedsecret=$(cat ${secretyamlfile} | grep [A-Za-z\-]\.env | awk '{print $2}' | base64 -d 2>/dev/null)

	if [ ! -z "${decodedsecret}" ]; then
		echo "${decodedsecret}" > ${secretyamlfile}.decoded
	fi

}

export -f decodesecrets
find /testrun/*secret*.yaml -type f | xargs -n 1 -I {} bash -c 'decodesecrets "$@" || exit 255' _ {}


if [ -z ${TEST_PARTIAL_DEPLOYMENT} ]; then
	reffiles=$( cd /testreference/ && find ${FILE_MATCH_PATTERN}  | grep -v "testrun.env" | sort )

	actualfiles=$(cd /testrun/ && find ${FILE_MATCH_PATTERN} | sort )

	set +e

	filelistdiff=$(diff <(echo "$reffiles") <(echo "$actualfiles") )
	if [ ! "$?" = "0" ]; then
		echo "Actual files differ from expected reference filelist:"
		echo "${filelistdiff}"

		echo "TEST FAILED!"
		if [ -z "${JENKINS_HOME}" ];
		then
			echo "Is shepherd up to date on your machine? Ensure by running."
			echo "docker pull icelandair/shepherd:latest"
		fi
		exit -1
	else
		echo "Actual and expected file lists match."
	fi
fi
set -e

export -f comparefile
find ${REF_FIND_PATTERN} -type f | grep -v "testrun.env" | xargs -n 1 -I {} bash -c 'comparefile "$@" || exit 255' _ {}
exitcode=$?
if [ ${exitcode} ]; then
	echo "All files match"
fi
exit ${exitcode}
