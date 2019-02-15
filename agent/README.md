# Shepherd agent

Role is to run in CI environment, pass on configuration to infrastructure provisioning and/or kubernetes deployments, 
and pass on necessary values from infrastructure to deployments.

## Why Shepherd
1. Group configuration, secret management and deployment management of microservices and databases together, 
ideally along with your infrastructure as code. On the upside it means more reuse of code, and fewer places to look for 
configuration. On the downside it means less local control of the deployment process for each microservice. This should be offset by 
grouping related services together for configuration management, rather than looking at shepherd config as
"global" in your context.
2. Decouple deployment management from individual deployment and infrastructure management technologies. By relying
on docker for packaging deployment definitions and deployment execution, using Shepherd for deployment management 
decouples your release management workflow from individual technologies, meaning more freedom to experiment with new
approaches, or mix and match different approaches within the same deployment management process, without losing
system coherence in version control.
3. Decouple deployment management from CI/CD tools. Release workflow nowadays is quite often implemented using CI/CD 
tools, meaning that your workflow becomes quite tightly coupled with the CI/CD tool you have chosen. Using Shepherd 
decreases this coupling drastically.
 

## Setup and execution

Shepherd agent is designed to work on configuration stored in version control and run by a CI server, such as
Jenkins, TeamCity, GoCD or other.

By default, deployment state is stored on the filesystem. This is generally safe with idempotent deployment technologies,
like kubernetes, but can lead to sub-optimal behavior if the filesystem is not available from all nodes that
can execute the deployment. 

The state store can also operate against postgres. See below.

## Shepherd configuration

One major goal for Shepherd is to simplify configuration of multiple deployments. The major configuration
files are ```herd.yaml``` (alias ```images.yaml```), and $ENV.env files. ```herd.yaml``` stores references
to all deployments under management, of which there are four types.

Those are infrastructure docker images, kubernetes deployments from image labels, and deployers, which are ideal for 
database migration execution and arbitrary installers.

In addition, Shepherd supports deployment folders containing kubernetes deployment files in yaml format.


## Infrastructure images

Infrastructure images receive full environment of the host, with a few [exceptions](src/bin/docker-env-exclusionlist.txt). 
Will get a /exports/ mount for exporting infrastructure environment when required.
Should write exported variables to /exports/export.env file in the format. 

```
ENV_NAME=ENV_VALUE
```
___IMPORTANT NOTE___: This is not necessarily the best way to make resources available. DNS services can be used, 
kubernetes external service definitions, or service discovery mechanisms. Using this should be considered a hack, 
a design smell, something to be fixed.

See [entrypoint.sh](e2etests/test-infrastructure-image/entrypoint.sh) for an example on how to export variables from an infrastructure image.

## Kubernetes deployments



## Execution order

Shepherd agent works by creating an execution plan first, expanding any environment variable dependencies
and parameters extracted from the environment. Since infrastructure images provide part of that environment,
they are run immediately when loading the plan, while other deployments are only run once all variable expansion
has been complete. So, the execution order is as follows:

1. infrastructure images, in the order they are specified. NOTE: Only use this if the infrastructure needs to export variables consumed
by other deployments. If your setup uses discovery services, infrastructure can be deployed using the __deployer__ approach. 
1. folders containing kubernetes deployment files.
1. images in the images section, in the order they are specified.
1. images/deployers (such as database migrations) referred to in images.

Although the execution order of deployments is fairly deterministic, it is generally a bad idea to depend
on that deployments will happen in a particular order in distributed systems. Services should be built
with backwards/forwards compatibility in mind, meaning they should not break at least one version forward/backwards
in the release train. 

## Dry-run

TODO Document

### Add an image/deployment

Generally speaking it is a good idea to keep the original deployment files for a given (micro)service as
close to its sources. To enable this arrangement, and achieve aggregated release control, Shepherd uses
docker labels to enable this. All labels:


```
LABEL is.icelandairlabs.name="service-name"
ARG BRANCH_NAME
ENV LABS_BRANCH_NAME ${BRANCH_NAME}

LABEL is.icelandairlabs.git.branch=${BRANCH_NAME}
ARG GIT_URL
LABEL is.icelandairlabs.git.url=${GIT_URL}
ENV LABS_GIT_URL ${GIT_URL}

ARG GIT_HASH
LABEL is.icelandairlabs.git.hash=${GIT_HASH}
ENV LABS_GIT_HASH ${GIT_HASH}

ARG SEMANTIC_VERSION
LABEL is.icelandairlabs.version=${SEMANTIC_VERSION}
ENV LABS_VERSION ${SEMANTIC_VERSION}

ARG LAST_COMMITS
LABEL is.icelandairlabs.lastcommits=${LAST_COMMITS}

ARG BUILD_DATE
LABEL is.icelandairlabs.builddate=${BUILD_DATE}
ENV LABS_BUILD_DATE ${BUILD_DATE}

ARG KUBECONFIG_B64
LABEL is.icelandairlabs.kube.config.tar.base64=${KUBECONFIG_B64}

```

The key here is in the last line, which is base64 encoded tar.gz file. As such, it is not
expected that the deployment files are very large, max size has not been determined, but we've
not run in to it yet.

The bash line to create this label looks like this:

```
KUBECONFIG_B64=$(cd ./.build && tar -zcv ./deployment/ | base64 )
```

and pass it into the docker build command like this: 
```
docker build -t ${DOCKER_IMAGE} \
	--build-arg SEMANTIC_VERSION=${SEMANTIC_VERSION} \
	--build-arg LAST_COMMITS="$(echo "${LASTFIVECOMMITS}" | base64)" \
	--build-arg GIT_URL="${GIT_URL}" \
	--build-arg GIT_HASH="${GIT_COMMIT}" \
	--build-arg BRANCH_NAME="${BRANCH_NAME}" \
	--build-arg BUILD_DATE="${BUILD_DATE}" \
	--build-arg KUBECONFIG_B64="${KUBECONFIG_B64}" \
	-f Dockerfile .
```


### Remove an image/deployment

Add a ```delete``` property to the image reference, and the ```kubectl``` operation will
be delete instead of apply.

##### Example:
```
test-image-to-delete:
  	image: testenvimage
  	imagetag: 0.0.0
  	delete: true
  	reason: "Dont need this anymore"

```

This reference can stay indefinitely without side effects, and is also safe to remove once applied
to all desired environments. ___Note:___ reason field is optional.

### Cluster policies


```
CLUSTER_POLICY_MAX_CPU_REQUEST="50m" 
CLUSTER_POLICY_MAX_REPLICAS=1
CLUSTER_POLICY_PUBLIC_SERVICES_IP_RESTRICTIONS=unchanged|remove
```

## Folders

### Add an deployment

Create a directory containing your kubernetes deployment files. 

### Remove an image/deployment

Create a file named ```shepherd-delete``` in your folder, and the kubectl operation will be
delete instead of apply. Example:
```
namespaces$ ls -l
total 4
-rw-rw-r-- 1 someuser someuser 58 Dec 21 13:05 monitors-namespace.yml
-rw-rw-r-- 1 someuser someuser  0 Dec 21 13:05 shepherd-delete

```
The file can stay there indefinitely. If need arises to reverse the decision, simply remove the marker
file and the deployment will be applied again.


## Deployers

### Update
TODO: Document.

### Remove 
TODO: Document.
TODO: Finish implementing.

### Deployer dependencies / chaining

# Feature deployments

TODO: Document.


# Storing version state

Shepherd can be run with or without version state store configured. If run without it,
it default to writing state to ~/.shepherdstore.  With the assumption that deployments are idempotent, 
that is, repeated runs yield the same result, this is safe to do, even if the state is lost. 
To enable the postgres version state store, make the SHEPHERD_PG* environment variables below available
to Shepherd.

```
{
	"host": process.env.SHEPHERD_PG_HOST || "localhost",
	"user": process.env.SHEPHERD_PG_USER || "postgres",
	"database": process.env.SHEPHERD_PG_DATABASE || "postgres",
	"password": process.env.SHEPHERD_PG_PASSWORD || "mysecretpassword",
	"port": process.env.SHEPHERD_PG_PORT || 5432
}

```

In particular, ```SHEPHERD_PG_HOST``` must be set to enable the postgres store, even if you want it
to run on localhost.

#### How state storage works
The state storage evaluates whether a deployment needs to be applied by computing a checksum from
the deployment descriptor/parameters ___after___ configuration is applied to them. Hence, a deployment 
will be applied again if the version or configuration changes. Same goes for deployers, they will
be run again if version or environment parameters change.


# Kubeconfig

Two methods are supported for providing kubeconfig to Shepherd.

## Using ~/.kube/config

Specify the kubeconfig file you want to use by setting SHEPHERD_KUBECONFIG environment variable. Example:

```
export SHEPHERD_KUBECONFIG=/home/myuser/.kube/config.dev
```
If set, will be mapped to default location for kubeconfig inside Shepherd container.

In Jenkins, you can use secret file to store the kubeconfig, and use it like this:

```
        withCredentials([file(credentialsId: 'KUBECONFIG_DEV', variable: 'SHEPHERD_KUBECONFIG')]) {
            sh '...run deploy...'
        }

```

## Using S3 bucket

Specify the path to the kubeconfig file in S3 you want to use. Note: Requires aws cli to be configured and
the provided user to have access to this bucket.

Example:
```
export KUBE_CONFIG_S3_PATH=s3://my-dev-cluster/kubeconfig/cluster.dev.kube
```

# AWS cli config
For AWS features, aws access key and access secrets need to be provided, unless you are running Shepherd from
an EC2 instance with appropriate roles set. This can be done by exporting ```AWS_ACCESS_KEY_ID```, ```AWS_SECRET_ACCESS_KEY```
and ```AWS_DEFAULT_REGION```.

See [AWS CLI Environment](https://docs.aws.amazon.com/cli/latest/userguide/cli-environment.html)

It is recommended to use a secret store to manage secrets.

# Shepherd tools

Shepherd tools is a collection of bash functions intended to make easy to inspect docker images metadata for
shepherd.


## Installing

Create files ```deployments.env``` and ```$ENV.env```. These files will be shell sourced, all environment variables exported
will be available for variable expansion in all deployment files, and made available for import into deployers and database 
migration images.

```deployments.env``` file should contain volatile config that does not differ between environments, such as
company names and external domain names that do not change between dev/test/prod environments.

```$ENV.env```, for example dev.env, should contain volatile config that differs between environments, such
as database connection strings and other environment specific settings.

___IMPORTANT:___ Use secret management software such as the Jenkins Credentials store or Vault to manage username/passwords, access keys
and certificates. Never store secret information in version control.

Create entry points for running shepherd. Below is a make target that installs shepherd scripts required for running dry-run, test-deployments and the
deployment process itself. Use whatever method that fits you. It is recommended to update the scripts every time before running them.

#### Example makefile target:
```
update-shepherd-scripts:
	docker run \
        -v /tmp:/tmp \
    	-v ${PWD}:/installmount \
    	--rm \
    	icelandair/shepherd:${LABS_SHEPHERD_VERSION} ./update-shepherd-scripts.sh

```

# Secret management using Jenkins

# Future

* Kubernetes namespace support for feature deployments.


# Developing

Tests are setup using jasmine. There are two types of tests:
* specs are fast running unit tests, with no external depedencies.
To run, execute ```npm run specs``` in ```src``` folder.

* integrationtests are slower running, may need external dependencies, like
a database or webservice to ber runnings. To run, execute ```npm run integrationtest```

integrationtests require postgres to be running on localhost for some tests directly through npm run. Run like this:

```
docker run --name postgres -e POSTGRES_PASSWORD=mysecretpassword -d -p 5432:5432 postgres
```
TODO: Run tests in docker compose.
TODO: Document running postgres using npm run.

For an even more integrated testing, run from ```agent``` folder
```
make integrationtests
```
This will build the docker and run postgres alongside with the integrationtests inside the agent dockerimage.

TODO: Build test images in this target also.


# TODO
Figure out why TPL_DOCKER_IMAGE is not working in aws-environment:
```
ERROR:  Plan load error. When processing folder direct-deployments
ERROR: While scanning /deployments/central/authenticator:Storing deployment state, for file /deployments/central/authenticator/authenticator.deployment.yml:
ERROR: Error: Reference to environment variable ${TPL_DOCKER_IMAGE} could not be resolved:           image: ${TPL_DOCKER_IMAGE}
```
Dry-run against capacity/dev.
Cleanup, remove deploy images.js
Run jasmine tests from Jenkinsfile.
Run full integration test for deploy-images.js using Jasmine.
Autopromoting.