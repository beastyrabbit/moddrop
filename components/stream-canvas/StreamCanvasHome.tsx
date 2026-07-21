"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import {
  ArrowRight,
  Crown,
  Loader2,
  Plus,
  RotateCcw,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { createRoom, getAccessibleRooms } from "@/lib/stream-canvas/api";
import type { AccessibleRoom } from "@/lib/stream-canvas/types";
import { cn } from "@/lib/utils";

const PENDING_OBS_SECRET_PREFIX = "moddrop:obsSetupSecret:";

export function StreamCanvasHome() {
  const clerk = useClerk();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [rooms, setRooms] = useState<AccessibleRoom[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const loadRequestRef = useRef(0);

  const loadRooms = useCallback(async () => {
    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;
    setRooms(null);
    setLoadError(null);

    try {
      const accessibleRooms = await getAccessibleRooms(getToken);
      if (loadRequestRef.current === requestId) {
        setRooms(accessibleRooms);
      }
    } catch (error) {
      if (loadRequestRef.current === requestId) {
        setLoadError(
          error instanceof Error ? error.message : "Failed to load rooms",
        );
      }
    }
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    void loadRooms();
  }, [isLoaded, isSignedIn, loadRooms]);

  const handleCreate = async () => {
    setCreating(true);
    setActionError(null);
    try {
      const created = await createRoom(getToken);
      if (created.obsSetupSecret) {
        try {
          window.sessionStorage.setItem(
            `${PENDING_OBS_SECRET_PREFIX}${created.id}`,
            created.obsSetupSecret,
          );
        } catch {
          setActionError(
            "Room created, but the one-time OBS secret could not be kept in this browser session.",
          );
        }
      }
      setRooms(await getAccessibleRooms(getToken));
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Failed to create room",
      );
    } finally {
      setCreating(false);
    }
  };

  if (!isLoaded) {
    return <AppLoadingState label="Loading your account" />;
  }

  if (!isSignedIn) {
    return (
      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
        <PageHeader
          title="Your rooms"
          description="Sign in to create a canvas, invite collaborators, and manage your live stream layer."
        />
        <section className="rounded-xl border border-border bg-card p-6 sm:p-8">
          <h2 className="font-product-display text-2xl">Sign in to continue</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Rooms are tied to your Moddrop account so your canvas and
            collaborator access stay private.
          </p>
          <button
            type="button"
            onClick={() => clerk.openSignIn()}
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg border border-primary bg-primary px-5 text-sm font-semibold text-primary-foreground hover:border-[var(--app-brass-highlight)] hover:bg-[var(--app-brass-highlight)]"
          >
            Sign in
          </button>
        </section>
      </main>
    );
  }

  const hasOwnRoom = rooms?.some((room) => room.isOwner) ?? false;

  return (
    <main className="mx-auto max-w-5xl space-y-7 px-4 py-8 sm:px-6 sm:py-12">
      <PageHeader
        title="Your rooms"
        description="Open a shared canvas or create the room for your own stream."
        actions={
          rooms !== null && rooms.length > 0 && !hasOwnRoom ? (
            <CreateRoomButton creating={creating} onCreate={handleCreate} />
          ) : undefined
        }
      />

      {actionError ? (
        <div
          role="alert"
          className="flex items-start justify-between gap-4 rounded-lg border border-[var(--app-ember)] bg-[color-mix(in_srgb,var(--app-ember)_10%,transparent)] px-4 py-3 text-sm text-foreground"
        >
          <p>{actionError}</p>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="shrink-0 font-semibold text-foreground underline decoration-[var(--app-ember)] underline-offset-4"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {loadError ? (
        <InitialLoadError message={loadError} onRetry={loadRooms} />
      ) : rooms === null ? (
        <AppLoadingState label="Loading rooms" compact />
      ) : rooms.length === 0 ? (
        <section className="rounded-xl border border-border bg-card px-5 py-8 text-center sm:px-8">
          <h2 className="font-product-display text-2xl">No rooms yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Create your room to start arranging a canvas and invite your crew.
          </p>
          <div className="mt-5 flex justify-center">
            <CreateRoomButton creating={creating} onCreate={handleCreate} />
          </div>
        </section>
      ) : (
        <section aria-labelledby="room-list-title">
          <h2 id="room-list-title" className="sr-only">
            Accessible rooms
          </h2>
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {rooms.map((room) => {
              const roomName = room.twitchChannel
                ? `${room.twitchChannel}'s room`
                : `Room ${room.id.slice(0, 8)}`;

              return (
                <article
                  key={room.id}
                  className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-5"
                >
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <h3 className="truncate text-base font-semibold text-foreground">
                        {roomName}
                      </h3>
                      {room.isOwner ? (
                        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[var(--app-brass-highlight)]">
                          <Crown className="size-3.5" aria-hidden="true" />
                          Owner
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {room.collaboratorCount}{" "}
                      {room.collaboratorCount === 1
                        ? "collaborator"
                        : "collaborators"}
                      {!room.isOwner ? " · Shared with you" : ""}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {room.isOwner ? (
                      <Link
                        href="/app/settings"
                        aria-label={`Settings for ${roomName}`}
                        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border text-muted-foreground hover:border-primary/60 hover:bg-[var(--app-billiard-hover)] hover:text-foreground"
                      >
                        <Settings className="size-4" aria-hidden="true" />
                      </Link>
                    ) : null}
                    <Link
                      href={`/app/rooms/${room.id}`}
                      className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-primary bg-primary px-4 text-sm font-semibold text-primary-foreground hover:border-[var(--app-brass-highlight)] hover:bg-[var(--app-brass-highlight)] sm:flex-none"
                    >
                      Open room
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}

function CreateRoomButton({
  creating,
  onCreate,
}: {
  creating: boolean;
  onCreate: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onCreate}
      disabled={creating}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-primary bg-primary px-4 text-sm font-semibold text-primary-foreground hover:border-[var(--app-brass-highlight)] hover:bg-[var(--app-brass-highlight)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {creating ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <Plus className="size-4" aria-hidden="true" />
      )}
      {creating ? "Creating room…" : "Create room"}
    </button>
  );
}

function InitialLoadError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <section
      aria-labelledby="rooms-error-title"
      className="rounded-xl border border-[var(--app-ember)] bg-card p-5 sm:p-6"
    >
      <h2 id="rooms-error-title" className="text-base font-semibold">
        Rooms could not be loaded
      </h2>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold hover:border-primary/60 hover:bg-[var(--app-billiard-hover)]"
      >
        <RotateCcw className="size-4" aria-hidden="true" />
        Try again
      </button>
    </section>
  );
}

function AppLoadingState({
  label,
  compact = false,
}: {
  label: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center",
        compact ? "min-h-52" : "min-h-[55vh]",
      )}
      role="status"
    >
      <Loader2
        className="size-5 animate-spin text-[var(--app-brass-highlight)]"
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}
