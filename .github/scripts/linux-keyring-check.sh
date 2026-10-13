#!/usr/bin/env bash
set -euo pipefail
printf '\n' | gnome-keyring-daemon --unlock --components=secrets >/dev/null
npm run check
