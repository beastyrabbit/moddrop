import { describe, expect, it } from "vitest";
import {
  extractYouTubeId,
  isYouTubeUrl,
} from "@/components/stream-canvas/shapes/youtube/YouTubeEmbedShape";

const VIDEO_ID = "dQw4w9WgXcQ";

describe("extractYouTubeId", () => {
  it.each([
    ["watch URL", `https://www.youtube.com/watch?v=${VIDEO_ID}`],
    [
      "encoded ID and uppercase host",
      "https://WWW.YOUTUBE.COM/watch?v=%64Qw4w9WgXcQ",
    ],
    [
      "encoded embed ID",
      "https://www.youtube-nocookie.com/embed/%64Qw4w9WgXcQ",
    ],
    ["watch URL without www", `https://youtube.com/watch?v=${VIDEO_ID}`],
    ["watch URL without protocol", `youtube.com/watch?v=${VIDEO_ID}`],
    [
      "watch URL with extra params before v",
      `https://www.youtube.com/watch?feature=shared&v=${VIDEO_ID}`,
    ],
    [
      "watch URL with extra params after v",
      `https://www.youtube.com/watch?v=${VIDEO_ID}&t=42s`,
    ],
    ["short link", `https://youtu.be/${VIDEO_ID}`],
    ["short link with timestamp", `https://youtu.be/${VIDEO_ID}?t=10`],
    ["short link without protocol", `youtu.be/${VIDEO_ID}`],
    ["embed URL", `https://www.youtube.com/embed/${VIDEO_ID}`],
    ["shorts URL", `https://www.youtube.com/shorts/${VIDEO_ID}`],
    ["live URL", `https://www.youtube.com/live/${VIDEO_ID}`],
    ["surrounding whitespace", `  https://youtu.be/${VIDEO_ID}  `],
  ])("extracts the id from a %s", (_label, url) => {
    expect(extractYouTubeId(url)).toBe(VIDEO_ID);
  });

  it.each([
    ["empty string", ""],
    ["plain text", "not a url"],
    ["non-YouTube URL", "https://vimeo.com/123456789"],
    ["channel URL", "https://www.youtube.com/@somechannel"],
    ["watch URL without id", "https://www.youtube.com/watch"],
    ["id shorter than 11 chars", "https://youtu.be/short"],
    ["lookalike host", `https://notyoutube.com/watch?v=${VIDEO_ID}`],
    [
      "YouTube URL in unrelated query",
      `https://example.com/?next=https://youtube.com/watch?v=${VIDEO_ID}`,
    ],
  ])("returns null for a %s", (_label, url) => {
    expect(extractYouTubeId(url)).toBeNull();
  });
});

it("classifies the provider independently of video ID syntax", () => {
  expect(
    isYouTubeUrl("https://WWW.YOUTUBE.COM/embed/videoseries?list=fixture"),
  ).toBe(true);
  expect(isYouTubeUrl("https://www.youtube-nocookie.com/embed/invalid")).toBe(
    true,
  );
  expect(
    isYouTubeUrl("https://youtube.com.example.com/watch?v=dQw4w9WgXcQ"),
  ).toBe(false);
});
