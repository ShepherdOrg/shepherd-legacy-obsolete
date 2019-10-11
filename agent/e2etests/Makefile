docker-testing-images:
	npm install && ./build-test-images.sh

watch-integrationtests:
	docker exec -it testenv_shepherd-agent_1 npm run watch-integrationtests

integrationtests:
	docker exec testenv_shepherd-agent_1 npm run integrationtests

