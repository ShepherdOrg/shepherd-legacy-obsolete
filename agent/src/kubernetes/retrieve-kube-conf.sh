#!/usr/bin/env bash

THISDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

source ${THISDIR}/functions.sh

retrieve-kube-config
