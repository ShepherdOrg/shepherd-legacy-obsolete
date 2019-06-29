FROM alpine:3.8

RUN apk --no-cache update && \
    apk --no-cache add python py-pip py-setuptools ca-certificates groff less && \
    apk --no-cache add --update nodejs npm && \
    pip --no-cache-dir install awscli && \
    rm -rf /var/cache/apk/*

RUN apk --no-cache add --update alpine-sdk

RUN curl -LO https://storage.googleapis.com/kubernetes-release/release/v1.7.6/bin/linux/amd64/kubectl && chmod +x ./kubectl && mv ./kubectl /usr/local/bin/kubectl

RUN apk --no-cache add bash

RUN apk --no-cache add jq

ENV \
    BUILD_DEPS="gettext"  \
    RUNTIME_DEPS="libintl"

RUN \
    apk --no-cache add --update $RUNTIME_DEPS && \
    apk --no-cache add --virtual build_deps $BUILD_DEPS &&  \
    cp /usr/bin/envsubst /usr/local/bin/envsubst && \
    apk del build_deps

# Create nodejs alias
RUN ln -s /usr/bin/node /usr/bin/nodejs

## Support for running docker inside docker.
RUN apk add --no-cache ca-certificates

ENV DOCKER_CHANNEL stable
ENV DOCKER_VERSION 17.06.0-ce
# TODO ENV DOCKER_SHA256
# https://github.com/docker/docker-ce/blob/5b073ee2cf564edee5adca05eee574142f7627bb/components/packaging/static/hash_files !!
# (no SHA file artifacts on download.docker.com yet as of 2017-06-07 though)


# why we use "curl" instead of "wget":
# + wget -O docker.tgz https://download.docker.com/linux/static/stable/x86_64/docker-17.03.1-ce.tgz
# Connecting to download.docker.com (54.230.87.253:443)
# wget: error getting response: Connection reset by peer
# this "case" statement is generated via "update.sh"
RUN set -ex; \
	apk add --no-cache --virtual .fetch-deps \
		curl \
		tar; \
	apkArch="$(apk --print-arch)"; \
	case "$apkArch" in \
		x86_64) dockerArch='x86_64' ;; \
		s390x) dockerArch='s390x' ;; \
		*) echo >&2 "error: unsupported architecture ($apkArch)"; exit 1 ;;\
	esac; \
	if ! curl -fL -o docker.tgz "https://download.docker.com/linux/static/${DOCKER_CHANNEL}/${dockerArch}/docker-${DOCKER_VERSION}.tgz"; then \
		echo >&2 "error: failed to download 'docker-${DOCKER_VERSION}' from '${DOCKER_CHANNEL}' for '${dockerArch}'"; \
		exit 1; \
	fi; \
	tar --extract \
		--file docker.tgz \
		--strip-components 1 \
		--directory /usr/local/bin/ ; \
	rm docker.tgz; \
	apk del .fetch-deps; \
	docker -v

RUN npm install -g yarn

WORKDIR /code

COPY ./src/ .

RUN yarn install

# Trick to make node_modules accessible when source directory is linked during testing.
RUN mv /code/node_modules /node_modules
RUN mv /code/packages /packages

COPY ./.build/metadata/ ./metadata/



RUN chmod +x ./entrypoint.sh
# RUN ls -lart ./src/
ENTRYPOINT ["./entrypoint.sh"]


LABEL shepherd.name="Shepherd agent"

ARG BRANCH_NAME
LABEL shepherd.git.branch=${BRANCH_NAME}

ARG GIT_URL
LABEL shepherd.git.url=${GIT_URL}

ARG GIT_HASH
LABEL shepherd.git.hash=${GIT_HASH}

ARG SEMANTIC_VERSION
LABEL shepherd.version=${SEMANTIC_VERSION}

ARG LAST_COMMITS
LABEL shepherd.lastcommits=${LAST_COMMITS}

ARG BUILD_DATE
LABEL shepherd.builddate=${BUILD_DATE}

# Has no migrations docker
#ARG MIGRATIONS_DOCKERIMAGE
#LABEL shepherd.dbmigration=${MIGRATIONS_DOCKERIMAGE}

# Agent is not kubernetes deployable
#ARG KUBECONFIG_B64
#LABEL shepherd.kube.config.tar.base64=${KUBECONFIG_B64}
