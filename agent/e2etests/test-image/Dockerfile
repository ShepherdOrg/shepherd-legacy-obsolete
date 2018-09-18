FROM alpine:3.4

ADD ./entrypoint.sh ./entrypoint.sh


LABEL is.icelandairlabs.name="Testimage"

ARG BRANCH_NAME
LABEL is.icelandairlabs.git.branch=${BRANCH_NAME}

ARG GIT_URL
LABEL is.icelandairlabs.git.url=${GIT_URL}

ARG GIT_HASH
LABEL is.icelandairlabs.git.hash=${GIT_HASH}

ARG SEMANTIC_VERSION
LABEL is.icelandairlabs.version=${SEMANTIC_VERSION}

ARG LAST_COMMITS
LABEL is.icelandairlabs.lastcommits=${LAST_COMMITS}

ARG BUILD_DATE
LABEL is.icelandairlabs.builddate=${BUILD_DATE}

ARG MIGRATIONS_DOCKERIMAGE
LABEL is.icelandairlabs.dbmigration=${MIGRATIONS_DOCKERIMAGE}

ARG KUBECONFIG_B64
LABEL is.icelandairlabs.kube.config.tar.base64=${KUBECONFIG_B64}


ENTRYPOINT ["./entrypoint.sh"]