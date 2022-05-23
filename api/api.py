import os
import glob
import base64
import socket
import urllib
import os.path
import hashlib
import logging
import ipaddress
import subprocess
from flask import Flask, json, request
from flask_jwt import JWT, jwt_required, current_identity

odir = "/etc/openvpn"
cdir = f"{odir}/ccd"
pdir = f"{odir}/proxy"
kdir = f"{odir}/pki"
network = os.environ.get('OVPN_NETWORK', '172.21.0.0')
netmask =  os.environ.get('OVPN_NETMASK', '255.255.0.0')
ovpn_udp_port = os.environ.get('OVPN_UDP_PORT', 1194)
ovpn_mgmt_port = os.environ.get('OVPN_MGMT_PORT', 1175)
fqdn = os.environ.get('FQDN', socket.getfqdn())
admin_username = os.environ.get('API_USER', 'admin')
admin_password = os.environ.get('API_PASSWORD', hashlib.sha256('admin'.encode('utf-8')).hexdigest())
secret = os.environ.get('API_SECRET', 'secret')
debug = os.environ.get('API_DEBUG', False)
proxy_port = os.environ.get('PROXY_PORT', 8080)

class User(object):
    def __init__(self, id, username, password):
        self.id = id
        self.username = username
        self.password = password

    def __str__(self):
        return "User(id='%s')" % self.id

def authenticate(username, password):
    hpass = hashlib.sha256(password.encode('utf-8')).hexdigest()
    if username == admin_username and admin_password == hpass:
        return User(1, username, password)

def identity(payload):
    user_id = payload['identity']
    return User(user_id, 'admin', '')

# Load credentials on start
if os.path.isfile('credentials.json'):
    with open('credentials.json', 'r') as fp:
        credentials = json.load(fp)
else:
    credentials = dict()

# Reset waiting list on each start
waiting_list = dict()

api = Flask(__name__)
api.config['SECRET_KEY'] = secret
if debug:
    api.logger.setLevel(logging.DEBUG)
jwt = JWT(api, authenticate, identity)

api.logger.debug(f'server_credentials: {credentials}')

#
# General functions
#

def save_credentials():
    with open('credentials.json', 'w') as fp:
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

def list_servers():
    servers = []
    for name in glob.glob(f'{cdir}/*'):
        sname=os.path.basename(name)
        with open(name, 'r') as fp:
            try:
                line = fp.read().rstrip()
                (cmd, ip, mask) = line.split(' ')
                servers.append({'name': sname, 'ipaddress': ip, 'netmask': mask, 'registered': True})
            except:
                pass
    for server in waiting_list.keys():
        servers.append({'name': server, 'ipaddress': '', 'netmask': '', 'registered': False})
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
# Authenticated APIs
#

@api.route('/servers', methods=['GET'])
@jwt_required()
def get_servers():
    return json.dumps(list_servers())

@api.route('/servers/delete/<name>', methods=['POST'])
@jwt_required()
def delete_server(name):

    # Kill existing VPN connection
    cmd = f'kill {name}'
    cs = socket.create_connection(("localhost",ovpn_mgmt_port));
    cs.send(cmd.encode())
    cs.close()

    # Delete traefik config, reservation/auth file and revoke certificate
    revoke_certificate(name)
    if os.path.isfile(f'{cdir}/{name}'):
        os.unlink(f'{cdir}/{name}')
    if os.path.isfile('{pdir}/{name}.yaml'):
        os.unlink(f'{pdir}/{name}.yaml')

    return json.dumps({'success': True})

@api.route('/servers/add/<name>', methods=['POST'])
@jwt_required()
def add_server(name):
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

@api.route('/servers/login/<name>', methods=['POST'])
@jwt_required()
def login_server(name):
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
    api.run() 
