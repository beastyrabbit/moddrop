export interface SyncedPlaybackProps {
  isPlaying?: boolean;
  playbackPosition?: number;
  playbackUpdatedAt?: number;
}

/**
 * Current playback position of a synced media shape: the shared position
 * plus elapsed wall-clock time since it was last written, when playing.
 */
export function getSyncedMediaPlaybackPosition(props: SyncedPlaybackProps) {
  const playbackPosition = props.playbackPosition ?? 0;

  if (!props.isPlaying) {
    return playbackPosition;
  }

  return (
    playbackPosition +
    Math.max(0, Date.now() - (props.playbackUpdatedAt ?? 0)) / 1000
  );
}
