// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import {
  MediaPreferencesProvider,
  useMediaPreference,
} from "@/components/stream-canvas/media-preferences";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function PreferenceControl() {
  const preference = useMediaPreference("sound");
  return (
    <button
      type="button"
      onClick={() => preference.setEnabled(!preference.enabled)}
    >
      {preference.enabled ? "Monitoring on" : "Monitoring off"}
    </button>
  );
}

test.each(["read", "write"])(
  "unavailable storage on %s keeps monitoring usable in memory",
  (failure) => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      if (failure === "read")
        throw new DOMException("Storage blocked", "SecurityError");
      return null;
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Storage full", "QuotaExceededError");
    });
    render(
      <MediaPreferencesProvider roomId="storage-room" userId="storage-user">
        <PreferenceControl />
      </MediaPreferencesProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Monitoring off" }));
    expect(screen.getByRole("button", { name: "Monitoring on" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Monitoring on" }));
    expect(screen.getByRole("button", { name: "Monitoring off" })).toBeTruthy();
  },
);
