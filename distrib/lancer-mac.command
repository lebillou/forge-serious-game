#!/bin/bash
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then echo "Node.js n est pas installe : https://nodejs.org"; read -r -p "Entree pour fermer"; exit 1; fi
node server.mjs
