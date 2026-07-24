import { describe, expect, it } from "vitest";
import { mediaFilenameFromUrl } from "@/lib/stream-canvas/media-filename";

describe("mediaFilenameFromUrl", () => {
  it("returns the decoded last path segment", () => {
    expect(
      mediaFilenameFromUrl("https://cdn.example.com/uploads/My%20Song.mp3"),
    ).toBe("My Song.mp3");
  });

  it("returns the raw segment when percent-decoding fails", () => {
    expect(
      mediaFilenameFromUrl("https://cdn.example.com/bad%2-escape.mp3"),
    ).toBe("bad%2-escape.mp3");
  });

  it("falls back when the URL has no usable segment", () => {
    expect(mediaFilenameFromUrl("")).toBe("audio");
    expect(mediaFilenameFromUrl("https://cdn.example.com/uploads/")).toBe(
      "audio",
    );
  });
});
