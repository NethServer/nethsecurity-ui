import os
import glob
import base64
import asyncio
import socket
import urllib
import os.path
import hashlib
import logging
import ipaddress
import subprocess
from datetime import timedelta

from flask import Flask, json, request, jsonify
from flask_jwt_extended import create_access_token
from flask_jwt_extended import create_refresh_token
from flask_jwt_extended import get_jwt_identity
from flask_jwt_extended import get_jwt
from flask_jwt_extended import jwt_required
from flask_jwt_extended import JWTManager
from flask_cors import CORS

from gevent.pywsgi import WSGIServer

odir = "/etc/openvpn"
cdir = f"{odir}/ccd"
pdir = f"{odir}/proxy"
kdir = f"{odir}/pki"
cfile = f"{odir}/credentials.json"
mgmt_sock = f"{odir}/run/mgmt.sock"
network = os.environ.get('OVPN_NETWORK', '172.21.0.0')
netmask =  os.environ.get('OVPN_NETMASK', '255.255.0.0')
ovpn_udp_port = os.environ.get('OVPN_UDP_PORT', 1194)
fqdn = os.environ.get('FQDN', socket.getfqdn())
admin_username = os.environ.get('API_USER', 'admin')
admin_password = os.environ.get('API_PASSWORD', hashlib.sha256('admin'.encode('utf-8')).hexdigest())
secret = os.environ.get('API_SECRET', 'secret')
debug = os.environ.get('API_DEBUG', False)
bind_port = int(os.environ.get('API_PORT', 5000))
bind_ip = os.environ.get('API_BIND_IP', '127.0.0.1')
session_duration = os.environ.get('API_SESSION_DURATION', 3600*24*7) # 7 days
proxy_port = os.environ.get('PROXY_PORT', 8080)

# Load credentials on start
if os.path.isfile(cfile):
    with open(cfile, 'r') as fp:
        credentials = json.load(fp)
else:
    credentials = dict()

# Reset waiting and jwt_blocklist list on each start
waiting_list = dict()
jwt_blocklist = dict()

api = Flask(__name__)
access_expire = timedelta(hours=1)
api.config['JWT_SECRET_KEY'] = secret
api.config["JWT_ACCESS_TOKEN_EXPIRES"] = access_expire
api.config["JWT_REFRESH_TOKEN_EXPIRES"] = timedelta(seconds=session_duration)
if debug:
    api.logger.setLevel(logging.DEBUG)
    cors = CORS(api)
jwt = JWTManager(api)

api.logger.debug(f'server_credentials: {credentials}')

#
# General functions
#

def save_credentials():
    with open(cfile, 'w') as fp:
        json.dump(credentials, fp)

def update_server_credentials(name, username, password):
    api.logger.debug(f'update_server_credentials: trying to update {name} {username} {password}')
    # update only if username matches or the server is not yet registered
    if (not name in credentials) or (name in credentials and credentials[name][0] == username):
        api.logger.debug(f'update_server_credentials: updating {name}')
        credentials[name] = [username, password]
        save_credentials()
        return True
    else:
        api.logger.debug(f'update_server_credentials: not updating {name}')
        return False

def add_server_credentials(name, username, password):
    api.logger.debug(f'add_server_credentials: trying to add {name} {username} {password}')
    if name in credentials:
        api.logger.debug(f'add_server_credentials: failed to add {name}')
        return False
    credentials[name] = [username, password]
    save_credentials()
    api.logger.debug(f'add_server_credentials: added {name}')
    return True

def read_cert(filename):
    lines = ''
    with open(filename, 'r') as fp:
        lines = fp.readlines()
    return ''.join(lines)

def read_ca():
    return read_cert(f'{kdir}/ca.crt')

def generate_certificate(name):
    env = {"EASYRSA_BATCH": "1", "EASYRSA_REQ_CN": name, "EASYRSA_PKI": kdir}
    subprocess.run(["/usr/share/easy-rsa/easyrsa", "gen-req", name, "nopass"], env=env, check=True)
    subprocess.run(["/usr/share/easy-rsa/easyrsa", "sign-req", "client", name], env=env, check=True)

def revoke_certificate(name):
    env = {"EASYRSA_BATCH": "1", "EASYRSA_PKI": kdir}
    subprocess.run(["/usr/share/easy-rsa/easyrsa", "revoke", name], env=env, check=True)
    subprocess.run(["/usr/share/easy-rsa/easyrsa", "gen-crl"], env=env, check=True)

async def delete_vpn_client(name):
    reader, writer = await asyncio.open_unix_connection(mgmt_sock)
    greetings = await reader.readline()
    writer.write(f'kill {name}\n'.encode())
    writer.close()

async def list_vpn_clients():
    clients = {}
    reader, writer = await asyncio.open_unix_connection(mgmt_sock)
    greetings = await reader.readline()
    writer.write('status 3\n'.encode())

    while True:
        line = await reader.readline()
        if line.decode().rstrip() == 'END' or not line:
            break
        else:
            if line.decode().startswith('CLIENT_LIST'):
                fields = line.decode().split('\t')
                clients[fields[1]] = {'real_address': fields[2],
                        'virtual_address': fields[3],
                        'bytes_rcvd': fields[5],
                        'bytes_sent': fields[6],
                        'connected_since': fields[8]}

    writer.close()
    return clients

def list_servers():
    servers = []
    vpn_clients = asyncio.run(list_vpn_clients())
    api.logger.debug(f'list_servers: vpn_clients={vpn_clients}')

    for name in glob.glob(f'{cdir}/*'):
        sname=os.path.basename(name)
        with open(name, 'r') as fp:
            try:
                line = fp.read().rstrip()
                (cmd, ip, mask) = line.split(' ')
                servers.append({'name': sname, 'ipaddress': ip, 'netmask': mask, 'registered': True, 'vpn': vpn_clients.get(sname)})
            except:
                pass
    for server in waiting_list.keys():
        servers.append({'name': server, 'ipaddress': '', 'netmask': '', 'registered': False, 'vpn': None})
    return servers

def get_vpn_config(name):
    crt = f'{kdir}/issued/{name}.crt'
    key = f'{kdir}/private/{name}.key'

    if not os.path.isfile(crt):
        return None

    token = dict()
    token['host'] = fqdn
    token['port'] = ovpn_udp_port
    token['ca'] = read_ca()
    token['cert'] = read_cert(crt)
    token['key'] = read_cert(key)

    return token

#
# JWT APIs
#

@api.route("/login", methods=["POST"])
def login():
    username = request.json.get("username", None)
    password = request.json.get("password", None)

    hpass = hashlib.sha256(password.encode('utf-8')).hexdigest()
    if username == admin_username and admin_password == hpass:
        access_token = create_access_token(identity=username)
        refresh_token = create_refresh_token(identity=username)
        return jsonify(access_token=access_token, refresh_token=refresh_token)
    else:
        return jsonify({"success": "False", "reason": "Bad username or password"}), 401

@api.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    identity = get_jwt_identity()
    access_token = create_access_token(identity=identity)
    return jsonify(access_token=access_token)

@api.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    jti = get_jwt()["jti"]
    jwt_blocklist[jti] = access_expire
    return jsonify(msg="Access token revoked")

@jwt.token_in_blocklist_loader
def check_if_token_is_revoked(jwt_header, jwt_payload: dict):
    jti = jwt_payload["jti"]
    blocked_token = jwt_blocklist.get(jti)
    return blocked_token is not None

#
# Authenticated APIs
#

@api.route('/servers', methods=['GET'])
@jwt_required()
def get_servers():
    return json.dumps(list_servers())

@api.route('/servers/<name>', methods=['DELETE'])
@jwt_required()
def delete_server(name):
    # Kill existing VPN connection
    asyncio.run(delete_vpn_client(name))

    # Delete traefik config, reservation/auth file and revoke certificate
    revoke_certificate(name)
    if os.path.isfile(f'{cdir}/{name}'):
        os.unlink(f'{cdir}/{name}')
    if os.path.isfile('{pdir}/{name}.yaml'):
        os.unlink(f'{pdir}/{name}.yaml')

    return json.dumps({'success': True})

@api.route('/servers', methods=['POST'])
@jwt_required()
def add_server():
    data = request.json
    name = data['name']
    # Check for duplicates
    if os.path.isfile(f'{cdir}/{name}'):
        return json.dumps({'success': False, 'reason': 'Duplicate name'}), 409

    net = ipaddress.IPv4Network(f'{network}/{netmask}')
    used_ips = []
    free_ip = ''
    for server in list_servers():
        used_ips.append(server['ipaddress'])
    hosts = net.hosts()
    # Skip first IP reserved for tun device
    next(hosts)
    for host in hosts:
        if str(host) not in used_ips:
            free_ip = str(host)
            break

    if not free_ip:
        return json.dumps({'success': False}), 500
    else:
        generate_certificate(name)
        if not os.path.isdir(cdir):
            os.makedirs()
        with open(f'{cdir}/{name}', 'w') as fp:
            fp.write(f'ifconfig-push {free_ip} {netmask}\n')

        if name in waiting_list:
            cred = waiting_list.pop(name)
            add_server_credentials(name, cred[0], cred[1])

        return json.dumps({'ipaddress': free_ip})

@api.route('/servers/token', methods=['POST'])
@jwt_required()
def get_server_token():
    data = request.json
    name = data['name']
    if name not in credentials:
        return json.dumps({"success": "false", "reason": "Credentials not found"}), 404
    (suser, spwd) = credentials[name]
    payload = {"id": 1, "method": "login", "params": [suser, spwd]}
    data = json.dumps(payload)
    req =  urllib.request.Request(f"http://localhost:{proxy_port}/{name}/cgi-bin/luci/rpc/auth", data=data.encode('utf-8'))
    api.logger.debug(f'login_server: login to "http://localhost:{proxy_port}/{name}/cgi-bin/luci/rpc/auth" with {suser}/{spwd}')
    resp = json.loads(urllib.request.urlopen(req).read())
    api.logger.debug(f'login_server: response {resp}')
    return json.dumps({"token": resp["result"]})

#
# APIs without authentication
#

@api.route('/servers/register', methods=['POST'])
def register():
    data = request.json
    api.logger.debug(f'register: {data}')
    vpn_config = get_vpn_config(data["system_id"])
    # System not yet registered, put it inside the waiting list
    if not vpn_config:
        waiting_list[data["system_id"]] = [data["username"], data["password"]]
        return json.dumps({'success': False, "reason": "Added to waiting list"}), 403
    # System already registered, return VPN config
    else:
        # System has updated password, just save it
        update_server_credentials(data["system_id"], data["username"], data["password"])
        return json.dumps(vpn_config)


if __name__ == '__main__':
    http_server = WSGIServer((bind_ip, bind_port), api)
    http_server.serve_forever()
