import os
import glob
import base64
import socket
import os.path
import ipaddress
import subprocess
from flask import Flask, json, request

odir = "/etc/openvpn"
cdir = f"{odir}/ccd"
pdir = f"{odir}/proxy"
kdir = f"{odir}/pki"
network = os.environ.get('NETWORK', '172.21.0.0')
netmask =  os.environ.get('NETMASK', '255.255.0.0')
port = os.environ.get('PORT', 1194)
mport = os.environ.get('MPORT', 1175)
fqdn = os.environ.get('FQDN', socket.getfqdn())

api = Flask(__name__)

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
                servers.append({'name': sname, 'ipaddress': ip, 'netmask': mask})
            except:
                pass
    return servers

@api.route('/servers', methods=['GET'])
def get_servers():
    return json.dumps(list_servers())

@api.route('/servers/delete/<name>', methods=['POST'])
def delete_server(name):

    # Kill existing VPN connection
    cmd = f'kill {name}'
    cs = socket.create_connection(("localhost",mport));
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

        return json.dumps({'ipaddress': free_ip})

@api.route('/servers/config/<name>', methods=['GET'])
def server_config(name):
    ca = read_ca()
    config = ( 
            f'client\n'
            f'server-poll-timeout 5\n'
            f'nobind\n'
            f'float\n'
            f'explicit-exit-notify 1\n'
            f'remote {fqdn} {port} udp\n'
            f'dev tun{name}\n'
            f'tls-client\n'
            f'auth-nocache\n'
            f'auth-user-pass credentials\n'
            f'<ca>\n'
            f'{ca}\n'
            f'</ca>\n'
            f'auth-nocache\n'
            f'verb 3\n'
            f'persist-key\n'
            f'compress lz4\n'
            )
    return config

@api.route('/servers/token/<name>', methods=['GET'])
def get_token(name):
    encoded = request.args.get('encoded') or False
    crt = f'{kdir}/issued/{name}.crt'
    key = f'{kdir}/private/{name}.key'

    if not os.path.isfile(crt):
        return json.dumps({'success': False}), 403

    token = dict()
    token['host'] = fqdn
    token['port'] = port
    token['ca'] = read_ca()
    token['cert'] = read_cert(crt)
    token['key'] = read_cert(key)

    if encoded:
        return base64.b64encode(json.dumps(token).encode())
    else:
        return json.dumps(token)


if __name__ == '__main__':
    api.run() 
