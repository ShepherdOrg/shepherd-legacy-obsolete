#!/usr/bin/env bash
THISDIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )

echo "Rebuilding test images"
pushd .
cd ${THISDIR}/test-infrastructure-image/ && ./build-docker.sh
popd
pushd .
cd ${THISDIR}/test-migration-image/ && ./build-docker.sh
popd
pushd .
cd ${THISDIR}/test-image && ./build-docker.sh
popd
pushd .
cd ${THISDIR}/test-image2 && ./build-docker.sh
popd
pushd .
cd ${THISDIR}/test-image3 && ./build-docker.sh
popd
