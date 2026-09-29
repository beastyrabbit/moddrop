// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { UserMultiSelect } from "@/components/stream-canvas/UserMultiSelect";

type User = { userId: string; username: string };
const state = vi.hoisted(() => ({
  results: undefined as User[] | undefined,
  resolved: undefined as User[] | undefined,
}));
vi.mock("convex/react", () => ({
  useQuery: (
    _query: unknown,
    args: "skip" | { prefix: string } | { userIds: string[] },
  ) => {
    if (args === "skip") return undefined;
    return "prefix" in args ? state.results : state.resolved;
  },
}));
beforeEach(() => {
  state.results = undefined;
  state.resolved = undefined;
});
afterEach(cleanup);

test("search transitions through loading, empty, and filtered results without losing selection controls", () => {
  const select = vi.fn();
  const props = { value: ["user_ava"], onChange: select, inputId: "members" };
  const { rerender } = render(<UserMultiSelect {...props} />);
  expect(screen.getByText("Loading user…")).toBeTruthy();
  const input = screen.getByRole("combobox");
  fireEvent.change(input, { target: { value: " a " } });
  expect(screen.getByRole("option").getAttribute("aria-disabled")).toBe("true");
  expect(screen.getByText("Searching…")).toBeTruthy();
  state.results = [];
  state.resolved = [{ userId: "user_ava", username: "Ava" }];
  rerender(<UserMultiSelect {...props} />);
  expect(screen.getByText("No users found for “a”.")).toBeTruthy();
  state.results = [...state.resolved, { userId: "user_ben", username: "Ben" }];
  rerender(<UserMultiSelect {...props} />);
  expect(screen.getAllByRole("option")).toHaveLength(1);
  fireEvent.click(screen.getByRole("option", { name: /^Ben/ }));
  expect(select).toHaveBeenCalledWith(["user_ava", "user_ben"]);
  expect(input.getAttribute("aria-expanded")).toBe("false");
  expect(document.activeElement).toBe(input);
  fireEvent.click(screen.getByRole("button", { name: "Remove Ava" }));
  expect(select).toHaveBeenLastCalledWith([]);
});

test("keyboard navigation wraps, clamps after results change, and Escape dismisses results", () => {
  state.results = [
    { userId: "user_ava", username: "Ava" },
    { userId: "user_ben", username: "Ben" },
  ];
  const select = vi.fn();
  const { rerender } = render(
    <UserMultiSelect value={[]} onChange={select} inputId="members" />,
  );
  const input = screen.getByRole("combobox");
  fireEvent.change(input, { target: { value: "a" } });
  fireEvent.keyDown(input, { key: "ArrowUp" });
  expect(input.getAttribute("aria-activedescendant")).toBe("members-results-1");
  state.results = [state.results[0]];
  rerender(<UserMultiSelect value={[]} onChange={select} inputId="members" />);
  expect(input.getAttribute("aria-activedescendant")).toBe("members-results-0");
  fireEvent.keyDown(input, { key: "Escape" });
  expect(screen.queryByRole("listbox")).toBeNull();
  fireEvent.keyDown(input, { key: "Enter" });
  expect(select).not.toHaveBeenCalled();
  fireEvent.focus(input);
  fireEvent.keyDown(input, { key: "Enter" });
  expect(select).toHaveBeenCalledWith(["user_ava"]);
});
