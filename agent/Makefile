ifndef REPO_NAME
	export REPO_NAME := icelandair/shepherd
endif

ifndef SEMANTIC_VERSION
	export SEMANTIC_VERSION := 0.0-localbuild
endif

ifndef DOCKER_IMAGE
	export DOCKER_IMAGE := ${REPO_NAME}:${SEMANTIC_VERSION}
endif

build-docker:
	./build-docker.sh

build-testing-images:
	cd e2etests && make docker-testing-images

push-docker:
	docker push ${DOCKER_IMAGE}
	docker push ${REPO_NAME}:latest


ci: build-docker build-testing-images testenv-up specs integrationtests testenv-down

testenv-up:
	cd testenv && make up

testenv-down:
	cd testenv && make down

tdd: testenv-up
	docker exec -it testenv_shepherd-agent_1 npm run tdd

specs: testenv-up
	docker exec testenv_shepherd-agent_1 npm run specs


watch-integrationtests: testenv-up
	docker exec -it testenv_shepherd-agent_1 npm run watch-integrationtests

integrationtests: testenv-up
	docker exec testenv_shepherd-agent_1 npm run integrationtests

