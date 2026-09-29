import assert from "node:assert/strict";
import test from "node:test";
import { parseSingleByteRange } from "./http-range.ts";

test("parseSingleByteRange returns none when no range header is present", () => {
  assert.deepEqual(parseSingleByteRange(undefined, 1024), { kind: "none" });
});

test("parseSingleByteRange parses explicit byte ranges", () => {
  assert.deepEqual(parseSingleByteRange("bytes=100-199", 1000), {
    kind: "range",
    start: 100,
    end: 199,
    length: 100,
  });
});

test("parseSingleByteRange parses open-ended ranges", () => {
  assert.deepEqual(parseSingleByteRange("bytes=900-", 1000), {
    kind: "range",
    start: 900,
    end: 999,
    length: 100,
  });
});

test("parseSingleByteRange parses suffix ranges", () => {
  assert.deepEqual(parseSingleByteRange("bytes=-250", 1000), {
    kind: "range",
    start: 750,
    end: 999,
    length: 250,
  });
});

test("parseSingleByteRange rejects malformed or out-of-bounds ranges", () => {
  assert.deepEqual(parseSingleByteRange("items=0-10", 1000), {
    kind: "invalid",
  });
  assert.deepEqual(parseSingleByteRange("bytes=100abc-200", 1000), {
    kind: "invalid",
  });
  assert.deepEqual(parseSingleByteRange("bytes=1000-1200", 1000), {
    kind: "invalid",
  });
  assert.deepEqual(parseSingleByteRange("bytes=500-100", 1000), {
    kind: "invalid",
  });
});

test("parseSingleByteRange clamps ranges and retains first-range selection", () => {
  for (const header of ["bytes=0-9999", "bytes=-9999", "bytes=0-999,200-299"]) {
    assert.deepEqual(
      parseSingleByteRange(header, 1000),
      {
        kind: "range",
        start: 0,
        end: 999,
        length: 1000,
      },
      header,
    );
  }
  assert.deepEqual(parseSingleByteRange("bytes= 999 - 999 ", 1000), {
    kind: "range",
    start: 999,
    end: 999,
    length: 1,
  });
});

test("parseSingleByteRange rejects empty, unsafe and non-integer bounds", () => {
  for (const header of [
    "bytes=",
    "bytes=-",
    "bytes=-0",
    "bytes=-abc",
    "bytes=0-abc",
    "bytes=1.5-9",
    "bytes=0-1.5",
    "bytes=-1.5",
    "bytes=9007199254740992-",
    "bytes=0-9007199254740992",
    "bytes=-9007199254740992",
  ]) {
    assert.deepEqual(
      parseSingleByteRange(header, 1000),
      { kind: "invalid" },
      header,
    );
  }
  for (const size of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.deepEqual(parseSingleByteRange("bytes=0-1", size), {
      kind: "invalid",
    });
  }
});
