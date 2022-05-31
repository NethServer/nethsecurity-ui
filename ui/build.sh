#!/bin/bash

#
# Build only the UI for publishing with GH workflow
# Output:
# - 'dist' directory with build output
# - 'ui.tar.gz' archive with compresses output
#

set -e

container_ui_build=$(buildah from -v "${PWD}:/build:z" docker.io/library/node:lts-slim)
buildah run ${container_ui_build} sh -c "export NODE_OPTIONS='--max-old-space-size=1024'; cd /build && npm install && npm run build"
buildah rm ${container_ui_build}

tar cvzf ui.tar.gz dist/
