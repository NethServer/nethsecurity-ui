#!/bin/sh

CONFIG_DIR=/etc/openvpn/proxy/

port=${PROXY_PORT:-8080}
ip=${PROXY_BIND_IP:-0.0.0.0}

if [ ! -d $CONFIG_DIR ]; then
    mkdir -p $CONFIG_DIR
fi

cat <<EOF > /config.yaml
entryPoints:
  web:
   address: "$ip:$port"

accessLog: {}

providers:
  file:
    directory: $CONFIG_DIR
    watch: true

serversTransport:
  insecureSkipVerify: true

EOF

exec "$@"
