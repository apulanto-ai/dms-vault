#!/bin/sh
set -e

SOCKET_GID=$(stat -c '%g' /var/run/docker.sock)

if ! getent group "$SOCKET_GID" > /dev/null 2>&1; then
    addgroup -g "$SOCKET_GID" -S dockersock
fi

adduser node "$(getent group "$SOCKET_GID" | cut -d: -f1)" 2>/dev/null || true

exec su-exec node "$@"
