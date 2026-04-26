#!/bin/sh
set -eu

echo "Injecting runtime environment variables..."

node <<'NODE'
const fs = require("node:fs");
const path = require("node:path");

const replacements = [
  ["https://placeholder.convex.cloud", process.env.NEXT_PUBLIC_CONVEX_URL],
  ["https://placeholder.convex.site", process.env.NEXT_PUBLIC_CONVEX_SITE_URL],
  ["pk_placeholder_CLERK_KEY", process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY],
  [
    "__NEXT_PUBLIC_CANVAS_API_URL__",
    process.env.NEXT_PUBLIC_CANVAS_API_URL || "/canvas-api",
  ],
  ["tldraw-placeholder-key", process.env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY],
];

const extensions = new Set([".html", ".js", ".json", ".mjs", ".rsc", ".txt"]);

function shouldProcess(file) {
  return extensions.has(path.extname(file));
}

function walk(target) {
  if (!fs.existsSync(target)) {
    return;
  }

  const stat = fs.statSync(target);
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(target)) {
      walk(path.join(target, entry));
    }
    return;
  }

  if (!shouldProcess(target)) {
    return;
  }

  let content = fs.readFileSync(target, "utf8");
  let changed = false;
  for (const [placeholder, value] of replacements) {
    if (!value || !content.includes(placeholder)) {
      continue;
    }
    content = content.split(placeholder).join(value);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(target, content);
  }
}

walk("/app/.next");
walk("/app/server.js");
NODE

echo "Environment injection complete"

exec "$@"
