#!/usr/bin/env bash
echo Building ./packages/$1
(cd ./packages/$1 && npm install && npm run build)