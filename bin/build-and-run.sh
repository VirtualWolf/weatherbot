#!/bin/bash

if [[ $# -eq 0  ]] ; then
    echo "Usage: build-and-run.sh /path/to/config.json"
    exit 1
fi

docker stop -t 0 weatherbot
docker rm weatherbot
docker build -t virtualwolf/weatherbot:latest .
./bin/run.sh $1
