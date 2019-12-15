#!/bin/bash
if [[ $# -eq 0  ]] ; then
    echo "Usage: run.sh /path/to/config.json"
    exit 1
fi

docker run \
    --restart unless-stopped \
    --volume $1:/opt/service/config.json \
    --name weatherbot \
    virtualwolf/weatherbot:latest
