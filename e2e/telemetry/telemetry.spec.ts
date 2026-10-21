import { expect, type Page, test } from "@playwright/test";

const trackerScript = `(() => {
  const script = document.currentScript;
  let cache;
  window.umami = {
    track: async (payload) => {
      const res = await fetch('/api/send', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({type:'event',payload}) });
      cache = (await res.json()).cache;
    },
    getSession: () => ({cache, website: script.dataset.websiteId})
  };
})();`;
const recorderScript = `(async () => {
  const website = document.currentScript.dataset.websiteId;
  const config = await (await fetch('/api/websites/' + website + '/recorder')).json();
  if (!config.enabled) return;
  await fetch('/api/record', {method:'POST', body: JSON.stringify({type:'record',payload:{website,timestamp:Date.now(),events:[{type:4,data:{href:location.href}},{type:2,data:{node:{tagName:'input',textContent:'person@example.com',attributes:{value:'fixture-sensitive',src:'private-media'}}}}]}})});
})();`;

async function fixture(page: Page) {
  const requests: string[] = [];
  const bodies: string[] = [];
  const envelopes: string[] = [];
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    // Clerk stays signed out/unloaded, just as when blocked by an extension.
    // The public page and consent UI hydrate independently. No auth bypass is
    // compiled into the production application and no third-party call escapes.
    if (url.hostname !== "127.0.0.1") {
      return route.fulfill({
        status: 200,
        contentType: "application/javascript",
        body: "",
      });
    }
    if (
      ["/script.js", "/recorder.js", "/api/send", "/api/record"].includes(
        url.pathname,
      ) ||
      url.pathname.endsWith("/recorder")
    ) {
      requests.push(url.pathname);
      if (route.request().postData())
        bodies.push(route.request().postData() ?? "");
      if (url.pathname === "/script.js")
        return route.fulfill({
          contentType: "application/javascript",
          body: trackerScript,
        });
      if (url.pathname === "/recorder.js")
        return route.fulfill({
          contentType: "application/javascript",
          body: recorderScript,
        });
      return route.fulfill({
        json: url.pathname.endsWith("/recorder")
          ? {
              enabled: true,
              replayEnabled: true,
              heatmapEnabled: true,
              sampleRate: 1,
              heatmapSampleRate: 1,
            }
          : { cache: "fixture-memory-session" },
      });
    }
    if (url.pathname === "/api/10/envelope/") {
      envelopes.push(route.request().postData() ?? "");
      return route.fulfill({ json: {} });
    }
    return route.continue();
  });
  return { requests, bodies, envelopes };
}

async function assertStorage(page: Page, consent: boolean) {
  const cookies = await page.context().cookies();
  expect(cookies.map((cookie) => cookie.name)).toEqual(
    consent ? ["moddrop_consent"] : [],
  );
  if (consent)
    expect(cookies[0].expires - Date.now() / 1000).toBeGreaterThan(179 * 86400);
  expect(
    await page.evaluate(() => ({
      local: Object.keys(localStorage),
      session: Object.keys(sessionStorage),
    })),
  ).toEqual({ local: [], session: [] });
}

test("room to room history navigation sends two scrubbed pageviews", async ({
  page,
}) => {
  const stub = await fixture(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Accept all", exact: true }).click();
  await expect.poll(() => stub.requests).toContain("/api/send");
  const roomPageviews = () =>
    stub.bodies.filter((body) => {
      const event = JSON.parse(body);
      return (
        event.type === "event" &&
        !event.payload.name &&
        new URL(event.payload.url).pathname === "/app/rooms/[redacted]"
      );
    });
  // Next.js synchronizes native history navigation with usePathname. This
  // exercises the root telemetry consumer without a signed-in room fixture.
  await page.evaluate(() => {
    window.history.pushState(null, "", "/app/rooms/room-a");
  });
  await expect.poll(() => roomPageviews().length).toBe(1);
  await page.evaluate(() => {
    window.history.pushState(null, "", "/app/rooms/room-b");
  });
  await expect.poll(() => roomPageviews().length).toBe(2);
  expect(roomPageviews().join("\n")).not.toMatch(/room-a|room-b/);
});

test("TTFB is reported once after two client navigations", async ({ page }) => {
  const stub = await fixture(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Accept all", exact: true }).click();
  await expect.poll(() => stub.requests).toContain("/api/send");
  stub.bodies.length = 0;
  // Keep load pending until the consented tracker is ready. Metrics emitted
  // before it loads are deliberately dropped instead of queued for later.
  let releaseImages = () => {};
  const imagesReady = new Promise<void>((resolve) => {
    releaseImages = resolve;
  });
  await page.route("**/_next/image?**", async (route) => {
    await imagesReady;
    await route.fallback();
  });
  try {
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect
      .poll(() =>
        stub.bodies.some((body) => JSON.parse(body).type === "record"),
      )
      .toBe(true);
  } finally {
    releaseImages();
  }
  await page.waitForLoadState("load");
  const ttfbEvents = () =>
    stub.bodies.filter((body) => {
      const event = JSON.parse(body);
      return (
        event.payload?.name === "web_vital" &&
        event.payload?.data?.name === "TTFB"
      );
    }).length;
  await expect.poll(ttfbEvents).toBe(1);
  await page.getByRole("link", { name: "Privacy", exact: true }).click();
  await expect(page).toHaveURL(/\/privacy$/);
  await page.getByRole("link", { name: "Legal notice", exact: true }).click();
  await expect(page).toHaveURL(/\/legal-notice$/);
  await expect
    .poll(() =>
      stub.bodies.some((body) => {
        const event = JSON.parse(body);
        return (
          event.type === "event" &&
          !event.payload.name &&
          new URL(event.payload.url).pathname === "/legal-notice"
        );
      }),
    )
    .toBe(true);
  expect(ttfbEvents()).toBe(1);
});

for (const path of ["/datenschutz", "/datenschutz/", "/impressum/"]) {
  test(`German legal page ${path} uses German consent and settings, English navigation changes it back`, async ({
    page,
  }) => {
    await fixture(page);
    await page.goto(path);
    await expect(
      page.getByRole("button", { name: "Alle ablehnen", exact: true }),
    ).toBeVisible();
    await expect(page.locator('#cc-main a[href="/datenschutz"]')).toBeVisible();
    await page
      .getByRole("button", { name: "Alle ablehnen", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Cookie-Einstellungen", exact: true })
      .click();
    await expect(
      page.getByRole("dialog", { name: "Cookie-Einstellungen", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Schließen", exact: true }).click();
    await page.getByRole("link", { name: "Privacy", exact: true }).click();
    await page
      .getByRole("button", { name: "Cookie settings", exact: true })
      .click();
    await expect(
      page.getByRole("dialog", { name: "Cookie settings", exact: true }),
    ).toBeVisible();
  });
}

test("consent gates scripts and recording, navigation has one safe pageview, withdrawal stops tracking", async ({
  page,
}) => {
  const stub = await fixture(page);
  await page.goto("/?token=fixture-sensitive#secret=fixture-sensitive");
  await expect(
    page.getByRole("button", { name: "Accept all", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Preferences", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Cookie settings", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  expect(stub.requests).toEqual([]);
  await assertStorage(page, false);
  await page.getByRole("button", { name: "Accept all", exact: true }).click();
  await expect.poll(() => stub.requests).toContain("/api/send");
  await expect.poll(() => stub.requests).toContain("/api/record");
  expect(stub.bodies.join("\n")).not.toMatch(
    /fixture-sensitive|person@|private-media/,
  );
  await assertStorage(page, true);
  await page.getByRole("link", { name: "Privacy", exact: true }).click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect
    .poll(
      () =>
        stub.bodies.filter((body) => {
          const value = JSON.parse(body);
          return (
            value.type === "event" &&
            !value.payload.name &&
            new URL(value.payload.url).pathname === "/privacy"
          );
        }).length,
    )
    .toBe(1);
  await page
    .getByRole("button", { name: "Cookie settings", exact: true })
    .click();
  await page.getByRole("button", { name: "Reject all", exact: true }).click();
  await page.waitForLoadState("load");
  await expect(page.locator('script[src$="/script.js"]')).toHaveCount(0);
  const count = stub.requests.length;
  await page.reload();
  await page
    .getByRole("button", { name: "Cookie settings", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Cookie settings", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator('script[src$="/script.js"], script[src$="/recorder.js"]'),
  ).toHaveCount(0);
  expect(stub.requests).toHaveLength(count);
  await assertStorage(page, true);
});

test("client errors reach GlitchTip without consent or PII and write no device storage", async ({
  page,
}) => {
  const stub = await fixture(page);
  await page.goto("/?token=fixture-sensitive#secret=fixture-sensitive");
  await expect(
    page.getByRole("button", { name: "Reject all", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    setTimeout(() => {
      throw new Error(
        "telemetry-deliberate person@example.com token=fixture-sensitive",
      );
    }, 0);
  });
  await expect
    .poll(() =>
      stub.envelopes.some((body) => body.includes("telemetry-deliberate")),
    )
    .toBe(true);
  expect(stub.envelopes.join("\n")).not.toMatch(
    /person@example.com|fixture-sensitive/,
  );
  expect(stub.envelopes.join("\n")).toContain("moddrop@telemetry-test");
  expect(stub.requests).toEqual([]);
  await assertStorage(page, false);
});

test("OBS has error reporting but no consent UI, analytics scripts or storage", async ({
  page,
}) => {
  const stub = await fixture(page);
  // No real secret, backend, or live endpoints are used.
  await page.goto("/obs");
  await expect(
    page.getByText("Missing OBS secret.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Accept all", exact: true }),
  ).toHaveCount(0);
  await page.evaluate(() => {
    setTimeout(() => {
      throw new Error("telemetry-obs-deliberate token=fixture-sensitive");
    }, 0);
  });
  await expect
    .poll(() =>
      stub.envelopes.some((body) => body.includes("telemetry-obs-deliberate")),
    )
    .toBe(true);
  expect(stub.envelopes.join("\n")).not.toContain("fixture-sensitive");
  expect(stub.requests).toEqual([]);
  await assertStorage(page, false);
});

test("mobile preferences reject analytics and remain reachable from the app shell", async ({
  page,
}) => {
  const stub = await fixture(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Preferences", exact: true }).click();
  const preferences = page.getByRole("dialog", {
    name: "Cookie settings",
    exact: true,
  });
  await expect(preferences).toBeVisible();
  await preferences
    .getByRole("button", { name: "Reject all", exact: true })
    .click();
  await page.goto("/app");
  await page
    .getByRole("button", { name: "Cookie settings", exact: true })
    .click();
  await expect(preferences).toBeVisible();
  expect(stub.requests).toEqual([]);
  await assertStorage(page, true);
});
