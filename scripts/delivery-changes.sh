#!/usr/bin/env bash
set -euo pipefail

if [ "${1:-}" = tag ]; then
  # awk consumes the full list and succeeds when no previous tag exists.
  previous_tag="$(git tag --sort=-version:refname --list 'v*' | awk -v current="$CURRENT_TAG" '$0 != current && !found { print; found=1 }')"
  if [ -z "$previous_tag" ] || ! git diff --quiet "$previous_tag..$CURRENT_SHA" -- convex convex.json package.json pnpm-lock.yaml pnpm-workspace.yaml; then
    echo 'convex=true'
  else
    echo 'convex=false'
  fi
  exit 0
fi

changed="$(cat)"
set_output() {
  if printf '%s\n' "$changed" | grep -E "$2" > /dev/null; then
    echo "$1=true"
  else
    echo "$1=false"
  fi
}
shared='^(\.dockerignore|\.npmrc|package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml)$'
set_output frontend "$shared|^(app|components|lib|public)/|^(next\.config\.mjs|postcss\.config\.mjs|tailwind\.config\.ts|tsconfig\.json|biome\.json|components\.json|Dockerfile|docker-entrypoint\.sh)$"
set_output convex "$shared|^convex/|^convex\.json$"
set_output stream_canvas "$shared|^backend/stream-canvas/"
