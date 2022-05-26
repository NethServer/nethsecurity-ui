#!/bin/sh

CONFIG_DIR=/etc/openvpn/proxy/

port=${PROXY_PORT:-8080}
ip=${PROXY_BIND_IP:-0.0.0.0}
ui_port=${UI_PORT:-3000}
api_port=${API_PORT:-5000}

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
        - url: http://127.0.0.1:${api_port}/
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
      rule: PathPrefix(\`/ui\`) || Path(\`/\`)

  # Add the service
  services:
    service-ui:
      loadBalancer:
        servers:
        - url: http://127.0.0.1:${ui_port}/
        passHostHeader: true

  # Add middleware
  middlewares:
exec "$@"
