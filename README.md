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

General workflow:

- access the server and add a new machine using the `add` API below
- access connect the NextSecurity and create the OpenVPN configuration, then start the VPN on the machine
- go back to server and invoke luci APIs: `curl http://localhost:8181/clientX/..`



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

## Add a server

Execute the `add` API below, then create the OpenVPN client configuration inside NextSecurity.

NextSecurity client configuration example:
```
client
server-poll-timeout 5
nobind
float
explicit-exit-notify 1
remote nextsec-pod 1194 udp
dev tclient1
tls-client
auth-nocache
auth-user-pass credentials
<ca>
-----BEGIN CERTIFICATE-----
58uE415umte3FL0hyTvztIHNSqu1bRUU03KJSlMLIczfMDC8ykdr3K8uZ1kAM1mh
...
-----END CERTIFICATE-----
</ca>
auth-nocache
verb 3
persist-key
compress lz4
```
