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

  // Fetch this room's Twitch channel from the accessible rooms list
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;
    getAccessibleRooms(getToken)
      .then((rooms) => {
        const room = rooms.find((r) => r.id === roomId);
        if (!cancelled && room) {
          setTwitchChannel(room.twitchChannel);
          setYouTubePolicy(room.youtubePolicy);
        }
      })
      .catch((err) => {
        if (!cancelled)
          console.error("[stream-canvas] Failed to load room info:", err);
      });
    return () => {
      cancelled = true;
    };
  }, [getToken, isLoaded, isSignedIn, roomId]);

  return (
    <div className="fixed inset-0 overflow-hidden">
      <CanvasEditor
        roomId={roomId}
        twitchChannel={twitchChannel}
        youtubePolicy={youtubePolicy}
      />
    </div>
  );
}
