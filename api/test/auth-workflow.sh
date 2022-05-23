#!/bin/bash

set -e

HOST=${1-"localhost:8080"}
USER=${2-"admin"}
PASS=${3-"admin"}

data=$(curl -s --fail http://$HOST/api/login -X POST -H "Content-Type: application/json" --data '{"username": "'$USER'", "password": "'$PASS'"}')
access_token=$(echo $data | jq -r .access_token)
refresh_token=$(echo $data | jq -r .refresh_token)

if [[ ! -z "$access_token" && ! -z "$refresh_token" ]]; then
    echo "login: ok"
fi

curl -s --fail http://$HOST/api/servers -H "Content-Type: application/json" -H "Authorization: Bearer $access_token" -o /dev/null
echo "list_servers: ok"

access_token=$(curl -s --fail http://$HOST/api/refresh -H "Content-Type: application/json" -X POST -H "Authorization: Bearer $refresh_token" | jq -r .access_token)
echo "refreshed access_token: ok"
curl -s --fail http://$HOST/api/servers -H "Content-Type: application/json" -H "Authorization: Bearer $access_token" -o /dev/null
echo "list_servers new access token: ok"

msg=$(curl -s --fail http://$HOST/api/logout -H "Content-Type: application/json" -X POST -H "Authorization: Bearer $access_token" | jq -r .msg)
if [ "$msg" == "Access token revoked" ]; then
    echo "logout: ok"
fi

msg=$(curl -s http://$HOST/api/servers -H "Content-Type: application/json" -H "Authorization: Bearer $access_token" | jq -r .msg)
if [ "$msg" == "Token has been revoked" ]; then
    echo "revoke: ok"
fi
