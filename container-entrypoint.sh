#!/bin/bash

if [[ -z "$1" ]]; then
    echo "Missing parameter: append 'dev' or 'build'"
elif [[ "$1" = "dev" ]]; then
    npm install && npm run dev
elif [[ "$1" == "build" ]]; then
    npm install && npm run build
else
    echo "Parameter not recognized: '$1'. Only 'dev' or 'build'"
fi
