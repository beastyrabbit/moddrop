import type { RoomSnapshot } from "@tldraw/sync-core";
import { withDeadline } from "./deadline.ts";

/** Coalesce changes before constructing the full snapshot; flush bypasses the delay. */
export class RoomSnapshotWriter {
  private dirty = false;
  private stopped = false;
  private timer: NodeJS.Timeout | undefined;
  private draining: Promise<void> | null = null;
  private readonly snapshot: () => RoomSnapshot;
  private readonly persist: (snapshot: RoomSnapshot) => Promise<void>;
  private readonly label: string;
  private readonly debounceMs: number;

  constructor(
    snapshot: () => RoomSnapshot,
    persist: (snapshot: RoomSnapshot) => Promise<void>,
    label: string,
    debounceMs = 100,
  ) {
    this.snapshot = snapshot;
    this.persist = persist;
    this.label = label;
    this.debounceMs = debounceMs;
  }

  schedule(): void {
    if (this.stopped) return;
    this.dirty = true;
    this.arm(this.debounceMs);
  }

  private arm(delay: number): void {
    if (this.timer || this.draining || this.stopped) return;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      void this.drain().catch((error) => {
        console.error(
          `[canvas] ${this.label} persistence failed; retrying`,
          error,
        );
        this.arm(1_000);
      });
    }, delay);
    this.timer.unref();
  }

  private drain(): Promise<void> {
    if (this.draining) return this.draining;
    this.draining = (async () => {
      while (this.dirty && !this.stopped) {
        this.dirty = false;
        try {
          await this.persist(this.snapshot());
        } catch (error) {
          this.dirty = true;
          throw error;
        }
      }
    })().finally(() => {
      this.draining = null;
      if (this.dirty) this.arm(1_000);
    });
    return this.draining;
  }

  async flush(timeoutMs = 15_000): Promise<void> {
    clearTimeout(this.timer);
    this.timer = undefined;
    try {
      await withDeadline(
        this.drain(),
        timeoutMs,
        `${this.label} snapshot flush`,
      );
    } catch (error) {
      this.arm(1_000);
      throw error;
    }
  }

  stop(): void {
    this.stopped = true;
    clearTimeout(this.timer);
    this.timer = undefined;
  }
}
