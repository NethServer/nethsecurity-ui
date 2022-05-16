#!/bin/bash
set -e

repobase="ghcr.io/nethserver"

images=()
container=$(buildah from docker.io/alpine:latest)

trap "buildah rm ${container} ${container_p} ${container_ui} ${container_ui_build}" EXIT

echo "Installing build depencies..."
buildah run ${container} apk add --no-cache openvpn easy-rsa

echo "Setup image"
buildah add "${container}" vpn/controller-auth /usr/local/bin/controller-auth
buildah add "${container}" vpn/add-proxy-path /usr/local/bin/add-proxy-path
buildah add "${container}" vpn/entrypoint.sh /entrypoint.sh
buildah config --entrypoint='["/entrypoint.sh"]' --cmd='["/usr/sbin/openvpn", "/etc/openvpn/server.conf"]' ${container}
buildah commit "${container}" "${repobase}/nextsec-vpn"
images+=("${repobase}/nextsec-vpn")

container_p=$(buildah from docker.io/alpine:latest)

buildah run ${container_p} apk add --no-cache python3 py3-pip easy-rsa
buildah add "${container_p}" api/requirements.txt /usr/share/nextsec-api/
buildah run ${container_p} pip install -r /usr/share/nextsec-api/requirements.txt
buildah add "${container_p}" api/api.py /usr/share/nextsec-api/
buildah config --cmd='["python3", "/usr/share/nextsec-api/api.py"]' ${container_p}
buildah commit "${container_p}" "${repobase}/nextsec-api"
images+=("${repobase}/nextsec-api")

container_ui_build=$(buildah from -v "${PWD}/ui:/build:z" docker.io/library/node:lts-slim)
buildah run ${container_ui_build} sh -c "cd /build && npm install && npm run build"
buildah rm ${container_ui_build}

container_ui=$(buildah from docker.io/alpine:latest)
buildah run ${container_ui} apk add --no-cache lighttpd
buildah add "${container_ui}" ui/dist/ /var/www/localhost/htdocs/
buildah add "${container_ui}" ui/lighttpd.conf /etc/lighttpd/lighttpd.conf
buildah add "${container_ui}" ui/entrypoint.sh /entrypoint.sh
buildah config --entrypoint='["/entrypoint.sh"]' ${container_ui}
buildah commit "${container_ui}" "${repobase}/nextsec-ui"
images+=("${repobase}/nextsec-ui")

if [[ -n "${CI}" ]]; then
    # Set output value for Github Actions
    printf "::set-output name=images::%s\n" "${images[*]}"
else
    printf "Publish the images with:\n\n"
    for image in "${images[@]}"; do printf "  buildah push %s docker://%s:latest\n" "${image}" "${image}" ; done
    printf "\n"
fi
