# nextsecurity-controller

Requirements:
- podman
- buildah

To build the image, use:
```
./build.sh
```

To run the stack:
```
./start.sh
```

To load the UI from a local dir, use:
```
./start.sh <ui_path>
```

## How it works

Services:
- nextsec-vpn: OpenVPN server, it authenticates the machines and create routes for the proxy, it listens on port 1194
- nextsec-proxy: traefik forwards requests to the connected machines using the machine name as path prefix, it listens on port 8181
- nextsec-api: REST API python server to manage nextsec-vpn clients, it listens on port 5000
- nextsec-ui: lighttpd instance serving static UI files, it listens on port 3000

Temporary UI available at: `http://<fqdn>:8181/ui`.

After a client is connected to the VPN, you can execute remote luci API:
```
curl http://localhost:8181/<client_name>/<luci_rpc_path>
```

Example:
```
curl -k http://localhost:8181/client1/cgi-bin/luci/rpc/auth --data '{ "id": 1, "method": "login", "params": ["root", "Nethesis,1234"]}'
```

General workflow without waiting list:

- access the controller and add a new machine using the `add` API below
- connect the NextSecurity and execute `/etc/init.d/ns-plug start`
- go back to the controller and retrieve a token for the NextSecurity: `curl http://localhost:8080/api/servers/login/clientX`,
  use the token to invoke luci APIs: `curl http://localhost:8080/clientX/cgi-bin/luci/rpc/...`

General workflow with waiting list:
- connect the NextSecurity and execute `/etc/init.d/ns-plug start`
- access the controller and check the list of waiting clients `curl http://localhost:8080/api/servers/list` (JWT auth is required)
- add the client using the `add` API below
- retrieve a token for the NextSecurity: `curl http://localhost:8080/api/servers/login/clientX`,
  use the token to invoke luci APIs: `curl http://localhost:8080/clientX/cgi-bin/luci/rpc/...`

### Environment configuration

The following environment variables can be used to configure the containers:

- `FQDN`: default is the container/pod hostname
- `OVPN_NETWORK`: OpenVPN network, default is `172.21.0.0`
- `OVPN_NETMASK`: OpenVPN netmask, default is `255.255.0.0`
- `OVPN_CN`: OpenVPN certificate CN, default is `nextsec`
- `OVPN_UDP_PORT`: OpenVPN UDP port, default is `1194`
- `OVPN_MGMT_PORT`: OpenVPN TCP managament port, default is `1175`
- `OVPN_TUN`: OpenVPN tun device name, default is `tunsec`
- `API_PORT`: API server listening port, default is `5000`
- `UI_PORT`: UI listening port, default is `3000`
- `API_USER`: controller admin user, default is `admin`
- `API_PASSWORD`: controller admin password, it must be passed as SHA56SUM, default is `admin`
- `API_SECRET`: JWT secret token
- `API_DEBUG`: enable the debug if set to `1`, default is `0`
- `UI_BIND_IP`: UI binding IP, default is `0.0.0.0`
- `PROXY_PORT`: proxy listening port, default is `8080`
- `PROXY_BIND_IP`: proxy binding IP, default is `0.0.0.0`

## REST API

Manage server registrations using the REST API server.

### list

List servers:
```
curl http://localhost:5000/servers
[{"ipaddress": "172.21.0.22", "name": "client1", "netmask": "255.255.0.0"}]r
```

### add

Register a new server:
```
curl http://localhost:5000/servers/add/t1 -X POST
{"ipaddress": "172.21.0.2"}
```

This will create a file inside `/etc/openvpn/ccd/<client_name>` containing:
```
ifconfig-push 172.21.0.2 255.255.0.0
```

If the file named `/etc/openvpn/ccd/<client_name>` doesn't exists, the client authentication will fail.

### delete

Delete an existing server:
```
curl http://localhost:5000/servers/delete/t1 -X POST
```

### config

Get VPN client config:
```
curl http://localhost:5000/servers/config/client1
```

### login

Login to server Luci instance and return the token.
The token can be then used to execute API calls directly to Luci.

Example:
```
curl http://localhost:5000/servers/login/client1
```

Response:
```
{"token": "xxxxxxxxxxx"}
```

