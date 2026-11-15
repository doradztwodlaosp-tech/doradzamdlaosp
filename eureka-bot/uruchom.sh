#!/usr/bin/env bash
# Ręczne uruchomienie bota z ustawieniami z eureka.env, np.:
#   ./uruchom.sh --podglad
#   ./uruchom.sh --test-maila
#   ./uruchom.sh sprawdz_api.py
set -euo pipefail
cd "$(dirname "$0")"
set -a; [ -f eureka.env ] && . ./eureka.env; set +a
export PYTHONUNBUFFERED=1   # log na bieżąco także przy zapisie do pliku (nohup)
if [ "${1:-}" = "sprawdz_api.py" ]; then
  shift
  exec ./venv/bin/python sprawdz_api.py "$@"
fi
exec ./venv/bin/python main.py "$@"
