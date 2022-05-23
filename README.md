# nextsecurity-controller

The controller (server) is a set of containers that allow the admin to remotely manage multiple NextSecurity installations (firewalls).

Firewalls are registered to the server. Upon registration the server will:
- create a VPN configuration which is sent back to the firewall
- create a route inside the proxy to access the firewall Luci RPC
- store credentials to access the remote firewall

## Quickstart

First, make sure to have [podman](https://podman.io/) installed on your server.
Then clone this repository and execute as root:
```
./start.sh
```

The server will be available at ``http://<fqdn>:8080/ui`.

## How it works

General workflow without waiting list:

- access the controller and add a new machine using the `add` API below
- connect the NextSecurity and execute `/etc/init.d/ns-plug start`
- go back to the controller and retrieve a token for the NextSecurity: `curl http://localhost:8080/api/servers/login/clientX`,
  use the token to invoke luci APIs: `curl http://localhost:8080/clientX/cgi-bin/luci/rpc/...`

General workflow with waiting list:

- connect the NextSecurity and execute `/etc/init.d/ns-plug start`
- access the controller and check the list of waiting clients `curl http://localhost:8080/api/servers` (JWT auth is required)
- add the client using the `add` API below
- retrieve a token for the NextSecurity: `curl http://localhost:8080/api/servers/login/clientX`,
  use the token to invoke luci APIs: `curl http://localhost:8080/clientX/cgi-bin/luci/rpc/...`

### Services

The controller is composed by 4 services:
- nextsec-vpn: OpenVPN server, it authenticates the machines and create routes for the proxy, it listens on port 1194
- nextsec-proxy: traefik forwards requests to the connected machines using the machine name as path prefix, it listens on port 8181
- nextsec-api: REST API python server to manage nextsec-vpn clients, it listens on port 5000
- nextsec-ui: lighttpd instance serving static UI files, it listens on port 3000

## Environment configuration

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
- `API_SESSION_DURATION`: JWT session duration in seconds, default is 7 days
- `UI_BIND_IP`: UI binding IP, default is `0.0.0.0`
- `PROXY_PORT`: proxy listening port, default is `8080`
- `PROXY_BIND_IP`: proxy binding IP, default is `0.0.0.0`

## REST API

Manage server registrations using the REST API server.
Request should be sent to the proxy server.

Almost all APIs are authenticated using [JWT](https://flask-jwt-extended.readthedocs.io/en/stable/).

Authentication workflow:

1. send user name and password to `/login` API
2. retrive authorization tokens:
   - `access_token`: it's the token used to executed all APIs, it expires after an hour
   - `refresh_token`: this token can be used only to call the `/refresh` API and request a new `access_token`, it expires after `API_SESSION_DURATION` seconds (default to 7 days) 
3. invoke other APIs by setting the header `Authorization: Bearer <access_token>"`

Unauthenticated APIs:

- `/login`: execute the login and retrieve the tokens
- `/register`: invoked by firewalls to register themselvs, this API should be always invoked using a valid HTTPS endpoint to
  ensure the identity of the server

### /login - POST

Execute the login and return `access_token` and `refresh_token`.

Example:
```
curl -s http://localhost:8080/api/login -X POST -H 'Content-Type: application/json' --data '{"username": "admin", "password": "admin"}'
```

Response:
```json
{
  "access_token": "eyJ0xxxxxxxxxxxxxxxxxxxxxxxx",
  "refresh_token": "ererexxxxxxxxxxxxxxxxxxxxxxxx",
}
```

### /refresh - POST

Refresh the access token.
This API is authenticated using the `refresh_token`.

Example:
```
curl http://localhost:8080/api/refresh -H "Content-Type: application/json" -X POST -H "Authorization: Bearer <refresh_token>"
```

Response:
```json
{
  "access_token": "eyJ0xxxxxxxxxxxxxxxxxxxxxxxx",
}
```

### /logout - POST

Execute the logout by putting the token inside the internal blacklist.
This API is authenticated using the `refresh_token`.

Example:
```
curl http://localhost:8080/api/refresh -H "Content-Type: application/json" -X POST -H "Authorization: Bearer <access_token>"
```

Response:
```json
{"msg":"Access token revoked"}
```


### /servers/list - GET

List existing servers (firewalls).
If the `registerd` flag is false, the firewall is in waiting list.

This API is authenticated using the `access_token`.

Example:
```
curl http://localhost:8080/api/servers
[{"ipaddress": "172.21.0.22", "name": "client1", "netmask": "255.255.0.0", "registerd": true}]r
```

### /servers/add/_name_ - POST

Add a new server to the VPN and proxy configuration.
It also reserves a new IP address.

This API is authenticated using the `access_token`.

Example:
```
curl http://localhost:8080/api/servers/add/t1 -X POST
{"ipaddress": "172.21.0.2"}
```

This will create a file inside `/etc/openvpn/ccd/<client_name>` containing:
```
ifconfig-push 172.21.0.2 255.255.0.0
```

If the file named `/etc/openvpn/ccd/<client_name>` doesn't exists, the client authentication will fail.

### /servers/delete/_name_ - POST

Delete an existing server.

This API is authenticated using the `access_token`.

Example:
```
curl http://localhost:8080/api/servers/delete/t1 -X POST
```

### /servers/token/_name_ - POST

Login to server Luci instance and return the token.
The token can be then used to execute API calls directly to Luci.

This API is authenticated using the `access_token`.

Example:
```
curl http://localhost:8080/api/servers/login/client1 -X POST
```

Response:
```
{"token": "xxxxxxxxxxx"}
```

### /servers/register - POST

This API is invoked by firewall to register themselves to the controller.
This API is *not* authenticated.

If the firewall is already registered, the server will check for `system_id` and `username`;
if they match, the password will be updated and the VPN configuration returned to firewall.

If the firwall is not registered, it will be added to the waiting list and the server will return a 403 HTTP error code.
The firewall can continue to poll the same endpoint until the admin approves the systemd_id inside the waiting list.

Example:
```
curl http://localhost:8080/api/servers/register -X POST --data '{"system_id": "12345", "username": "random_user", "password": "random_password"}
```

Response:
```json
{
  "ca": "-----BEGIN CERTIFICATE-----\nMIIiUwbffWYrN\nfs....tkItNbKbA==\n-----END CERTIFICATE-----\n",
  "cert": "Certificate.......-----BEGIN CERTIFICATE-----\nMIIDSz....==\n-----END CERTIFICATE-----\n",
  "host": "controller.nethserver.org",
  "key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg....kqj...ernr0M=\n-----END PRIVATE KEY-----\n",
  "port": 1194
}
```

## Build

Requirements:
- [podman](https://podman.io/)
- [buildah](https://buildah.io/)

To build the image, use:
```
./build.sh
```

To load the UI from a local dir, use:
```
./start.sh <ui_path>
```

Every time a commit us pushed to the master, a Github actions will automatically build new images.
