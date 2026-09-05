// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import Settings from "@/app/app/settings/page";
import RoomPage from "@/app/app/rooms/[roomId]/page";

const state = vi.hoisted(() => ({
  token: vi.fn(async () => "test-token"),
  create: vi.fn(),
  update: vi.fn(),
  list: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
}));
vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: true, getToken: state.token }),
  useClerk: () => ({}),
}));
vi.mock("next/navigation", () => ({
  useParams: () => ({ roomId: "room-fixture" }),
}));
vi.mock("sonner", () => ({
  toast: { error: state.error, success: state.success },
}));
vi.mock("@/components/stream-canvas/UserMultiSelect", () => ({
  UserMultiSelect: () => <div>Collaborators</div>,
}));
vi.mock("@/components/stream-canvas/CanvasEditor", () => ({
  CanvasEditor: () => <div>Editor connected</div>,
}));
vi.mock("@/lib/stream-canvas/api", () => ({
  createRoom: state.create,
  updateRoom: state.update,
  getAccessibleRooms: state.list,
  regenerateSecret: vi.fn(),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const room = {
  id: "room-fixture",
  allowedUsers: [],
  twitchChannel: null,
  youtubePolicy: "preview_only",
};

test("room metadata failure is visible and retry opens the editor", async () => {
  state.list
    .mockRejectedValueOnce(new Error("Room info unavailable"))
    .mockResolvedValue([room]);
  render(<RoomPage />);
  expect((await screen.findByRole("alert")).textContent).toContain(
    "Room info unavailable",
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Retry room connection" }),
  );
  expect(await screen.findByText("Editor connected")).toBeTruthy();
});

test("failed settings submission stays retryable and reports success only after saving", async () => {
  state.create.mockResolvedValue(room);
  state.update
    .mockRejectedValueOnce(new Error("Save unavailable"))
    .mockResolvedValue(room);
  render(<Settings />);
  const save = await screen.findByRole("button", { name: "Save changes" });
  fireEvent.click(save);
  await waitFor(() =>
    expect(state.error).toHaveBeenCalledWith("Save unavailable"),
  );
  expect(state.success).not.toHaveBeenCalled();
  fireEvent.click(save);
  await waitFor(() =>
    expect(state.success).toHaveBeenCalledWith("Settings saved"),
  );
});
