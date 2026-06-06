#!/bin/sh
set -e

# Render $PORT değişkenini backend'in beklediği SERVER_PORT'a aktar
export SERVER_PORT="${PORT:-8080}"

exec /app/masterfabric
