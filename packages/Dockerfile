FROM node:8

RUN apt update && apt install --no-install-recommends -y jq
WORKDIR /packages
ADD . .

RUN npm install && npm run build-packages
