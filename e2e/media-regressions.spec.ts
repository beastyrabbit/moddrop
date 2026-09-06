import { expect, type Page, test } from "@playwright/test";

async function openEditor(page: Page) {
  await page.goto("/");
  await expect
    .poll(() => page.evaluate(() => Boolean(window.fixtureEditor)))
    .toBe(true);
}

async function setPolicy(
  page: Page,
  policy: "disabled" | "preview_only" | "allow_on_air",
) {
  await page.evaluate(async (youtubePolicy) => {
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
          youtubePolicy,
          acknowledgeYouTubeRisk: youtubePolicy === "allow_on_air",
        }),
      },
    );
    if (!response.ok) throw new Error("Policy update failed");
  }, policy);
}

test.afterEach(async ({ page }) => {
  await page.evaluate(() => {
    const editor = window.fixtureEditor;
    if (editor) editor.deleteShapes([...editor.getCurrentPageShapeIds()]);
  });
});

test("pasted and persisted YouTube embeds obey policy before OBS loads a player", async ({
  page,
  context,
}) => {
  await context.route(
    /https:\/\/(?:[^/]+\.)?(?:youtube\.com|youtube-nocookie\.com|youtu\.be)\//,
    (route) =>
      route.fulfill({
        contentType: "text/html",
        body: "<p>Local media fixture</p>",
      }),
  );
  await openEditor(page);
  await setPolicy(page, "preview_only");
  await page.evaluate(async () => {
    const editor = window.fixtureEditor;
    if (!editor) throw new Error("Editor missing");
    await editor.putExternalContent({
      type: "url",
      url: "https://WWW.YOUTUBE.COM/watch?v=%64Qw4w9WgXcQ",
      point: { x: 400, y: 300 },
    });
    editor.createShape({
      type: "embed",
      x: 800,
      y: 100,
      props: {
        w: 480,
        h: 270,
        url: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
      },
    });
    editor.createShape({
      type: "embed",
      x: 800,
      y: 400,
      props: {
        w: 480,
        h: 270,
        url: "https://WWW.YOUTUBE.COM/watch?v=%64Qw4w9WgXcQ",
      },
    });
  });
  const mirror = await context.newPage();
  const youtubeRequests: string[] = [];
  mirror.on("request", (request) => {
    if (/youtube(?:-nocookie)?\.com/.test(request.url()))
      youtubeRequests.push(request.url());
  });
  await mirror.goto("/?view=mirror");
  await expect(mirror.locator(".tl-shape")).toHaveCount(3);
  await expect(mirror.locator("iframe")).toHaveCount(0);
  expect(youtubeRequests).toEqual([]);
  await setPolicy(page, "disabled");
  await expect(
    page.getByText("YouTube is disabled by the room owner.").first(),
  ).toBeVisible();
  await page.evaluate(async () => {
    await window.fixtureEditor?.putExternalContent({
      type: "url",
      url: "https://youtu.be/dQw4w9WgXcQ",
      point: { x: 300, y: 600 },
    });
  });
  await expect(mirror.locator("iframe")).toHaveCount(0);
  expect(youtubeRequests).toEqual([]);
});

test("stationary OBS image recovers from both initial and renewal mint failures", async ({
  page,
  context,
}) => {
  test.setTimeout(75_000);
  await openEditor(page);
  await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 120;
    canvas.height = 80;
    const drawing = canvas.getContext("2d");
    if (!drawing) throw new Error("Canvas unavailable");
    drawing.fillStyle = "#225544";
    drawing.fillRect(0, 0, canvas.width, canvas.height);
    const png = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) =>
        blob ? resolve(blob) : reject(new Error("PNG generation failed")),
      ),
    );
    await window.fixtureEditor?.putExternalContent({
      type: "files",
      files: [new File([png], "recovery.png", { type: "image/png" })],
      point: { x: 400, y: 300 },
    });
  });
  const mirror = await context.newPage();
  let requests = 0;
  await mirror.route("**/obs/uploads/*/access-url", async (route) => {
    requests++;
    if (requests === 1 || requests === 3) {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Temporary local fixture outage" }),
      });
    } else await route.continue();
  });
  await mirror.goto("/?view=mirror");
  const loadedImageUrl = () =>
    mirror
      .locator(".tl-shape[data-shape-type='image'] img")
      .evaluateAll((images) => {
        const image = images.find(
          (element) =>
            element instanceof HTMLImageElement &&
            element.complete &&
            element.naturalWidth > 0,
        );
        return image instanceof HTMLImageElement ? image.currentSrc : "";
      });
  await expect.poll(loadedImageUrl, { timeout: 15_000 }).not.toBe("");
  const firstUrl = await loadedImageUrl();
  expect(requests).toBe(2);
  await expect
    .poll(() => requests, { timeout: 45_000 })
    .toBeGreaterThanOrEqual(4);
  await expect.poll(loadedImageUrl).not.toBe("");
  expect(await loadedImageUrl()).not.toBe(firstUrl);
});

test("YouTube script retries make a fresh request after an initial failure", async ({
  page,
}, testInfo) => {
  let requests = 0;
  await page.route("https://www.youtube.com/iframe_api", async (route) => {
    if (++requests === 1) return route.abort();
    await route.fulfill({
      contentType: "text/javascript",
      body: `
      window.YT = {
        PlayerState: { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 },
        Player: class {
          constructor(host, options) {
            this.host = host;
            this.iframe = document.createElement('iframe');
            this.iframe.title = 'Recovered local YouTube fixture';
            this.iframe.srcdoc = '<p>Recovered player</p>';
            host.replaceWith(this.iframe);
            setTimeout(() => options.events.onReady({ target: this }), 0);
          }
          getIframe() { return this.iframe; }
          destroy() { this.iframe.replaceWith(this.host); }
          cueVideoById() {} getCurrentTime() { return 0; } getPlayerState() { return 5; }
          mute() {} unMute() {} setVolume() {} seekTo() {} pauseVideo() {} playVideo() {}
        }
      };
      window.onYouTubeIframeAPIReady();
    `,
    });
  });
  await openEditor(page);
  await setPolicy(page, "preview_only");
  await page.evaluate(() => {
    window.fixtureEditor?.createShape({
      type: "youtube-embed",
      x: 200,
      y: 200,
      props: { url: "https://youtu.be/dQw4w9WgXcQ" },
    });
  });
  const retry = page.getByRole("button", { name: "Retry YouTube player" });
  await expect(retry).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("youtube-retry.png") });
  await retry.click();
  await expect(
    page.getByTitle("Recovered local YouTube fixture"),
  ).toBeVisible();
  expect(requests).toBe(2);
  await page.screenshot({ path: testInfo.outputPath("youtube-recovered.png") });
});
