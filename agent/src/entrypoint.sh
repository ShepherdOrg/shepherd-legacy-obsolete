#!/bin/sh
if [ -x "${1}" ];
then
    eval "${@}"
else
    echo -------------------- ABOUT SHEPHERD AGENT --------------------
    if [ -e /code/metadata/about.env ]; then
        cat /code/metadata/about.env
    else
        echo "Warning: /code/metadata/about.env not present."
    fi
    echo ------------------------- ABOUT END ---------------------------

#    if [ -z "$ENV" ]; then
#        echo "No ENV set! ENV must be set (dev/test/stage/prod/other)";
#        exit 255
#    fi
#
#
#    if [ -z "$DB_USER" ]; then
#        export DB_USER=postgres
#    fi
#
#    if [ -z "$DB_PASS" ]; then
#        echo No DB_PASS set! Need password to be set;
#        exit 255
#    fi
#
#    if [ -z "$DB_HOST" ]; then
#        echo DB_HOST not defined, using postgres
#        export DB_HOST=postgres
#    fi
#
#
#    if [ -z "$POSTGRES_DATABASE" ]; then
#        export POSTGRES_DATABASE=postgres
#    fi
#
#    if [ -z "$DB_PORT" ]; then
#        export DB_PORT=5432
#    fi
#
#    if [ -z "$PG_SSL" ]; then
#        echo "SSL disabled for postgres connection"
#        export PG_SSL=
#    else
#        echo "SSL enabled for postgres connection"
#    fi
#
#
#    set +e
#
#    if [ -z "${SKIP_DB_AVAILAIBILITY_TEST}" ]; then
#
#        echo Checking DB availability ${DB_HOST}:${DB_PORT}
#
#        if [ -z "${DB_AVAILABILITY_CHECK_MAX_RETRIES}" ]; then
#            DB_AVAILABILITY_CHECK_MAX_RETRIES=5
#        fi
#
#        retries=0
#        nc -z -w 2 ${DB_HOST} ${DB_PORT}
#        while [ $? -ne 0 ] && [ ${retries} -lt ${DB_AVAILABILITY_CHECK_MAX_RETRIES} ]; do
#            sleep 2
#            let "retries = ${retries} + 1"
#            nc -z -w 2 ${DB_HOST} ${DB_PORT}
#        done
#
#        if [ ${retries} -ge ${DB_AVAILABILITY_CHECK_MAX_RETRIES} ]; then
#            echo "Unable to verify  ${DB_HOST}:${DB_PORT} DB availability"
#            exit 255
#        fi
#    else
#        echo "SKIP_DB_AVAILAIBILITY_TEST set to ${SKIP_DB_AVAILAIBILITY_TEST}, skipping test."
#    fi
#
#    set -e
#
#    echo "$(date) - connected successfully on ${DB_HOST}:${DB_PORT}"
#
#    if [ "${DEBUG_LOG}" = "true" ]; then
#        echo "vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv DEBUG - ENV vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv "
#        env
#        echo "^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ DEBUG - ENV ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ "
#    fi

	export PATH=/code/bin:${PATH}

	if [ $1 = "npm" ]; then
		echo "npm command: Evaluating npm run ${@}"
	    eval "${@}"
	else
		execute-deployment.sh ${@}
	fi
fi
