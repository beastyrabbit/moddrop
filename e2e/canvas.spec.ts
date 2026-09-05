import { expect, test, type Locator } from "@playwright/test";

test("audio reloads a failed media request when recovery returns the same URL", async ({
  page,
}) => {
  const wav = Buffer.alloc(44 + 16_000 * 10);
  wav.write("RIFF");
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(8_000, 24);
  wav.writeUInt32LE(16_000, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(wav.length - 44, 40);
  let attempts = 0;
  await page.route("**/recovery.wav", async (route) => {
    if (++attempts === 1) {
      await route.fulfill({ status: 503, body: "Temporarily unavailable" });
      return;
    }
    await route.fulfill({ contentType: "audio/wav", body: wav });
  });
  await page.goto("/");
  await expect
    .poll(() => page.evaluate(() => Boolean(window.fixtureEditor)))
    .toBe(true);
  await page.evaluate(() => {
    window.fixtureEditor?.createShape({
      type: "audio-player",
      x: 150,
      y: 400,
      props: {
        url: `${location.origin}/recovery.wav`,
        volume: 0,
        isPlaying: false,
        playbackPosition: 3,
        playbackUpdatedAt: Date.now(),
      },
    });
  });
  const audio = page.locator("audio");
  await expect
    .poll(() => mediaState(audio).then((state) => state.readyState))
    .toBeGreaterThanOrEqual(2);
  expect(attempts).toBe(2);
  await expect
    .poll(() => mediaState(audio).then((state) => state.currentTime))
    .toBeCloseTo(3, 1);
});

test("audio and paused native video retain their timeline when signed URLs renew", async ({
  page,
  context,
}) => {
  test.setTimeout(60_000);
  await page.goto("/");
  await expect
    .poll(() => page.evaluate(() => Boolean(window.fixtureEditor)))
    .toBe(true);
  await page.evaluate(async () => {
    const editor = window.fixtureEditor;
    if (!editor) throw new Error("Editor missing");
    const session = await (await fetch("/__test/session")).json();
    // A silent two-minute PCM fixture, generated locally without external media.
    const bytes = new Uint8Array(44 + 8_000 * 2 * 120);
    const view = new DataView(bytes.buffer);
    const text = (offset: number, value: string) => {
      for (let i = 0; i < value.length; i++)
        bytes[offset + i] = value.charCodeAt(i);
    };
    text(0, "RIFF");
    view.setUint32(4, bytes.length - 8, true);
    text(8, "WAVE");
    text(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, 8000, true);
    view.setUint32(28, 16000, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    text(36, "data");
    view.setUint32(40, bytes.length - 44, true);
    const body = new FormData();
    body.set("file", new File([bytes], "silence.wav", { type: "audio/wav" }));
    const response = await fetch(
      `http://127.0.0.1:4312/api/rooms/${session.roomId}/upload`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
        body,
      },
    );
    if (!response.ok) throw new Error("Fixture audio upload failed");
    const upload = await response.json();
    editor.createShape({
      type: "audio-player",
      x: 150,
      y: 400,
      props: {
        url: upload.url,
        volume: 0,
        loop: true,
        isPlaying: true,
        playbackPosition: 10,
        playbackUpdatedAt: Date.now(),
      },
    });
    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 90;
    const drawing = canvas.getContext("2d");
    const stream = canvas.captureStream(10);
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => chunks.push(event.data);
    const finished = new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
    });
    const interval = setInterval(() => {
      if (drawing) {
        drawing.fillStyle = "#225544";
        drawing.fillRect(0, 0, 160, 90);
      }
    }, 50);
    recorder.start();
    await new Promise((resolve) => setTimeout(resolve, 800));
    recorder.stop();
    const video = await finished;
    clearInterval(interval);
    stream.getTracks().forEach((track) => {
      track.stop();
    });
    await editor.putExternalContent({
      type: "files",
      files: [new File([video], "fixture.webm", { type: "video/webm" })],
      point: { x: 800, y: 500 },
    });
  });
  const video = page.locator("video");
  await expect
    .poll(() => mediaState(video).then((state) => state.readyState))
    .toBeGreaterThanOrEqual(2);
  await video.evaluate((element) => {
    if (!(element instanceof HTMLVideoElement))
      throw new Error("Expected video");
    element.pause();
    element.currentTime = 0.2;
  });
  const initialVideoUrl = (await mediaState(video)).currentSrc;
  const mirror = await context.newPage();
  await mirror.goto("/?view=mirror");
  const audio = mirror.locator("audio");
  await expect
    .poll(() => mediaState(audio).then((state) => state.currentTime))
    .toBeGreaterThan(9);
  const initialAudioUrl = await audio.getAttribute("src");
  const started = Date.now();
  const initialTime = await mediaState(audio).then(
    (state) => state.currentTime,
  );
  await expect
    .poll(() => audio.getAttribute("src"), { timeout: 40_000 })
    .not.toBe(initialAudioUrl);
  await expect
    .poll(() => mediaState(audio).then((state) => state.readyState))
    .toBeGreaterThanOrEqual(2);
  const expectedTime = initialTime + (Date.now() - started) / 1000;
  expect(
    Math.abs(
      (await mediaState(audio).then((state) => state.currentTime)) -
        expectedTime,
    ),
  ).toBeLessThan(2);
  await expect
    .poll(() => mediaState(video).then((state) => state.currentSrc), {
      timeout: 10_000,
    })
    .not.toBe(initialVideoUrl);
  expect(await mediaState(video).then((state) => state.paused)).toBe(true);
  expect(
    await mediaState(video).then((state) => state.currentTime),
  ).toBeCloseTo(0.2, 1);
});

test("an edit reaches OBS and saved policy changes update the running mirror", async ({
  page,
  context,
}, testInfo) => {
  await page.goto("/");
  await expect
    .poll(() => page.evaluate(() => Boolean(window.fixtureEditor)))
    .toBe(true);
  const mirror = await context.newPage();
  await mirror.goto("/?view=mirror");
  await page.evaluate(() => {
    window.fixtureEditor?.createShape({
      type: "geo",
      x: 100,
      y: 100,
      props: { w: 320, h: 180, color: "green" },
    });
    window.fixtureEditor?.createShape({
      type: "youtube-embed",
      x: 450,
      y: 100,
      props: { w: 480, h: 270, url: "", volume: 1 },
    });
  });
  await expect(mirror.locator(".tl-shape[data-shape-type='geo']")).toHaveCount(
    1,
  );
  await page.evaluate(async () => {
    const session = await (await fetch("/__test/session")).json();
    const response = await fetch(
      `http://127.0.0.1:4312/api/rooms/${session.roomId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          youtubePolicy: "allow_on_air",
          acknowledgeYouTubeRisk: true,
        }),
      },
    );
    if (!response.ok) throw new Error("Policy update failed");
  });
  await expect(
    mirror.locator("svg > title", { hasText: "YouTube video placeholder" }),
  ).toHaveCount(1);
  await mirror.screenshot({
    path: testInfo.outputPath("obs-allowed.png"),
    omitBackground: true,
  });
  await page.evaluate(async () => {
    const session = await (await fetch("/__test/session")).json();
    const response = await fetch(
      `http://127.0.0.1:4312/api/rooms/${session.roomId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ youtubePolicy: "disabled" }),
      },
    );
    if (!response.ok) throw new Error("Policy update failed");
  });
  await expect(
    page.getByRole("button", { name: "YouTube", exact: true }),
  ).toHaveCount(0);
  await expect(mirror.locator(".tl-shape[data-shape-type='geo']")).toHaveCount(
    1,
  );
  await page.screenshot({ path: testInfo.outputPath("editor.png") });
  await expect(
    mirror.locator("svg > title", { hasText: "YouTube video placeholder" }),
  ).toHaveCount(0);
  await mirror.screenshot({
    path: testInfo.outputPath("obs.png"),
    omitBackground: true,
  });
  await page.reload();
  await expect(page.locator(".tl-shape[data-shape-type='geo']")).toHaveCount(1);
});

test("collaborator keyboard navigation and Twitch retry recover in the browser", async ({
  page,
}, testInfo) => {
  let attempts = 0;
  await page.route("https://embed.twitch.tv/embed/v1.js", async (route) => {
    if (++attempts === 1) {
      await route.abort();
      return;
    }
    await route.fulfill({
      contentType: "text/javascript",
      body: `window.Twitch = { Embed: class {
      static VIDEO = "video"; static VIDEO_READY = "ready";
      constructor(host) { host.textContent = "Preview connected"; }
      addEventListener(_event, callback) { callback(); }
      getPlayer() { return { setVolume() {}, setMuted() {} }; }
    }};`,
    });
  });
  await page.goto("/?view=controls");
  const input = page.getByRole("combobox");
  await input.fill("a");
  await input.press("ArrowDown");
  await expect(input).toHaveAttribute(
    "aria-activedescendant",
    "members-results-1",
  );
  await page.screenshot({
    path: testInfo.outputPath("collaborators-retry.png"),
  });
  await input.press("Enter");
  await expect(
    page.getByRole("button", { name: "Remove Ben Carter" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Retry Twitch preview" }).click();
  await expect(page.getByText("Preview connected")).toBeVisible();
});

async function mediaState(locator: Locator) {
  return locator.evaluate((element) => {
    if (!(element instanceof HTMLMediaElement))
      throw new Error("Expected media");
    return {
      readyState: element.readyState,
      currentTime: element.currentTime,
      paused: element.paused,
      currentSrc: element.currentSrc,
    };
  });
}
