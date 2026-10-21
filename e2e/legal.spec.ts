import { expect, test } from "@playwright/test";

for (const width of [1280, 375]) {
  test(`public legal navigation on the built app at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    // Never send a request to Clerk, an embed provider or another third party.
    await page.route("**/*", (route) =>
      new URL(route.request().url()).hostname === "127.0.0.1"
        ? route.continue()
        : route.abort(),
    );
    for (const [label, path, heading, email] of [
      [
        "Legal notice",
        "/legal-notice",
        "Legal Notice (Impressum)",
        "impressum@heerlab.com",
      ],
      ["Privacy", "/privacy", "Privacy Policy", "datenschutz@heerlab.com"],
      ["Impressum", "/impressum", "Impressum", "impressum@heerlab.com"],
      [
        "Datenschutz",
        "/datenschutz",
        "Datenschutzerklärung",
        "datenschutz@heerlab.com",
      ],
    ]) {
      await page.goto("/");
      await page
        .getByRole("navigation", { name: "Legal", exact: true })
        .getByRole("link", { name: label, exact: true })
        .click();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(
        page.getByRole("heading", { level: 1, name: heading, exact: true }),
      ).toBeVisible();
      await expect(page.locator("address")).toContainText("Tobias Heer");
      await expect(page.locator("address")).toContainText(
        "c/o Impressumservice Dein-Impressum",
      );
      await expect(page.locator("address")).toContainText("Stettiner Str. 41");
      await expect(page.locator("address")).toContainText("35410 Hungen");
      await expect(
        page.locator(`a[href="mailto:${email}"]`).first(),
      ).toBeVisible();
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        "content",
        "noindex",
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }
    for (const path of [
      "/sign-in",
      "/app",
      "/app/settings",
      "/app/rooms/fixture",
      "/missing-legal-fixture",
    ]) {
      await page.goto(path);
      const links = page.getByRole("navigation", {
        name: "Legal",
        exact: true,
      });
      for (const label of [
        "Legal notice",
        "Privacy",
        "Impressum",
        "Datenschutz",
      ])
        await expect(
          links.getByRole("link", { name: label, exact: true }),
        ).toBeVisible();
    }
    await page.goto("/obs");
    await expect(
      page.getByRole("navigation", { name: "Legal", exact: true }),
    ).toHaveCount(0);
  });
}
