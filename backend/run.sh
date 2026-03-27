#!/usr/bin/env bash
set -e

BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
JAVA_OPTS=${JAVA_OPTS:--Xms512m -Xmx512m}
PORT=${SERVER_PORT:-48080}
CONFIG_FILE="$BASE_DIR/application-dev.yaml"

echo "Starting backend on port ${PORT}..."
echo "Using config: ${CONFIG_FILE}"

java $JAVA_OPTS -jar "$BASE_DIR/yudao-server.jar" \
  --spring.profiles.active=dev \
  --server.port="${PORT}" \
  --spring.config.additional-location="${CONFIG_FILE}"
