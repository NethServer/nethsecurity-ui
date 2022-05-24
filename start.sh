#!/bin/bash

vopts=""
if [[ ! -z "$1" && -d "$1" ]]; then
    path=$(readlink -f $1)
    vopts="-v $path:/var/www/localhost/htdocs"
fi

POD=${POD-nextsec-pod}

podman pod stop $POD
podman pod rm $POD

touch credentials.json
podman pod create --replace --name $POD
podman run --rm --detach --network=host --cap-add=NET_ADMIN --device /dev/net/tun -v ovpn-data:/etc/openvpn/:z --pod $POD --name $POD-vpn  ghcr.io/nethserver/nextsec-vpn:latest
podman run --rm --detach --network=host --volumes-from=$POD-vpn --pod $POD --name $POD-api -e API_DEBUG=1 -e FQDN=$(hostname -f) ghcr.io/nethserver/nextsec-api:latest
podman run --rm --detach --network=host --pod $POD --name $POD-ui $vopts ghcr.io/nethserver/nextsec-ui:latest
sleep 2
podman run --rm --detach --network=host --volumes-from=$POD-vpn --pod $POD --name $POD-proxy ghcr.io/nethserver/nextsec-proxy:latest
