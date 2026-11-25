#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
case "${1:-}" in ''|--tools) ;; *) echo 'Usage: sh cloud/setup.sh [--tools]' >&2; exit 2 ;; esac
python=${PYTHON:-python3}
"$python" -c 'import sys; assert sys.version_info >= (3, 12), "Python 3.12+ required"'
"$python" -m venv .venv-svyaz
.venv-svyaz/bin/python -m pip install -r cloud/requirements-svyaz.txt
if [ "${1:-}" = --tools ]; then
  "$python" -m venv .venv-tools
  .venv-tools/bin/python -m pip install -r tools-worker/requirements.lock
fi
