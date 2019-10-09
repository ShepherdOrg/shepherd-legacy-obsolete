#!/usr/bin/env bash
THISDIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )

set -eao pipefail

echo "Rebuilding test images"
(cd ${THISDIR}/test-infrastructure-image/ && ./build-docker.sh)
(cd ${THISDIR}/test-migration-image/ && ./build-docker.sh)
(cd ${THISDIR}/test-image && ./build-docker.sh)
(cd ${THISDIR}/test-image2 && ./build-docker.sh)
(cd ${THISDIR}/test-image3 && ./build-docker.sh)
