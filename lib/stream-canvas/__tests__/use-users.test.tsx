// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { useResolvedUsers, useUserSearch } from "@/lib/stream-canvas/use-users";

const api = vi.hoisted(() => ({
  searchUsers: vi.fn(),
  resolveUsers: vi.fn(),
}));
const getToken = vi.hoisted(() => async () => "test-token");
vi.mock("@clerk/nextjs", () => ({ useAuth: () => ({ getToken }) }));
vi.mock("@/lib/stream-canvas/api", () => api);

const ava = { userId: "user_ava", username: "Ava", showProfilePic: true };

beforeEach(() => {
  vi.useFakeTimers();
  api.searchUsers.mockReset();
  api.resolveUsers.mockReset();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

test("search debounces keystrokes and never reports results for an older prefix", async () => {
  api.searchUsers.mockResolvedValue([ava]);
  const { result, rerender } = renderHook(
    ({ prefix }) => useUserSearch(prefix),
    { initialProps: { prefix: " " } },
  );
  await act(() => vi.advanceTimersByTimeAsync(500));
  expect(api.searchUsers).not.toHaveBeenCalled();
  expect(result.current.results).toBeUndefined();

  rerender({ prefix: "a" });
  rerender({ prefix: " av " });
  await act(() => vi.advanceTimersByTimeAsync(150));
  expect(api.searchUsers).toHaveBeenCalledOnce();
  expect(api.searchUsers).toHaveBeenCalledWith("av", getToken);
  expect(result.current.results).toEqual([ava]);

  rerender({ prefix: "b" });
  expect(result.current.results).toBeUndefined();
});

test("a failed search reports null and retry refetches the same prefix", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  api.searchUsers.mockRejectedValueOnce(new Error("offline"));
  api.searchUsers.mockResolvedValue([ava]);
  const { result } = renderHook(() => useUserSearch("av"));
  await act(() => vi.advanceTimersByTimeAsync(150));
  expect(result.current.results).toBeNull();

  act(() => result.current.retry());
  expect(result.current.results).toBeUndefined();
  await act(() => vi.advanceTimersByTimeAsync(150));
  expect(api.searchUsers).toHaveBeenCalledTimes(2);
  expect(result.current.results).toEqual([ava]);
});

test("resolution sends the selected IDs and degrades to an empty list on failure", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  api.resolveUsers.mockRejectedValue(new Error("offline"));
  const { result } = renderHook(() =>
    useResolvedUsers(["user_ava", "user_ben"]),
  );
  await act(() => vi.advanceTimersByTimeAsync(0));
  expect(api.resolveUsers).toHaveBeenCalledWith(
    ["user_ava", "user_ben"],
    getToken,
  );
  expect(result.current).toEqual([]);
});
