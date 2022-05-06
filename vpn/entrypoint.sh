#!/bin/sh

set -e

ovpn_network=${NETWORK:-172.21.0.0}
ovpn_netmask=${NETMASK:-255.255.0.0}
cn=${CN:-nextsec}
port=${PORT:-1194}
mport=${MPORT:-1175}

if [ ! -f /etc/openvpn/pki/ca.crt ]; then
    cd /etc/openvpn
    EASYRSA_BATCH=1 /usr/share/easy-rsa/easyrsa init-pki
    EASYRSA_BATCH=1 EASYRSA_REQ_CN=$cn /usr/share/easy-rsa/easyrsa build-ca nopass
    EASYRSA_BATCH=1 EASYRSA_REQ_CN=$cn /usr/share/easy-rsa/easyrsa gen-dh
    EASYRSA_BATCH=1 EASYRSA_REQ_CN=$cn /usr/share/easy-rsa/easyrsa build-server-full server nopass
    cd -
fi

if [ ! -d /etc/openvpn/ccd ]; then
    mkdir -p /etc/openvpn/ccd
fi

if [ ! -d /etc/openvpn/proxy ]; then
    mkdir -p /etc/openvpn/proxy
fi

cat << EOF > /etc/openvpn/server.conf
dev tun$cn
server $ovpn_network $ovpn_netmask
push "route $ovpn_network $ovpn_netmask"

topology subnet
client-config-dir /etc/openvpn/ccd

ifconfig-pool-persist host-to-net.pool 0

port $port
script-security 3
float
multihome

tls-server
remote-cert-tls server
dh /etc/openvpn/pki/dh.pem
ca /etc/openvpn/pki/ca.crt
cert /etc/openvpn/pki/issued/server.crt
key /etc/openvpn/pki/private/server.key

auth-user-pass-verify /usr/local/bin/controller-auth via-env
client-connect /usr/local/bin/add-proxy-path

verify-client-cert none
username-as-common-name

management localhost $mport

compress lz4
errors-to-stderr
keepalive 20 120
persist-key
persist-tun
verb 3
EOF


cat << EOF > /etc/openvpn/proxy/api.yaml
http:
  # Add the router
  routers:
    routerapi:
      entryPoints:
      - web
      middlewares:
      - mapi-stripprefix
      service: service-api
      rule: PathPrefix(\`/api\`)

  # Add the service
  services:
    service-api:
      loadBalancer:
        servers:
        - url: http://127.0.0.1:5000/
        passHostHeader: true

  # Add middleware
  middlewares:
    mapi-stripprefix:
      stripPrefix:
        prefixes:
          - "/api"
EOF

cat << EOF > /etc/openvpn/proxy/ui.yaml
http:
  # Add the router
  routers:
    routerui:
      entryPoints:
      - web
      middlewares:
      - mui-stripprefix
      service: service-ui
      rule: PathPrefix(\`/ui\`)

  # Add the service
  services:
    service-ui:
      loadBalancer:
        servers:
        - url: http://127.0.0.1:3000/
        passHostHeader: true

  # Add middleware
  middlewares:
    mui-stripprefix:
      stripPrefix:
        prefixes:
          - "/ui"
EOF


exec "$@"
