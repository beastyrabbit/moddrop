import type { PoolClient } from "pg";
import { pool } from "./db.ts";

const LEADER_LOCK_KEY = 1_296_315_460;

class LeaderState {
  private client: PoolClient | null = null;
  private timer: NodeJS.Timeout | null = null;
  private tickPromise: Promise<void> | null = null;
  private stopping = false;
  private demoteHandlers = new Set<() => void | Promise<void>>();

  isLeader = false;

  start(): void {
    if (this.timer || this.tickPromise || this.stopping) return;
    this.runTick();
  }

  onDemote(handler: () => void | Promise<void>): () => void {
    this.demoteHandlers.add(handler);
    return () => this.demoteHandlers.delete(handler);
  }

  async stop(): Promise<void> {
    this.stopping = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    await this.tickPromise;
    await this.demote();
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
      if (this.isLeader && this.client) {
        await this.client.query("SELECT 1");
      } else {
        await this.tryAcquire();
      }
    } catch (error) {
      console.error("[leader] leadership connection failed", error);
      await this.demote();
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
    let retained = false;
    let destroy = false;
    try {
      const result = await client.query<{ acquired: boolean }>(
        "SELECT pg_try_advisory_lock($1) AS acquired",
        [LEADER_LOCK_KEY],
      );
      if (!result.rows[0]?.acquired) return;
      if (this.stopping) {
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
      if (!retained) client.release(destroy);
    }
  }

  private async demote(): Promise<void> {
    const wasLeader = this.isLeader;
    this.isLeader = false;
    const client = this.client;
    this.client = null;
    if (wasLeader) {
      console.warn("[leader] relinquishing stream-canvas leadership");
      const results = await Promise.allSettled(
        [...this.demoteHandlers].map((handler) => handler()),
      );
      for (const result of results) {
        if (result.status === "rejected") {
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
        client.release(true);
      }
    }
  }
}

export const leaderState = new LeaderState();
