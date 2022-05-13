#!/bin/bash
set -e

repobase="ghcr.io/nethserver"
reponame="nextsec-vpn"

container=$(buildah from docker.io/alpine:latest)

trap "buildah rm ${container} ${container_p} " EXIT

echo "Installing build depencies..."
buildah run ${container} apk add --no-cache openvpn easy-rsa

echo "Setup image"
buildah add "${container}" vpn/controller-auth /usr/local/bin/controller-auth
buildah add "${container}" vpn/add-proxy-path /usr/local/bin/add-proxy-path
buildah add "${container}" vpn/entrypoint.sh /entrypoint.sh
buildah config --entrypoint='["/entrypoint.sh"]' --cmd='["/usr/sbin/openvpn", "/etc/openvpn/server.conf"]' ${container}
buildah commit "${container}" "${repobase}/${reponame}"

container_p=$(buildah from docker.io/alpine:latest)

buildah run ${container_p} apk add --no-cache python3 py3-pip
buildah add "${container_p}" api/requirements.txt /usr/share/nextsec-api/
buildah run ${container_p} pip install -r /usr/share/nextsec-api/requirements.txt
buildah add "${container_p}" api/api.py /usr/share/nextsec-api/
buildah config --cmd='["python3", "/usr/share/nextsec-api/api.py"]' ${container_p}
buildah commit "${container_p}" "${repobase}/nextsec-api"

container_ui=$(buildah from docker.io/alpine:latest)
buildah run ${container_ui} apk add --no-cache lighttpd
buildah add "${container_ui}" ui/static/ /var/www/localhost/htdocs/
buildah add "${container_ui}" ui/lighttpd.conf /etc/lighttpd/lighttpd.conf
buildah add "${container_ui}" ui/entrypoint.sh /entrypoint.sh
buildah config --entrypoint='["/entrypoint.sh"]' ${container_ui}
buildah commit "${container_ui}" "${repobase}/nextsec-ui"

