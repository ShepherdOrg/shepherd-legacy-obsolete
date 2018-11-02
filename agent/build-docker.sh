#!/bin/bash
set -e

env

if [ -z "${REPO_NAME}" ]; then
	export REPO_NAME=icelandair/shepherd
fi

if [ -z "${SEMANTIC_VERSION}" ]; then
	export SEMANTIC_VERSION=0.0-localbuild
fi

if [ -z "${DOCKER_IMAGE}" ]; then
	export DOCKER_IMAGE=${REPO_NAME}:${SEMANTIC_VERSION}
fi

rm -rf ./.build
mkdir ./.build
mkdir ./.build/metadata


if [ -z "$GIT_COMMIT" ]; then
	export GIT_COMMIT=$(git rev-parse HEAD)
	export GIT_URL=$(git config --get remote.origin.url)
	export BUILD_DATE=$(date)
fi

if [ -z "$BRANCH_NAME" ]; then
	export BRANCH_NAME=$(git rev-parse --abbrev-ref HEAD)
fi

LASTFIVECOMMITS=$(git log -5 --pretty=format:" %aD by %an. --- %s %n" > ./.build/gitlog.log && cat ./.build/gitlog.log)
cat > ./.build/metadata/about.env <<_EOF_
# Built: ${BUILD_DATE} on ${HOSTNAME}
DOCKER_IMAGE_TAG=${IMAGE_TAG}
GIT_URL=${GIT_URL}
GIT_COMMIT=${GIT_COMMIT}
Last commits:
${LASTFIVECOMMITS}
_EOF_

docker build \
	-t ${DOCKER_IMAGE} \
	-t ${REPO_NAME}:latest \
	--cache-from ${REPO_NAME}:latest \
	--build-arg SEMANTIC_VERSION=${SEMANTIC_VERSION} \
	--build-arg LAST_COMMITS="$(echo ${LASTFIVECOMMITS} | base64)" \
	--build-arg GIT_URL="${GIT_URL}" \
	--build-arg GIT_HASH="${GIT_COMMIT}" \
	--build-arg BRANCH_NAME="${BRANCH_NAME}" \
	--build-arg BUILD_DATE="${BUILD_DATE}" \
	-f Dockerfile .


if [ -d "/caches/" ]; then
	docker save -o /caches/layercache.tar ${REPO_NAME}:latest
fi

echo ${DOCKER_IMAGE}
