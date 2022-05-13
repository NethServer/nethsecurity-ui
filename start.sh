#!/bin/bash

vopts=""
if [ -d  $1 ]; then
    path=$(readlink -f $1)
    vopts="-v $path:/var/www/localhost/htdocs"
fi

POD=${POD-nextsec-pod}

podman pod stop $POD
podman pod rm $POD

podman pod create --replace --name $POD
podman run --rm --detach --network=host --cap-add=NET_ADMIN --device /dev/net/tun -v ovpn-data:/etc/openvpn/:z --pod $POD --name $POD-vpn  ghcr.io/nethserver/nextsec-vpn:latest
podman run --rm --detach --network=host --volumes-from=$POD-vpn --pod $POD --name $POD-proxy docker.io/library/traefik:v2.6 --providers.file.directory=/etc/openvpn/proxy/ --providers.file.watch=true --serversTransport.insecureSkipVerify=true --entryPoints.web.address=:8181 --accesslog=true --log.level=DEBUG
podman run --rm --detach --network=host --volumes-from=$POD-vpn --pod $POD --name $POD-api  ghcr.io/nethserver/nextsec-api:latest
podman run --rm --detach --network=host --pod $POD --name $POD-ui $vopts ghcr.io/nethserver/nextsec-ui:latest

