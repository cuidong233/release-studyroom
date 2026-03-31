#!/usr/bin/env bash
set -e

BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT=${PORT:-9999}

cd "$BASE_DIR/dist"
echo "Serving admin static files at http://localhost:${PORT}"
python3 -m http.server "${PORT}"
