#!/bin/bash
set -e

mkdir -p -m 777 /installmount/.shepherd-scripts

install -m 777 ./external-bin/* /installmount/.shepherd-scripts

