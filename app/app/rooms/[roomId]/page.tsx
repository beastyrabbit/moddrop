"use client";

import { useAuth } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CanvasEditor } from "@/components/stream-canvas/CanvasEditor";
import { getAccessibleRooms } from "@/lib/stream-canvas/api";
import type { YouTubePolicy } from "@/lib/stream-canvas/types";

export default function StreamCanvasRoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [twitchChannel, setTwitchChannel] = useState<string | null>(null);
  const [youtubePolicy, setYouTubePolicy] =
    useState<YouTubePolicy>("preview_only");
  const [loadedRoomId, setLoadedRoomId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // Fetch this room's Twitch channel from the accessible rooms list
  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt explicitly retries the same request
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;
    setError(null);
    getAccessibleRooms(getToken)
      .then((rooms) => {
        const room = rooms.find((r) => r.id === roomId);
        if (!room)
          throw new Error(
            "This room is unavailable or you no longer have access.",
          );
        if (!cancelled) {
          setTwitchChannel(room.twitchChannel);
          setYouTubePolicy(room.youtubePolicy);
          setLoadedRoomId(roomId);
        }
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load room");
      });
    return () => {
      cancelled = true;
    };
  }, [getToken, isLoaded, isSignedIn, roomId, attempt]);

  if (isLoaded && !isSignedIn)
    return <p className="p-6">Sign in to open this room.</p>;
  if (error)
    return (
      <div
        role="alert"
        className="flex h-screen flex-col items-center justify-center gap-4 p-6 text-center"
      >
        <p>{error}</p>
        <button
          type="button"
          className="rounded border px-4 py-2"
          onClick={() => setAttempt((value) => value + 1)}
        >
          Retry room connection
        </button>
      </div>
    );
  if (loadedRoomId !== roomId)
    return (
      <p role="status" className="p-6">
        Loading room…
      </p>
    );

  return (
    <div className="fixed inset-0 overflow-hidden">
      <CanvasEditor
        key={roomId}
        roomId={roomId}
        twitchChannel={twitchChannel}
        youtubePolicy={youtubePolicy}
      />
    </div>
  );
}
