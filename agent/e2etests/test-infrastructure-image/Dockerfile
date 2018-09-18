FROM postgres:latest
ADD ./.pgpass /root/.pgpass
RUN chmod 600 /root/.pgpass

ADD ./entrypoint.sh ./entrypoint.sh
ENTRYPOINT ["./entrypoint.sh"]

LABEL is.icelandairlabs.name="Infrastructure"

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

LABEL is.icelandairlabs.environment.variables="DB_HOST=\${MICROSERVICES_POSTGRES_RDS_HOST},DB_PASS=\$MICRO_SITES_DB_PASSWORD"

# Means it will receive full environment. Should be specified in infrastructure section.
# Will get a /exports/ mount for exporting infrastructure environment when required. NOTE: This is a fallback when other
# means for service/resource discovery are not available. Most often, DNS services should be used.
LABEL is.icelandairlabs.infrastructure="true"

