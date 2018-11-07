FROM node:8

WORKDIR /packages
ADD . .

RUN npm install && npm run build-packages
