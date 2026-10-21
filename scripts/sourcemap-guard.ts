import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const placeholders = [
  "pk_placeholder_CLERK_KEY",
  "__NEXT_PUBLIC_CANVAS_API_URL__",
  "tldraw-placeholder-key",
];

export function assertNoRuntimePlaceholders(directory: string) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) assertNoRuntimePlaceholders(path);
    else {
      const content = readFileSync(path, "utf8");
      if (placeholders.some((placeholder) => content.includes(placeholder)))
        throw new Error("Runtime placeholders remain in browser artifacts");
    }
  }
}
