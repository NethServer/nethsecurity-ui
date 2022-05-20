#!/bin/bash

HOST=${1-"localhost:8080"}
USER=${2-"admin"}
PASS=${3-"admin"}
SERVER=$4

token=$(curl -s http://$HOST/api/auth -X POST -H "Content-Type: application/json" --data '{"username": "'$USER'", "password": "'$PASS'"}' | jq -r .access_token)

curl http://$HOST/api/servers/add/$SERVER -H "Content-Type: application/json" -H "Authorization: JWT $token" -X POST

