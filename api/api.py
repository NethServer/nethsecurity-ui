import os
import glob
import os.path
import socket
import ipaddress
from flask import Flask, json, render_template

odir = "/etc/openvpn"
cdir = f"{odir}/ccd"
pdir = f"{odir}/proxy"
network = os.environ.get('NETWORK', '172.21.0.0')
netmask =  os.environ.get('NETMASK', '255.255.0.0')
port = os.environ.get('PORT', 1194)
mport = os.environ.get('MPORT', 1175)
fqdn = os.environ.get('FQDN', socket.getfqdn())

api = Flask(__name__)

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
    cs = socket.socket(socket.AF_INET, socket.SOCK_STREAM);
    cs.connect(("127.0.0.1",mport));
    cs.send(cmd.encode())
    cs.close()

    # Delete traefik config and reservation/auth file
    try:
        os.unlink(f'{cdir}/{name}')
        os.unlink(f'{pdir}/{name}.yaml')
    except:
        pass

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
        return json.dumps({'success': False}, 500)
    else:
        with open(f'{cdir}/{name}', 'w') as fp:
            fp.write(f'ifconfig-push {free_ip} {netmask}\n')

        return json.dumps({'ipaddress': free_ip})

@api.route('/servers/config/<name>', methods=['GET'])
def server_config(name):
    lines = ''
    with open('/etc/openvpn/pki/ca.crt', 'r') as fp:
        lines = fp.readlines()

    ca = ''.join(lines)
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

if __name__ == '__main__':
    api.run() 
