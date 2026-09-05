import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import type { RoomSnapshot } from "@tldraw/sync-core";
import { RoomSnapshotWriter } from "./snapshot-writer.ts";
import { withRoomOperation } from "./room-operations.ts";

const snapshot = (clock: number): RoomSnapshot => ({
  documentClock: clock,
  documents: [],
  tombstones: {},
  tombstoneHistoryStartsAtClock: 0,
});

test("snapshot creation is deferred and a burst writes only its latest state", async () => {
  let clock = 0;
  let snapshots = 0;
  const written: number[] = [];
  const writer = new RoomSnapshotWriter(
    () => {
      snapshots++;
      return snapshot(clock);
    },
    async (value) => {
      written.push(value.documentClock ?? 0);
    },
    "test",
  );
  for (clock = 1; clock <= 100; clock++) writer.schedule();
  assert.equal(snapshots, 0);
  await writer.flush();
  assert.deepEqual(written, [101]);
  assert.equal(snapshots, 1);
  writer.stop();
});

test("flush drains changes arriving behind a pending write, without overlapping writers", async () => {
  let clock = 1;
  let release: () => void = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const written: number[] = [];
  const writer = new RoomSnapshotWriter(
    () => snapshot(clock),
    async (value) => {
      if (!written.length) await pending;
      written.push(value.documentClock ?? 0);
    },
    "test",
  );
  writer.schedule();
  const flush = writer.flush();
  clock = 2;
  writer.schedule();
  release();
  await flush;
  assert.deepEqual(written, [1, 2]);
  writer.stop();
});

test("failed flush is reported, keeps the latest state for retry, and respects a deadline", async () => {
  let fail = true;
  const written: number[] = [];
  const writer = new RoomSnapshotWriter(
    () => snapshot(3),
    async (value) => {
      if (fail) throw new Error("storage unavailable");
      written.push(value.documentClock ?? 0);
    },
    "test",
  );
  writer.schedule();
  await assert.rejects(writer.flush(), /storage unavailable/);
  fail = false;
  await writer.flush();
  assert.deepEqual(written, [3]);
  writer.stop();
  const stalled = new RoomSnapshotWriter(
    () => snapshot(1),
    () => new Promise(() => {}),
    "stalled",
  );
  stalled.schedule();
  await assert.rejects(stalled.flush(10), /timed out/);
  stalled.stop();
});

test("room operations serialize a commit and admission, and recover from a failed operation", async () => {
  const order: string[] = [];
  await Promise.all([
    withRoomOperation("one", async () => {
      await delay(5);
      order.push("commit");
    }),
    withRoomOperation("one", async () => {
      order.push("admit");
    }),
  ]);
  assert.deepEqual(order, ["commit", "admit"]);
  await assert.rejects(
    withRoomOperation("one", async () => {
      throw new Error("failed");
    }),
  );
  assert.equal(
    await withRoomOperation("one", async () => "recovered"),
    "recovered",
  );
});
