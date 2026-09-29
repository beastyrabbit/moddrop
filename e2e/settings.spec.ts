import { expect, test } from "@playwright/test";

test("room policy saves from settings at desktop and mobile sizes", async ({
  page,
}, testInfo) => {
  await page.goto("/?view=settings");
  const preview = page.getByRole("radio", { name: /^Moderator preview only/ });
  await expect(preview).toBeVisible();
  await preview.check();
  await page.getByRole("radio", { name: /^Allow on air/ }).check();
  const save = page.getByRole("button", { name: "Save changes" });
  await expect(save).toBeDisabled();
  await page.getByRole("checkbox", { name: /I understand/ }).check();
  await expect(save).toBeEnabled();
  const response = page.waitForResponse(
    (response) => response.request().method() === "PATCH",
  );
  await save.click();
  expect((await response).ok()).toBe(true);
  await page.reload();
  await expect(
    page.getByRole("radio", { name: /^Allow on air/ }),
  ).toBeChecked();
  await page.getByRole("radio", { name: /^Moderator preview only/ }).check();
  const restored = page.waitForResponse(
    (response) => response.request().method() === "PATCH",
  );
  await save.click();
  expect((await restored).ok()).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("settings-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(save).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("settings-mobile.png"),
    fullPage: true,
  });
});
