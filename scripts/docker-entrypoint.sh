#!/bin/sh
set -eu

DATA_DIRECTORY="${RAILWAY_VOLUME_MOUNT_PATH:-/app/data}"
mkdir -p "$DATA_DIRECTORY"
chown -R node:node "$DATA_DIRECTORY"

exec su-exec node "$@"
