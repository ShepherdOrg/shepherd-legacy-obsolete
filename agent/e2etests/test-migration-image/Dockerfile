FROM alpine:3.4

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

LABEL is.icelandairlabs.environment.variables="EXPORT1=\${EXPORT1},DB_HOST=\${MICROSERVICES_POSTGRES_RDS_HOST},DB_PASS=\$MICRO_SITES_DB_PASSWORD,THIS_IS_DEPLOYER_ONE=true"

LABEL is.icelandairlabs.deployer="true"
LABEL is.icelandairlabs.deployer.command="ls"
