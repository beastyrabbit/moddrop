"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import {
  ArrowRight,
  Crown,
  Loader2,
  LogOut,
  Plus,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHero } from "@/components/common/PageHero";
import { createRoom, getAccessibleRooms } from "@/lib/stream-canvas/api";
import type { AccessibleRoom } from "@/lib/stream-canvas/types";
import { cn } from "@/lib/utils";

export function StreamCanvasHome() {
  const clerk = useClerk();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [rooms, setRooms] = useState<AccessibleRoom[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load accessible rooms on mount
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;

    getAccessibleRooms(getToken)
      .then((r) => {
        if (!cancelled) setRooms(r);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [getToken, isLoaded, isSignedIn]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await createRoom(getToken);
      const updated = await getAccessibleRooms(getToken);
      setRooms(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create room");
    } finally {
      setCreating(false);
    }
  };

  if (!isLoaded) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </main>
    );
  }

  if (!isSignedIn) {
    return (
      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 sm:py-10">
        <PageHero
          eyebrow="Control room"
          title="Sign in to open your room"
          description="Moddrop rooms are tied to your Clerk identity. Sign in to create your canvas, invite editors, and load your stream overlay."
        />
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => clerk.openSignIn()}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border border-border/50",
              "px-5 py-2.5 text-sm font-semibold text-muted-foreground",
              "transition hover:bg-foreground hover:text-background",
            )}
          >
            Sign in
          </button>
        </div>
      </main>
    );
  }

  const hasOwnRoom = rooms?.some((r) => r.isOwner) ?? false;

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHero
          eyebrow="Control room"
          title="Your rooms"
          description="Create a room for your stream, or jump back into one you already control."
        />
        <button
          type="button"
          onClick={() => clerk.signOut()}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-lg border border-border/50",
            "px-4 py-2 text-sm font-semibold text-muted-foreground",
            "transition hover:bg-foreground hover:text-background",
          )}
        >
          <LogOut className="size-4" />
          Log out
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {rooms === null ? (
        <div className="flex min-h-[20vh] items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-4">
          {rooms.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No canvases yet. Create one to get started.
            </p>
          )}

          {rooms.map((room) => (
            <div
              key={room.id}
              className="group signal-surface rounded-2xl p-5 transition hover:border-primary/18"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {room.isOwner && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-primary/18 bg-primary/8 px-2 py-0.5 text-xs font-medium text-primary">
                      <Crown className="size-3" />
                      Owner
                    </span>
                  )}
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {room.twitchChannel
                        ? `${room.twitchChannel}'s room`
                        : `Room ${room.id.slice(0, 8)}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {room.collaboratorCount} collaborator
                      {room.collaboratorCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {room.isOwner && (
                    <Link
                      href="/app/settings"
                      className="rounded-lg border border-border/50 p-2 text-muted-foreground transition hover:text-foreground"
                      title="Settings"
                    >
                      <Settings className="size-4" />
                    </Link>
                  )}
                  <Link
                    href={`/app/rooms/${room.id}`}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-lg border border-primary/24 bg-primary px-4 py-2",
                      "text-sm font-semibold text-primary-foreground transition hover:bg-[#6aff50]",
                    )}
                  >
                    Open room
                    <ArrowRight className="size-4" />
                  </Link>
                </div>
              </div>
            </div>
          ))}

          {!hasOwnRoom && (
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className={cn(
                "inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/20",
                "bg-white/[0.02] p-5",
                "text-sm font-medium text-muted-foreground transition",
                "hover:border-primary/30 hover:text-foreground",
                "disabled:opacity-50",
              )}
            >
              {creating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              Create your room
            </button>
          )}
        </div>
      )}
    </main>
  );
}
