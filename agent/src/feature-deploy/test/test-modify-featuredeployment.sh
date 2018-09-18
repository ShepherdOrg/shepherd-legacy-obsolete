#!/bin/bash

THISDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

export PATH=${THISDIR}/../../utils:${PATH}

rm -rf ./tmp/
mkdir ./tmp/
cp ./deployment/* ./tmp/

set -a

FEATURE_NAME="Test_la/Feat-ure"

../project-transform-feature-deployment.sh ./tmp/