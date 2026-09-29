import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeUploadFilename } from "./upload-validation.ts";

test("upload names trim edge punctuation while preserving interior separators", () => {
  assert.equal(
    sanitizeUploadFilename("--__report._v2--.png"),
    "report._v2.png",
  );
  assert.equal(sanitizeUploadFilename("--__.png"), "upload.png");
  assert.equal(
    sanitizeUploadFilename("../bad name<script>.png"),
    "bad_name_script.png",
  );
  assert.equal(sanitizeUploadFilename("é.png"), "e.png");
});

test("upload names handle long punctuation runs and bound the normalized base", () => {
  const punctuation = "-".repeat(100_000);
  assert.equal(
    sanitizeUploadFilename(`a${punctuation}b.png`),
    `${`a${punctuation}`.slice(0, 96)}.png`,
  );
  assert.equal(
    sanitizeUploadFilename(`${punctuation}name${punctuation}.png`),
    "name.png",
  );
});
