import { test, expect } from "@playwright/test";

/**
 * Telegram WebApp muhitini soxta obyekt bilan taqlid qiladi.
 * Haqiqiy SDK skripti testda bo'sh javob bilan almashtiriladi.
 */
test.beforeEach(async ({ page }) => {
  await page.route("**/telegram-web-app.js", (route) =>
    route.fulfill({ contentType: "text/javascript", body: "" }),
  );
  await page.addInitScript(() => {
    const calls: string[] = [];
    const makeButton = (name: string) => ({
      isVisible: false,
      text: "",
      handler: undefined as (() => void) | undefined,
      show(this: { isVisible: boolean }) {
        this.isVisible = true;
      },
      hide(this: { isVisible: boolean }) {
        this.isVisible = false;
      },
      onClick(this: { handler?: () => void }, handler: () => void) {
        this.handler = handler;
      },
      offClick(this: { handler?: () => void }, handler: () => void) {
        if (this.handler === handler) this.handler = undefined;
      },
      setText(this: { text: string }, text: string) {
        this.text = text;
      },
      setParams(this: { text: string }, params: { text?: string }) {
        if (params.text) this.text = params.text;
        calls.push(`${name}:${params.text ?? ""}`);
      },
    });

    const webApp = {
      initData: "test-init-data",
      initDataUnsafe: { user: { id: 1 } },
      platform: "ios",
      version: "8.0",
      colorScheme: "light",
      themeParams: {},
      viewportHeight: 800,
      viewportStableHeight: 800,
      BackButton: makeButton("back"),
      MainButton: makeButton("main"),
      HapticFeedback: {
        impactOccurred: () => calls.push("haptic:light"),
        notificationOccurred: (type: string) => calls.push(`haptic:${type}`),
        selectionChanged: () => calls.push("haptic:select"),
      },
      ready: () => calls.push("ready"),
      expand: () => calls.push("expand"),
      setHeaderColor: () => calls.push("header-color"),
      setBackgroundColor: () => calls.push("background-color"),
      disableVerticalSwipes: () => calls.push("disable-swipes"),
      onEvent: () => undefined,
      offEvent: () => undefined,
    };

    const host = window as unknown as {
      Telegram: { WebApp: typeof webApp };
      __tgCalls: string[];
    };
    host.Telegram = { WebApp: webApp };
    host.__tgCalls = calls;
  });
});

type TgWindow = {
  __tgCalls: string[];
  Telegram: {
    WebApp: {
      BackButton: { isVisible: boolean; handler?: () => void };
      MainButton: { isVisible: boolean; text: string; handler?: () => void };
    };
  };
};

test("Telegram WebApp rejimi ishga tushadi", async ({ page }, testInfo) => {
  await page.goto("/");

  await expect
    .poll(() =>
      page.evaluate(() => document.body.classList.contains("in-telegram")),
    )
    .toBe(true);

  const calls = await page.evaluate(
    () => (window as unknown as TgWindow).__tgCalls,
  );
  expect(calls).toEqual(
    expect.arrayContaining([
      "ready",
      "expand",
      "header-color",
      "background-color",
      "disable-swipes",
    ]),
  );

  if (testInfo.project.name === "mobile") {
    const tabs = page.getByRole("navigation", { name: "Mobil menyu" });
    await expect(tabs.getByRole("button")).toHaveText([
      "Asosiy",
      "Katalog",
      "Savat",
      "Profil",
    ]);
  }
});

test("BackButton katalog va oynada chiqadi", async ({ page }, testInfo) => {
  await page.goto("/");

  const backVisible = () =>
    page.evaluate(
      () =>
        (window as unknown as TgWindow).Telegram.WebApp.BackButton.isVisible,
    );
  await expect.poll(backVisible).toBe(false);

  if (testInfo.project.name === "mobile") {
    await page
      .getByRole("navigation", { name: "Mobil menyu" })
      .getByRole("button", { name: "Katalog", exact: true })
      .click();
  } else {
    await page
      .getByRole("navigation", { name: "Asosiy menyu" })
      .getByRole("button", { name: "Katalog", exact: true })
      .click();
  }
  await expect.poll(backVisible).toBe(true);

  await page.evaluate(() =>
    (window as unknown as TgWindow).Telegram.WebApp.BackButton.handler?.(),
  );
  await expect(page.locator(".hero")).toBeVisible();
  await expect.poll(backVisible).toBe(false);
});

test("MainButton mahsulot va buyurtmani boshqaradi", async ({ page }) => {
  await page.goto("/");

  await page
    .getByRole("button", { name: "Zen mayka — batafsil", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "M", exact: true })
    .click();

  const mainState = () =>
    page.evaluate(() => {
      const button = (window as unknown as TgWindow).Telegram.WebApp.MainButton;
      return { visible: button.isVisible, text: button.text };
    });
  await expect.poll(mainState).toEqual({
    visible: true,
    text: "Savatga qo'shish",
  });
  await expect(page.locator("html")).toHaveClass(/tg-mainbutton-on/);

  await page.evaluate(() =>
    (window as unknown as TgWindow).Telegram.WebApp.MainButton.handler?.(),
  );
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Savat, 1 ta mahsulot", exact: true }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Savat, 1 ta mahsulot", exact: true })
    .click();
  await expect
    .poll(async () => (await mainState()).text)
    .toContain("Buyurtma berish");

  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("textbox", { name: "Ismingiz", exact: true })
    .fill("Malika");
  await dialog
    .getByRole("textbox", { name: "Telefon raqam", exact: true })
    .fill("+998901234567");
  await page.evaluate(() =>
    (window as unknown as TgWindow).Telegram.WebApp.MainButton.handler?.(),
  );

  await expect(dialog.getByRole("heading", { name: "Rahmat!" })).toBeVisible();
  const calls = await page.evaluate(
    () => (window as unknown as TgWindow).__tgCalls,
  );
  expect(calls).toContain("haptic:success");
});

test("MainButton profil ma'lumotlarini saqlaydi", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  if (testInfo.project.name === "mobile") {
    await page
      .getByRole("navigation", { name: "Mobil menyu" })
      .getByRole("button", { name: "Profil", exact: true })
      .click();
  } else {
    await page.getByRole("button", { name: "Profil", exact: true }).click();
  }

  const dialog = page.getByRole("dialog", { name: "Profil" });
  await dialog
    .getByRole("textbox", { name: "Ismingiz", exact: true })
    .fill("Malika");
  await dialog
    .getByRole("textbox", { name: "Telefon raqam", exact: true })
    .fill("+998901234567");

  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as TgWindow).Telegram.WebApp.MainButton.text,
      ),
    )
    .toBe("Profilni saqlash");
  await page.evaluate(() =>
    (window as unknown as TgWindow).Telegram.WebApp.MainButton.handler?.(),
  );
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText("Profil saqlandi");
});
