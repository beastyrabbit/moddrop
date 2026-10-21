#!/usr/bin/env bash
set -euo pipefail

changed="$(cat)"
set_output() {
  if printf '%s\n' "$changed" | grep -E "$2" > /dev/null; then
    echo "$1=true"
  else
    echo "$1=false"
  fi
}
shared='^(\.dockerignore|\.npmrc|package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml)$'
set_output frontend "$shared|^(app|components|lib|public)/|^backend/stream-canvas/src/telemetry/|^scripts/(upload-sourcemaps\.mjs|sourcemap-guard\.ts)$|^(instrumentation\.ts|instrumentation-client\.ts|next\.config\.mjs|postcss\.config\.mjs|tailwind\.config\.ts|tsconfig\.json|biome\.json|components\.json|Dockerfile|docker-entrypoint\.sh)$"
set_output stream_canvas "$shared|^backend/stream-canvas/"
