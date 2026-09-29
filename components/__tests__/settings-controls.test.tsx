// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import Settings from "@/app/app/settings/page";

const state = vi.hoisted(() => ({
  token: vi.fn(async () => "test-token"),
  create: vi.fn(),
  update: vi.fn(),
  regenerate: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
  copy: vi.fn(),
}));
vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: true, getToken: state.token }),
  useClerk: () => ({}),
}));
vi.mock("sonner", () => ({
  toast: { error: state.error, success: state.success },
}));
vi.mock("@/components/stream-canvas/UserMultiSelect", () => ({
  UserMultiSelect: () => <div>Collaborators</div>,
}));
vi.mock("@/lib/stream-canvas/api", () => ({
  createRoom: state.create,
  updateRoom: state.update,
  regenerateSecret: state.regenerate,
}));

const room = {
  id: "room-fixture",
  allowedUsers: [],
  twitchChannel: null,
  youtubePolicy: "preview_only",
};
beforeEach(() => {
  vi.resetAllMocks();
  state.create.mockResolvedValue(room);
  state.update.mockResolvedValue(room);
  state.copy.mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: state.copy },
  });
});
afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
});

test("YouTube choices have accessible names and on-air saving requires renewed consent", async () => {
  render(<Settings />);
  const allow = await screen.findByRole("radio", { name: /^Allow on air/ });
  const preview = screen.getByRole("radio", {
    name: /^Moderator preview only/,
  });
  expect(screen.getByRole("radio", { name: /^Disabled/ })).toBeTruthy();
  const save = screen.getByRole("button", { name: "Save changes" });
  fireEvent.click(allow);
  expect(save.hasAttribute("disabled")).toBe(true);
  fireEvent.click(screen.getByRole("checkbox"));
  expect(save.hasAttribute("disabled")).toBe(false);
  fireEvent.click(preview);
  expect(screen.queryByRole("checkbox")).toBeNull();
  fireEvent.click(allow);
  expect(save.hasAttribute("disabled")).toBe(true);
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.change(screen.getByLabelText("Twitch channel"), {
    target: { value: "  channel  " },
  });
  fireEvent.click(save);
  await waitFor(() =>
    expect(state.update).toHaveBeenCalledWith(
      "room-fixture",
      {
        twitchChannel: "channel",
        allowedUsers: [],
        youtubePolicy: "allow_on_air",
        acknowledgeYouTubeRisk: true,
      },
      state.token,
    ),
  );
});

test("a pending OBS URL is consumed once, can be masked, and still copies the complete URL", async () => {
  window.sessionStorage.setItem(
    "moddrop:obsSetupSecret:room-fixture",
    "fixture-obs-secret",
  );
  const { container } = render(<Settings />);
  const hide = await screen.findByRole("button", { name: "Hide OBS URL" });
  const url = `${window.location.origin}/obs#secret=fixture-obs-secret`;
  expect(container.querySelector("code")?.textContent).toBe(url);
  expect(
    window.sessionStorage.getItem("moddrop:obsSetupSecret:room-fixture"),
  ).toBeNull();
  fireEvent.click(hide);
  expect(container.querySelector("code")?.textContent).not.toContain(
    "fixture-obs-secret",
  );
  fireEvent.click(screen.getByRole("button", { name: "Copy OBS URL" }));
  await waitFor(() => expect(state.copy).toHaveBeenCalledWith(url));
  fireEvent.click(screen.getByRole("button", { name: "Reveal OBS URL" }));
  expect(container.querySelector("code")?.textContent).toBe(url);
});

test("OBS regeneration requires confirmation, survives failure, and reveals the replacement", async () => {
  state.regenerate
    .mockRejectedValueOnce(new Error("Temporary failure"))
    .mockResolvedValue({ obsSecret: "fixture-replacement" });
  const { container } = render(<Settings />);
  const regenerate = await screen.findByRole("button", {
    name: "Regenerate secret",
  });
  expect(
    screen
      .getByRole("button", { name: "Copy OBS URL" })
      .hasAttribute("disabled"),
  ).toBe(true);
  fireEvent.click(regenerate);
  expect(state.regenerate).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.queryByRole("alert")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Regenerate secret" }));
  fireEvent.click(screen.getByRole("button", { name: "Regenerate now" }));
  await waitFor(() =>
    expect(state.error).toHaveBeenCalledWith("Temporary failure"),
  );
  fireEvent.click(screen.getByRole("button", { name: "Regenerate now" }));
  await waitFor(() =>
    expect(state.success).toHaveBeenCalledWith("OBS secret regenerated"),
  );
  expect(state.regenerate).toHaveBeenCalledTimes(2);
  expect(state.regenerate).toHaveBeenLastCalledWith(
    "room-fixture",
    state.token,
  );
  expect(screen.queryByRole("alert")).toBeNull();
  expect(container.querySelector("code")?.textContent).toContain(
    "fixture-replacement",
  );
  expect(
    screen
      .getByRole("button", { name: "Copy OBS URL" })
      .hasAttribute("disabled"),
  ).toBe(false);
});
