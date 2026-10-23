import assert from "node:assert/strict";
import test from "node:test";

// Match the app integration tests: tldraw disables its browser channel in test mode.
process.env.NODE_ENV = "test";
const { app } = await import("./app.ts");
const { config } = await import("./config.ts");
const { closeDatabase } = await import("./db.ts");
const { leaderState } = await import("./leader.ts");

test("version is public and uncached on standbys, with null when unset", async (t) => {
  t.after(closeDatabase);
  assert.equal(leaderState.isLeader, false);
  const original = config.appRelease;
  t.after(() => {
    Object.defineProperty(config, "appRelease", { value: original });
  });
  for (const release of ["moddrop@0.9.0", null]) {
    Object.defineProperty(config, "appRelease", { value: release });
    const response = await app.request("/version");
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.deepEqual(await response.json(), { release });
  }
});
