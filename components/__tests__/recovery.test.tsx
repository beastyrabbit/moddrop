// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { UserRecordBootstrap } from "../user-record-bootstrap";
import { UserMultiSelect } from "../stream-canvas/UserMultiSelect";
import { TwitchPreview } from "../stream-canvas/TwitchPreview";

const state = vi.hoisted(() => ({ bootstrap: vi.fn(), authenticated: true }));
vi.mock("convex/react", () => ({
  useConvexAuth: () => ({ isAuthenticated: state.authenticated }),
  useMutation: () => state.bootstrap,
  useQuery: () => [
    { userId: "user_ava", username: "Ava" },
    { userId: "user_ben", username: "Ben" },
  ],
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
vi.mock("../stream-canvas/media-preferences", () => ({
  useMediaPreference: () => ({ enabled: false, volume: 1 }),
}));
beforeEach(() => {
  vi.useFakeTimers();
  state.bootstrap.mockReset();
  state.authenticated = true;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  delete window.Twitch;
  document.querySelectorAll("script").forEach((script) => {
    script.remove();
  });
});

test("profile bootstrap retries transient failures and cancels after sign out", async () => {
  state.bootstrap
    .mockRejectedValueOnce(new Error("temporary"))
    .mockResolvedValue({});
  const { rerender } = render(<UserRecordBootstrap />);
  await act(async () => {});
  await act(() => vi.advanceTimersByTimeAsync(1_000));
  expect(state.bootstrap).toHaveBeenCalledTimes(2);
  state.authenticated = false;
  rerender(<UserRecordBootstrap />);
  await act(() => vi.advanceTimersByTimeAsync(10_000));
  expect(state.bootstrap).toHaveBeenCalledTimes(2);
});

test("collaborator selection follows arrow keys and Enter without submitting settings", () => {
  const select = vi.fn();
  const submit = vi.fn((event: React.FormEvent) => event.preventDefault());
  render(
    <form onSubmit={submit}>
      <UserMultiSelect value={[]} onChange={select} inputId="members" />
    </form>,
  );
  const input = screen.getByRole("combobox");
  fireEvent.change(input, { target: { value: "a" } });
  fireEvent.keyDown(input, { key: "ArrowDown" });
  expect(input.getAttribute("aria-activedescendant")).toBe("members-results-1");
  fireEvent.keyDown(input, { key: "Enter" });
  expect(select).toHaveBeenCalledWith(["user_ben"]);
  expect(submit).not.toHaveBeenCalled();
});

test("failed Twitch script is removed and visible retry initializes a fresh preview", async () => {
  render(
    <TwitchPreview
      channel="example"
      hostname="localhost"
      interactive={false}
    />,
  );
  const first = document.querySelector("script");
  expect(first).not.toBeNull();
  await act(async () => first?.dispatchEvent(new Event("error")));
  expect(first?.isConnected).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "Retry Twitch preview" }));
  const second = document.querySelector("script");
  expect(second).not.toBe(first);
  const mounted = vi.fn();
  class Embed {
    static VIDEO = "video";
    static VIDEO_READY = "ready";
    constructor() {
      mounted();
    }
    addEventListener() {}
    getPlayer() {
      return { setMuted() {}, setVolume() {} };
    }
  }
  window.Twitch = { Embed };
  await act(async () => second?.dispatchEvent(new Event("load")));
  expect(mounted).toHaveBeenCalledOnce();
  expect(screen.queryByRole("alert")).toBeNull();
});
