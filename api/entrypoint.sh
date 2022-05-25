#!/bin/sh

mkdir -p /etc/openvpn/sockets

cd /nextsec-api
source /nextsec-api/bin/activate

exec python3 api.py
