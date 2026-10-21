import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { assertNoRuntimePlaceholders } from "./sourcemap-guard";

const directory = mkdtempSync(join(tmpdir(), "moddrop-sourcemap-guard-"));
afterEach(() => rmSync(directory, { recursive: true, force: true }));

it("accepts fixed public build values and rejects each marker, including nested maps", () => {
  mkdirSync(join(directory, "chunks"), { recursive: true });
  const path = join(directory, "chunks", "client.js.map");
  writeFileSync(path, '"pk_live_ZXhhbXBsZS5jb20k /canvas-api dummy-license"');
  expect(() => assertNoRuntimePlaceholders(directory)).not.toThrow();
  for (const marker of [
    "pk_placeholder_CLERK_KEY",
    "__NEXT_PUBLIC_CANVAS_API_URL__",
    "tldraw-placeholder-key",
  ]) {
    writeFileSync(path, marker);
    expect(() => assertNoRuntimePlaceholders(directory)).toThrow(
      "Runtime placeholders remain",
    );
  }
});
