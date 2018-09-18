#!/bin/bash
BASICAUTH=aWNlbGFuZGFpcmxhYnM6VDM1MWE=
REGISTRY_URL=
AUTH_URL=${REGISTRY_URL}
IMAGE=icelandair-com/cluster-build
TAG=latest


if [ -z "${AUTH_URL}" ]; then
	AUTH_URL=auth.docker.io
fi
if [ -z "${REGISTRY_URL}" ]; then
	REGISTRY_URL=registry-1.docker.io
fi

#echo "Requesting token"
#curl -s -H"Authorization: Basic $BASICAUTH"  "https://${REGISTRY_URL}/v2/login?scope=repository:$IMAGE:pull&service=${REGISTRY_URL}"
##curl -s -H"Authorization: Basic $BASICAUTH"  "https://${REGISTRY_URL}/token?scope=repository:$IMAGE:pull&service=${REGISTRY_URL}"
#echo "Requested token"
##TOKEN=$(curl -s -H"Authorization: Basic $BASICAUTH"  "https:///token?scope=repository:$IMAGE:pull&service=registry.docker.io" | jq -r .token)
##echo "TOKEN $TOKEN"
#exit

curl -s -H"Accept: application/vnd.docker.distribution.manifest.v2+json" -H"Authorization: Basic $BASICAUTH" "https://${REGISTRY_URL}/v2/$IMAGE/manifests/$TAG"

CONFIG_DIGEST=$(curl -s -H"Accept: application/vnd.docker.distribution.manifest.v2+json" -H"Authorization: Basic $BASICAUTH" "https://${REGISTRY_URL}/v2/$IMAGE/manifests/$TAG" | jq -r .config.digest)
echo $CONFIG_DIGEST
curl -s -H"Authorization: Basic $BASICAUTH" "https://${REGISTRY_URL}/v2/$IMAGE/blobs/$CONFIG_DIGEST"

# ENTRYPOINT=$(curl -sL -H"Authorization: Basic $BASICAUTH" "https://${REGISTRY_URL}/v2/$IMAGE/blobs/$CONFIG_DIGEST" | jq -r .container_config.Entrypoint)

echo $ENTRYPOINT


#exit

