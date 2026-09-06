#!/usr/bin/env bash
set -euo pipefail
export NEXT_TELEMETRY_DISABLED=1
export NEXT_PUBLIC_CONVEX_URL=https://placeholder.convex.cloud
export NEXT_PUBLIC_CONVEX_SITE_URL=https://placeholder.convex.site
export NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_placeholder_CLERK_KEY
export NEXT_PUBLIC_CANVAS_API_URL=__NEXT_PUBLIC_CANVAS_API_URL__
export NEXT_PUBLIC_TLDRAW_LICENSE_KEY=tldraw-placeholder-key
pnpm run lint
pnpm exec biome format .
pnpm run typecheck
pnpm --dir backend/stream-canvas run typecheck
pnpm --dir backend/stream-canvas run typecheck:tests
NODE_ENV=test pnpm run test
NODE_ENV=test pnpm --dir backend/stream-canvas run test
pnpm --dir backend/stream-canvas run build
pnpm run build
pnpm run test:runtime-config
pnpm run test:browser
