#!/bin/bash
set -e

repobase="ghcr.io/nethserver"

images=()
container=$(buildah from docker.io/alpine:3.16)

trap "buildah rm ${container} ${container_p} ${container_ui} ${container_ui_build} ${container_proxy}" EXIT

echo "Installing build depencies..."
buildah run ${container} apk add --no-cache openvpn easy-rsa

echo "Setup image"
buildah add "${container}" vpn/controller-auth /usr/local/bin/controller-auth
buildah add "${container}" vpn/handle-connection /usr/local/bin/handle-connection
buildah add "${container}" vpn/entrypoint.sh /entrypoint.sh
buildah config --entrypoint='["/entrypoint.sh"]' --cmd='["/usr/sbin/openvpn", "/etc/openvpn/server.conf"]' ${container}
buildah commit "${container}" "${repobase}/nextsec-vpn"
images+=("${repobase}/nextsec-vpn")

container_p=$(buildah from docker.io/alpine:3.17)
buildah run ${container_p} apk add --no-cache python3 py3-pip easy-rsa
buildah run ${container_p} mkdir /nextsec-api
buildah add "${container_p}" api/requirements.txt /nextsec-api
buildah add "${container_p}" api/api.py /nextsec-api
buildah run ${container_p} python3 -m venv /nextsec-api
buildah run ${container_p} /bin/sh -c "source /nextsec-api/bin/activate; pip --no-cache-dir install wheel; pip install -r /nextsec-api/requirements.txt"
buildah run ${container_p} /bin/sh -c "apk --purge del py3-pip"
buildah add "${container_p}" api/entrypoint.sh /entrypoint.sh
buildah config --entrypoint='["/entrypoint.sh"]' ${container_p}
buildah commit "${container_p}" "${repobase}/nextsec-api"
images+=("${repobase}/nextsec-api")

container_ui_build=$(buildah from -v "${PWD}/ui:/build:z" docker.io/library/node:18.13.0-alpine)
buildah run ${container_ui_build} sh -c "export NODE_OPTIONS='--openssl-legacy-provider --max-old-space-size=1024'; cd /build && npm ci && npm run build"
buildah rm ${container_ui_build}

container_ui=$(buildah from docker.io/alpine:3.17)
buildah run ${container_ui} apk add --no-cache lighttpd
buildah add "${container_ui}" ui/dist/ /var/www/localhost/htdocs/
buildah add "${container_ui}" ui/entrypoint.sh /entrypoint.sh
buildah config --entrypoint='["/entrypoint.sh"]' ${container_ui}
buildah commit "${container_ui}" "${repobase}/nextsec-ui"
images+=("${repobase}/nextsec-ui")

container_proxy=$(buildah from docker.io/library/traefik:v2.6)
buildah add "${container_proxy}" proxy/entrypoint.sh /entrypoint.sh
buildah config --entrypoint='["/entrypoint.sh"]' --cmd='["/usr/local/bin/traefik", "--configFile=/config.yaml"]' ${container_proxy}
buildah commit "${container_proxy}" "${repobase}/nextsec-proxy"
images+=("${repobase}/nextsec-proxy")

if [[ -n "${CI}" ]]; then
    # Set output value for Github Actions
    printf "::set-output name=images::%s\n" "${images[*]}"
else
    printf "Publish the images with:\n\n"
    for image in "${images[@]}"; do printf "  buildah push %s docker://%s:latest\n" "${image}" "${image}" ; done
    printf "\n"
fi
