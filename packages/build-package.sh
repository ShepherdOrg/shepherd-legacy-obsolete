#!/usr/bin/env bash
echo Building ./$1
(cd ./$1 && npm install && npm run build)