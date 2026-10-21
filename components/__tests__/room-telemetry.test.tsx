// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import RoomPage from "@/app/app/rooms/[roomId]/page";
import ErrorPage from "@/app/error";
import GlobalError from "@/app/global-error";
import OBSError from "@/app/obs/error";
import { getAccessibleRooms } from "@/lib/stream-canvas/api";
import {
  ReportedError,
  reportBoundaryError,
  reportError,
} from "@/lib/telemetry/browser-errors";
import { track } from "@/lib/telemetry/events";

const mocks = vi.hoisted(() => ({
  getToken: vi.fn(async () => "test-token"),
  fetch: vi.fn<typeof fetch>(),
  roomId: "room-fixture",
}));
vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({
    isLoaded: true,
    isSignedIn: true,
    getToken: mocks.getToken,
  }),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/app/rooms/room-fixture",
  useParams: () => ({ roomId: mocks.roomId }),
}));
vi.mock("@/components/stream-canvas/CanvasEditor", () => ({
  CanvasEditor: () => <div>Editor connected</div>,
}));
vi.mock("@/components/legal/legal-footer", () => ({ LegalFooter: () => null }));
vi.mock("@/lib/telemetry/browser-errors", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/telemetry/browser-errors")>()),
  reportError: vi.fn(),
  reportBoundaryError: vi.fn(),
  startErrorReporting: vi.fn(),
}));
vi.mock("@/lib/telemetry/events", () => ({ track: vi.fn() }));

beforeEach(() => {
  mocks.roomId = "room-fixture";
  mocks.getToken.mockResolvedValue("test-token");
  vi.stubGlobal("fetch", mocks.fetch);
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  vi.unstubAllGlobals();
});

test.each([new TypeError("Failed to fetch"), "request failed"])(
  "reports a network failure once through the API and room page: %s",
  async (error) => {
    mocks.fetch.mockRejectedValue(error);
    render(<RoomPage />);
    await screen.findByRole("alert");
    expect(reportError).toHaveBeenCalledExactlyOnceWith(
      new Error("Canvas API network request failed"),
    );
    expect(track).toHaveBeenCalledExactlyOnceWith("failure", {
      operation: "api",
      reason: "network",
    });
  },
);

test.each([500, 503])("reports HTTP %s only once", async (status) => {
  mocks.fetch.mockResolvedValue(
    Response.json({ error: "Unavailable" }, { status }),
  );
  render(<RoomPage />);
  expect((await screen.findByRole("alert")).textContent).toContain(
    "Unavailable",
  );
  expect(reportError).toHaveBeenCalledExactlyOnceWith(
    new Error(`Canvas API failed (${status})`),
  );
  expect(track).toHaveBeenCalledExactlyOnceWith("failure", {
    operation: "api",
    reason: "rejected",
  });
});

test("reports an unreported HTTP failure once in the room page", async () => {
  mocks.fetch.mockResolvedValue(
    Response.json({ error: "Forbidden" }, { status: 403 }),
  );
  render(<RoomPage />);
  expect((await screen.findByRole("alert")).textContent).toContain("Forbidden");
  expect(reportError).toHaveBeenCalledExactlyOnceWith(new Error("Forbidden"));
  expect(track).toHaveBeenCalledExactlyOnceWith("failure", {
    operation: "room",
    reason: "rejected",
  });
});

test("a missing room emits one room failure without an error report and remains retryable", async () => {
  mocks.fetch.mockResolvedValueOnce(Response.json([])).mockResolvedValueOnce(
    Response.json([
      {
        id: "room-fixture",
        twitchChannel: null,
        youtubePolicy: "preview_only",
      },
    ]),
  );
  render(<RoomPage />);
  expect((await screen.findByRole("alert")).textContent).toContain(
    "This room is unavailable or you no longer have access.",
  );
  expect(reportError).not.toHaveBeenCalled();
  expect(track).toHaveBeenCalledExactlyOnceWith("failure", {
    operation: "room",
    reason: "rejected",
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Retry room connection" }),
  );
  expect(await screen.findByText("Editor connected")).toBeTruthy();
  expect(reportError).not.toHaveBeenCalled();
  expect(track).toHaveBeenNthCalledWith(2, "room_opened", {});
  expect(track).toHaveBeenCalledTimes(2);
});

test.each([200, 403])(
  "a cancelled room load returning HTTP %s has no room side effects",
  async (status) => {
    const pending = Promise.withResolvers<Response>();
    mocks.fetch.mockReturnValueOnce(pending.promise).mockResolvedValueOnce(
      Response.json([
        {
          id: "next-room",
          twitchChannel: null,
          youtubePolicy: "preview_only",
        },
      ]),
    );
    const { rerender } = render(<RoomPage />);
    await act(async () => {});
    expect(mocks.fetch).toHaveBeenCalledOnce();
    mocks.roomId = "next-room";
    rerender(<RoomPage />);
    expect(await screen.findByText("Editor connected")).toBeTruthy();
    vi.mocked(track).mockClear();
    await act(async () => {
      pending.resolve(
        Response.json(status === 200 ? [] : { error: "Forbidden" }, { status }),
      );
    });
    expect(track).not.toHaveBeenCalled();
    expect(reportError).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText("Editor connected")).toBeTruthy();
  },
);

test.each([
  ["app boundary", ErrorPage],
  ["global boundary", GlobalError],
  ["OBS boundary", OBSError],
] as const)(
  "%s delegates API, client and server errors to the shared boundary reporter",
  async (_label, Boundary) => {
    mocks.fetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const error = await getAccessibleRooms(mocks.getToken).catch(
      (error: unknown) => error,
    );
    if (!(error instanceof ReportedError))
      throw new Error("Expected a reported API error");
    // GlobalError also requests local configuration; no request leaves the fixture.
    mocks.fetch.mockResolvedValue(Response.json({}));
    const container = Boundary === GlobalError ? document : undefined;
    const { rerender } = render(<Boundary error={error} reset={() => {}} />, {
      container,
    });
    expect(reportError).toHaveBeenCalledTimes(1);
    expect(reportBoundaryError).toHaveBeenCalledExactlyOnceWith(error);
    expect(track).toHaveBeenCalledTimes(1);
    const unexpected = new Error("Unexpected rendering failure");
    rerender(<Boundary error={unexpected} reset={() => {}} />);
    expect(reportBoundaryError).toHaveBeenCalledTimes(2);
    expect(reportBoundaryError).toHaveBeenLastCalledWith(unexpected);
    const serverError = Object.assign(new Error("Server rendering failure"), {
      digest: "fixture",
    });
    rerender(<Boundary error={serverError} reset={() => {}} />);
    expect(reportBoundaryError).toHaveBeenCalledTimes(3);
    expect(reportBoundaryError).toHaveBeenLastCalledWith(serverError);
    expect(reportError).toHaveBeenCalledTimes(1);
  },
);
