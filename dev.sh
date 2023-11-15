#!/usr/bin/env sh

set -e

dev_image=${DEV_IMAGE:-"nethsecurity-ui:dev-20.9.0"}
container_name=nethsecurity-ui-dev

build_image() {
    podman build \
        --force-rm \
        --layers \
        --target dev \
        --tag "${dev_image}" \
        .
}

if ! podman image exists "$dev_image"; then
    build_image
fi

if [ "$#" -gt 0 ]; then
    if [ "$1" = "build" ]; then
        build_image
    else
        if podman container exists $container_name; then
            podman exec \
                --interactive \
                --tty \
                $container_name "$@"
        else
            podman run \
                --rm \
                --interactive \
                --tty \
                --volume "$(pwd)":/app:Z \
                "${dev_image}" "$@"
        fi
    fi
else
    podman run \
        --name $container_name \
        --replace \
        --rm \
        --interactive \
        --tty \
        --publish 5173:5173 \
        --volume "$(pwd)":/app:Z \
        "${dev_image}"
fi