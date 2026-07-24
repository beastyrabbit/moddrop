import { describe, expect, it } from "vitest";
import { extractYouTubeId } from "@/components/stream-canvas/shapes/youtube/YouTubeEmbedShape";

const VIDEO_ID = "dQw4w9WgXcQ";

describe("extractYouTubeId", () => {
  it.each([
    ["watch URL", `https://www.youtube.com/watch?v=${VIDEO_ID}`],
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
  ])("returns null for a %s", (_label, url) => {
    expect(extractYouTubeId(url)).toBeNull();
  });
});
