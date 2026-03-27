#!/usr/bin/env bash
set -e

BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT=${PORT:-9998}

cd "$BASE_DIR/dist"
echo "Serving app static files at http://localhost:${PORT}"
python3 -m http.server "${PORT}"
