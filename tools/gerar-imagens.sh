#!/bin/sh
# Gera os PNGs (favicon 32, apple-touch 180, og 1200x630) com o Edge headless.
# Precisa do servidor local ligado: python -m http.server 4000
set -e
cd "$(dirname "$0")/.."
EDGE="/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
foto() { # tamanho largura altura url
  "$EDGE" --headless --disable-gpu --hide-scrollbars --default-background-color=00000000 \
    --window-size="$2,$3" --screenshot="$(pwd -W 2>/dev/null || pwd)/$1" "$4" 2>/dev/null
}
foto img/favicon-32.png 32 32 "http://localhost:4000/tools/icone.html?t=32"
foto img/apple-touch-icon.png 180 180 "http://localhost:4000/tools/icone.html?t=180"
foto img/og.png 1200 630 "http://localhost:4000/tools/og.html"
ls -l img
