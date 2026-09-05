import type { PoolClient } from "pg";
import type { RoomSnapshot } from "@tldraw/sync-core";
import { drizzle } from "drizzle-orm/node-postgres";
import { pool } from "./db.ts";
import { canvasDocuments } from "./schema.ts";

const LEADER_LOCK_KEY = 1_296_315_460;

class LeaderState {
  private client: PoolClient | null = null;
  private timer: NodeJS.Timeout | null = null;
  private tickPromise: Promise<void> | null = null;
  private stopping = false;
  private demoteHandlers = new Set<
    (persist: boolean) => void | Promise<void>
  >();
  private demoting: Promise<void> | null = null;
  private connectionFailed = false;

  private readonly onClientError = (error: Error) => {
    console.error("[leader] retained PostgreSQL connection failed", error);
    this.connectionFailed = true;
    void this.demote(false).catch((failure) =>
      console.error("[leader] demotion failed", failure),
    );
  };

  isLeader = false;

  start(): void {
    if (this.timer || this.tickPromise || this.stopping) return;
    this.runTick();
  }

  onDemote(handler: (persist: boolean) => void | Promise<void>): () => void {
    this.demoteHandlers.add(handler);
    return () => this.demoteHandlers.delete(handler);
  }

  async stop(): Promise<void> {
    this.stopping = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    await this.tickPromise;
    await this.demote(true);
  }

  async persistSnapshot(roomId: string, snapshot: RoomSnapshot): Promise<void> {
    const client = this.client;
    if (!client || this.connectionFailed)
      throw new Error("Canvas ownership was lost");
    // Writes use the lock-owning connection. A successor cannot acquire the
    // advisory lock until this connection and its queued writes have ended.
    await drizzle(client)
      .insert(canvasDocuments)
      .values({
        roomId,
        snapshot,
        revision: snapshot.documentClock,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: canvasDocuments.roomId,
        set: {
          snapshot,
          revision: snapshot.documentClock,
          updatedAt: new Date(),
        },
      });
  }

  private runTick(): void {
    if (this.tickPromise || this.stopping) return;
    const tickPromise = this.tick()
      .catch((error) => {
        console.error("[leader] tick failed", error);
      })
      .finally(() => {
        if (this.tickPromise === tickPromise) this.tickPromise = null;
      });
    this.tickPromise = tickPromise;
  }

  private async tick(): Promise<void> {
    try {
      await this.demoting;
      if (this.isLeader && this.client) {
        await this.client.query("SELECT 1");
      } else {
        await this.tryAcquire();
      }
    } catch (error) {
      console.error("[leader] leadership connection failed", error);
      this.connectionFailed = true;
      await this.demote(false);
    } finally {
      if (!this.stopping) {
        this.timer = setTimeout(
          () => {
            this.timer = null;
            this.runTick();
          },
          this.isLeader ? 5_000 : 2_000,
        );
      }
    }
  }

  private async tryAcquire(): Promise<void> {
    const client = await pool.connect();
    this.connectionFailed = false;
    client.on("error", this.onClientError);
    let retained = false;
    let destroy = false;
    try {
      const result = await client.query<{ acquired: boolean }>(
        "SELECT pg_try_advisory_lock($1) AS acquired",
        [LEADER_LOCK_KEY],
      );
      if (!result.rows[0]?.acquired) return;
      if (this.stopping || this.connectionFailed) {
        await client.query("SELECT pg_advisory_unlock($1)", [LEADER_LOCK_KEY]);
        return;
      }
      this.client = client;
      this.isLeader = true;
      retained = true;
      console.log("[leader] acquired stream-canvas leadership");
    } catch (error) {
      destroy = true;
      throw error;
    } finally {
      if (!retained) {
        client.release(destroy || this.connectionFailed);
        client.removeListener("error", this.onClientError);
      }
    }
  }

  private demote(persist: boolean): Promise<void> {
    this.isLeader = false;
    if (this.demoting) return this.demoting;
    this.demoting = this.performDemotion(persist).finally(() => {
      this.demoting = null;
    });
    return this.demoting;
  }

  private async performDemotion(persist: boolean): Promise<void> {
    const failures: unknown[] = [];
    const client = this.client;
    if (!persist) this.client = null;
    if (client) {
      console.warn("[leader] relinquishing stream-canvas leadership");
      const results = await Promise.allSettled(
        [...this.demoteHandlers].map((handler) => handler(persist)),
      );
      for (const result of results) {
        if (result.status === "rejected") {
          failures.push(result.reason);
          console.error("[leader] demotion handler failed", result.reason);
        }
      }
    }
    if (client) {
      try {
        await client.query("SELECT pg_advisory_unlock($1)", [LEADER_LOCK_KEY]);
      } catch {
        // The connection may already be gone; PostgreSQL releases session locks.
      } finally {
        this.client = null;
        client.release(true);
        client.removeListener("error", this.onClientError);
      }
    }
    if (failures.length)
      throw new AggregateError(failures, "Leadership demotion failed");
  }
}

export const leaderState = new LeaderState();
