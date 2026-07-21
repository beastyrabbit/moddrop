"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import {
  Copy,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  RotateCcw,
  Save,
} from "lucide-react";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { UserMultiSelect } from "@/components/stream-canvas/UserMultiSelect";
import {
  createRoom,
  regenerateSecret,
  updateRoom,
} from "@/lib/stream-canvas/api";
import type { CanvasRoom } from "@/lib/stream-canvas/types";
import { cn } from "@/lib/utils";

const PENDING_OBS_SECRET_PREFIX = "moddrop:obsSetupSecret:";

export default function StreamCanvasSettingsPage() {
  const clerk = useClerk();
  const { getToken, isLoaded, isSignedIn } = useAuth();

  const [room, setRoom] = useState<CanvasRoom | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [obsSecret, setObsSecret] = useState<string | null>(null);
  const [secretRevealed, setSecretRevealed] = useState(false);
  const [twitchChannel, setTwitchChannel] = useState("");
  const [allowedUsers, setAllowedUsers] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmingRegeneration, setConfirmingRegeneration] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const loadRequestRef = useRef(0);
  const regenerateRequestRef = useRef(0);

  const loadRoom = useCallback(async () => {
    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;
    setRoom(null);
    setLoadError(null);

    try {
      const loadedRoom = await createRoom(getToken);
      if (loadRequestRef.current !== requestId) return;

      setRoom(loadedRoom);
      setTwitchChannel(loadedRoom.twitchChannel ?? "");
      setAllowedUsers(loadedRoom.allowedUsers);
      const pendingSecret =
        loadedRoom.obsSetupSecret ?? takePendingObsSecret(loadedRoom.id);
      setObsSecret(pendingSecret);
      setSecretRevealed(Boolean(pendingSecret));
    } catch (error) {
      if (loadRequestRef.current === requestId) {
        setLoadError(
          error instanceof Error
            ? error.message
            : "Failed to load room settings",
        );
      }
    }
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    void loadRoom();
  }, [isLoaded, isSignedIn, loadRoom]);

  const handleSave = useCallback(async () => {
    if (!room) return;
    setSaving(true);
    try {
      const updated = await updateRoom(
        room.id,
        { twitchChannel: twitchChannel.trim() || null, allowedUsers },
        getToken,
      );
      setRoom(updated);
      toast.success("Settings saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [room, twitchChannel, allowedUsers, getToken]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void handleSave();
  };

  const handleRegenerate = useCallback(async () => {
    if (!room || regenerating) return;

    const requestId = regenerateRequestRef.current + 1;
    regenerateRequestRef.current = requestId;
    setRegenerating(true);
    try {
      const data = await regenerateSecret(room.id, getToken);
      if (regenerateRequestRef.current !== requestId) return;
      setObsSecret(data.obsSecret);
      setSecretRevealed(true);
      setConfirmingRegeneration(false);
      toast.success("OBS secret regenerated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to regenerate",
      );
    } finally {
      if (regenerateRequestRef.current === requestId) {
        setRegenerating(false);
      }
    }
  }, [room, regenerating, getToken]);

  const obsUrl =
    obsSecret && typeof window !== "undefined"
      ? `${window.location.origin}/obs#secret=${obsSecret}`
      : null;
  const maskedObsUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/obs#secret=${"•".repeat(8)}`
      : "/obs#secret=••••••••";

  if (!isLoaded) {
    return <SettingsLoadingState label="Loading your account" />;
  }

  if (!isSignedIn) {
    return (
      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
        <PageHeader
          title="Room settings"
          description="Sign in to configure your stream, collaborators, and OBS browser source."
        />
        <section className="rounded-xl border border-border bg-card p-6 sm:p-8">
          <h2 className="font-product-display text-2xl">Sign in to continue</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Only a room owner can change these settings.
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

  return (
    <main className="mx-auto max-w-5xl space-y-7 px-4 py-8 sm:px-6 sm:py-12">
      <PageHeader
        title="Room settings"
        description="Manage what appears on your canvas, who can edit it, and how OBS connects."
      />

      {loadError ? (
        <SettingsLoadError message={loadError} onRetry={loadRoom} />
      ) : !room ? (
        <SettingsLoadingState label="Loading room settings" compact />
      ) : (
        <div className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <section
              aria-labelledby="stream-settings-title"
              className="rounded-xl border border-border bg-card p-5 sm:p-6"
            >
              <SectionHeader
                id="stream-settings-title"
                title="Stream"
                description="Choose the Twitch channel shown at the center of your canvas."
              />
              <div className="mt-5 max-w-xl">
                <label
                  htmlFor="twitch-channel"
                  className="block text-sm font-semibold text-foreground"
                >
                  Twitch channel
                </label>
                <input
                  id="twitch-channel"
                  type="text"
                  value={twitchChannel}
                  onChange={(event) => setTwitchChannel(event.target.value)}
                  placeholder="e.g. BeastyRabbit"
                  autoComplete="off"
                  className="mt-2 min-h-11 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground placeholder:text-muted-foreground/70 sm:text-sm"
                />
              </div>
            </section>

            <section
              aria-labelledby="collaborators-settings-title"
              className="rounded-xl border border-border bg-card p-5 sm:p-6"
            >
              <SectionHeader
                id="collaborators-settings-title"
                title="Collaborators"
                description="Invite people by username. Access stays linked to their account if their username changes."
              />
              <div className="mt-5">
                <label
                  htmlFor="allowed-users"
                  className="block text-sm font-semibold text-foreground"
                >
                  People with edit access
                </label>
                <div className="mt-2">
                  <UserMultiSelect
                    inputId="allowed-users"
                    value={allowedUsers}
                    onChange={setAllowedUsers}
                  />
                </div>
              </div>
            </section>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-primary bg-primary px-5 text-sm font-semibold text-primary-foreground hover:border-[var(--app-brass-highlight)] hover:bg-[var(--app-brass-highlight)] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="size-4" aria-hidden="true" />
              )}
              {saving ? "Saving changes…" : "Save changes"}
            </button>
          </form>

          <section
            aria-labelledby="obs-settings-title"
            className="rounded-xl border border-border bg-card p-5 sm:p-6"
          >
            <SectionHeader
              id="obs-settings-title"
              title="OBS browser source"
              description="Add this URL to a 1920×1080 Browser Source in OBS."
            />

            <div className="mt-5 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-stretch">
              <code className="min-h-11 min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-lg border border-input bg-background px-3 py-3 text-xs text-foreground">
                {obsUrl === null
                  ? "Regenerate the secret to create a new copyable OBS URL."
                  : secretRevealed
                    ? obsUrl
                    : maskedObsUrl}
              </code>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <button
                  type="button"
                  onClick={() => setSecretRevealed((revealed) => !revealed)}
                  disabled={!obsUrl}
                  aria-label={
                    secretRevealed ? "Hide OBS URL" : "Reveal OBS URL"
                  }
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold text-foreground hover:border-primary/60 hover:bg-[var(--app-billiard-hover)] disabled:cursor-not-allowed disabled:opacity-45 sm:min-w-11"
                >
                  {secretRevealed ? (
                    <EyeOff className="size-4" aria-hidden="true" />
                  ) : (
                    <Eye className="size-4" aria-hidden="true" />
                  )}
                  <span className="sm:sr-only">
                    {secretRevealed ? "Hide" : "Reveal"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!obsUrl) return;
                    try {
                      await navigator.clipboard.writeText(obsUrl);
                      toast.success("Copied to clipboard");
                    } catch {
                      toast.error(
                        "Failed to copy — please select and copy manually",
                      );
                    }
                  }}
                  disabled={!obsUrl}
                  aria-label="Copy OBS URL"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold text-foreground hover:border-primary/60 hover:bg-[var(--app-billiard-hover)] disabled:cursor-not-allowed disabled:opacity-45 sm:min-w-11"
                >
                  <Copy className="size-4" aria-hidden="true" />
                  <span className="sm:sr-only">Copy</span>
                </button>
              </div>
            </div>

            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              For security, the full URL is only available immediately after
              room creation or regeneration.
            </p>

            {confirmingRegeneration ? (
              <div
                role="alert"
                className="mt-5 rounded-lg border border-[var(--app-ember)] bg-background p-4"
              >
                <p className="text-sm font-semibold text-foreground">
                  Replace the current OBS secret?
                </p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Your current browser source URL will stop working immediately.
                </p>
                <div className="mt-4 flex flex-col-reverse gap-2 min-[360px]:flex-row">
                  <button
                    type="button"
                    onClick={() => setConfirmingRegeneration(false)}
                    disabled={regenerating}
                    className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-4 text-sm font-semibold hover:border-primary/60 hover:bg-[var(--app-billiard-hover)] disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleRegenerate()}
                    disabled={regenerating}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[var(--app-ember)] bg-[var(--app-ember)] px-4 text-sm font-semibold text-[var(--app-ink)] hover:bg-[#e27e5e] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <RefreshCw
                      className={cn("size-4", regenerating && "animate-spin")}
                      aria-hidden="true"
                    />
                    {regenerating ? "Regenerating…" : "Regenerate now"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingRegeneration(true)}
                className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[var(--app-ember)] px-4 text-sm font-semibold text-foreground hover:bg-[rgba(217,112,79,0.12)]"
              >
                <RefreshCw className="size-4" aria-hidden="true" />
                Regenerate secret
              </button>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

function SectionHeader({
  id,
  title,
  description,
}: {
  id: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 id={id} className="font-product-display text-2xl text-foreground">
        {title}
      </h2>
      <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function SettingsLoadError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <section
      aria-labelledby="settings-error-title"
      className="rounded-xl border border-[var(--app-ember)] bg-card p-5 sm:p-6"
    >
      <h2 id="settings-error-title" className="text-base font-semibold">
        Settings could not be loaded
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

function SettingsLoadingState({
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

function takePendingObsSecret(roomId: string): string | null {
  try {
    const key = `${PENDING_OBS_SECRET_PREFIX}${roomId}`;
    const secret = window.sessionStorage.getItem(key);
    if (secret) {
      window.sessionStorage.removeItem(key);
    }
    return secret;
  } catch {
    return null;
  }
}
