#!/usr/bin/env bash

kubectl get deployment --no-headers=true --output=custom-columns=NAME:.metadata.name | xargs -n 1 -I {} bash -c 'kubectl scale --replicas=1 deployment "$1"' _ {}
