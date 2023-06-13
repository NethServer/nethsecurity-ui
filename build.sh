#!/bin/bash

#
# Build only the UI for publishing with GH workflow
# Output:
# - 'dist' directory with build output
# - 'ui.tar.gz' archive with compresses output
#

set -e

image="builder/nethsecurity-ui:latest"

podman build -t $image .
podman run --rm -v $(pwd):/app:Z $image build
podman image rm $image

commit=$(git rev-parse HEAD)
mkdir -p ui-dist
tar cvzf ui-dist/ui-$commit.tar.gz dist/
