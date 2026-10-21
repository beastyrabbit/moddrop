"use client";

export default function OBSError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex h-screen items-center justify-center gap-4 text-sm text-white/60"
    >
      <p>OBS output unavailable.</p>
      <button type="button" onClick={reset} className="underline">
        Try again
      </button>
    </div>
  );
}
