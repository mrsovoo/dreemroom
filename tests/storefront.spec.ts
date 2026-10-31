import { test, expect, type Page } from "@playwright/test";

const errors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const list: string[] = [];
  errors.set(page, list);
  page.on("pageerror", (error) => list.push(error.message));
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
});

test.afterEach(async ({ page }) => {
  expect(errors.get(page)).toEqual([]);
});

/**
 * Kompyuterda yuqoridagi menyu, telefonda pastki tab-bar orqali yo'naltiradi.
 * Mobil tab-barda "Yangi mavsumiy" tugmasi yo'q — u Katalog ichidagi chip orqali ochiladi.
 */
async function navigate(page: Page, label: "Yangi mavsumiy" | "Katalog") {
  const topNav = page.getByRole("navigation", { name: "Asosiy menyu" });
  if (await topNav.isVisible()) {
    await topNav.getByRole("button", { name: label, exact: true }).click();
    return;
  }
  const mobileNav = page.getByRole("navigation", { name: "Mobil menyu" });
  await mobileNav.getByRole("button", { name: "Katalog", exact: true }).click();
  if (label === "Yangi mavsumiy") {
    await page
      .locator(".chips")
      .getByRole("button", { name: "Yangi mavsumiy", exact: true })
      .click();
  }
}

async function addToCart(page: Page, product = "Zen mayka", size = "M") {
  await page
    .getByRole("button", { name: `${product} — batafsil`, exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: size, exact: true }).click();
  await dialog
    .getByRole("button", { name: "Savatga qo'shish", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

async function openProfile(page: Page) {
  const mobileNav = page.getByRole("navigation", { name: "Mobil menyu" });
  if (await mobileNav.isVisible()) {
    await mobileNav
      .getByRole("button", { name: "Profil", exact: true })
      .click();
    return;
  }
  await page.getByRole("button", { name: "Profil", exact: true }).click();
}

test("bosh sahifada faqat kerakli bo'limlar bor", async ({ page }) => {
  await expect(page).toHaveTitle(/Kiyim Do'koni/i);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Kuch maqsad",
  );
  await expect(
    page.getByRole("heading", { name: "Yangi mavsumiy", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Mavzuiy katalog", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".theme-card")).toHaveCount(3);
  await expect(page.locator(".section")).toHaveCount(2);

  // Soddalashtirilgan: qidiruv, sevimlilar, hisob va yangiliklar bloki yo'q.
  await expect(page.getByRole("button", { name: /qidir/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /sevimli/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /hisob/i })).toHaveCount(0);
  const text = await page.locator("body").innerText();
  expect(text).not.toMatch(/Erkak|Men's|Cookie|Obuna|Chegirma/i);

  await page.locator(".footer").scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      page
        .locator("img")
        .evaluateAll((images) =>
          images.every((image) => image.complete && image.naturalWidth > 0),
        ),
    )
    .toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("hero fon suratlari slayder sifatida almashadi", async ({ page }) => {
  await expect(page.locator(".hero-slides img")).toHaveCount(4);
  await expect(page.locator(".hero-slides img.is-active")).toHaveCount(1);
  await expect(page.locator(".hero-dot")).toHaveCount(4);
  await expect(page.locator(".hero-slides img").first()).toHaveClass(
    /is-active/,
  );

  // 3-nuqtani bosganda mos surat faollashadi.
  await page.locator(".hero-dot").nth(2).click();
  await expect(page.locator(".hero-slides img").nth(2)).toHaveClass(
    /is-active/,
  );
  await expect(page.locator(".hero-dot").nth(2)).toHaveAttribute(
    "aria-selected",
    "true",
  );

  // Matn har doim hero ustida ko'rinadi.
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("menyu faqat yangi mavsumiy va katalogdan iborat", async ({
  page,
}, testInfo) => {
  if (testInfo.project.name === "mobile") {
    const tabs = page.getByRole("navigation", { name: "Mobil menyu" });
    await expect(tabs.getByRole("button")).toHaveText([
      "Asosiy",
      "Katalog",
      "Savat",
      "Profil",
    ]);
  } else {
    const topNav = page.getByRole("navigation", { name: "Asosiy menyu" });
    await expect(topNav.getByRole("button")).toHaveCount(2);
    await expect(topNav.getByRole("button").first()).toHaveText(
      "Yangi mavsumiy",
    );
    await expect(topNav.getByRole("button").last()).toHaveText("Katalog");
    const positions = await page.evaluate(() => {
      const rect = (selector: string) =>
        document.querySelector(selector)!.getBoundingClientRect();
      const header = rect(".header");
      const nav = rect(".nav");
      return {
        navCenter: nav.left + nav.width / 2,
        headerCenter: header.left + header.width / 2,
      };
    });
    expect(Math.abs(positions.navCenter - positions.headerCenter)).toBeLessThan(
      2,
    );
  }

  await navigate(page, "Yangi mavsumiy");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Yangi mavsumiy",
  );
  await expect(page.locator(".card")).toHaveCount(4);

  await navigate(page, "Katalog");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Katalog");
  await expect(page.locator(".card")).toHaveCount(7);
  await expect(page.locator(".catalog-count")).toHaveText("7 ta model");
});

test("kartada uch rakurs ko'rinadi va rakurslar almashadi", async ({
  page,
}) => {
  const card = page.locator(".card", { hasText: "Zen mayka" }).first();
  await expect(card.locator(".card-open img")).toHaveCount(3);
  await expect(card.locator(".card-dots span")).toHaveCount(3);
  await expect(card.locator(".card-open img.is-active")).toHaveCount(1);

  const activeSrc = await card
    .locator(".card-open img.is-active")
    .getAttribute("src");
  expect(activeSrc).toBeTruthy();

  const nextZone = card.getByRole("button", {
    name: "Zen mayka keyingi rakursi",
  });
  await nextZone.dispatchEvent("click");
  await expect(card.locator(".card-open img").nth(1)).toHaveClass(/is-active/);
  await expect(card.locator(".card-open img").nth(1)).toBeVisible();

  const previousZone = card.getByRole("button", {
    name: "Zen mayka oldingi rakursi",
  });
  await previousZone.dispatchEvent("click");
  await expect(card.locator(".card-open img").first()).toHaveClass(/is-active/);
});

test("mavzuiy katalog kartasi kategoriyani ochadi", async ({ page }) => {
  await page.locator(".theme-card").nth(1).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sport bra");
  await expect(page.locator(".card")).toHaveCount(1);
  await page.getByRole("button", { name: "Tashqi kiyim", exact: true }).click();
  await expect(page.locator(".card")).toHaveCount(2);
  await page.getByRole("button", { name: "Barchasi", exact: true }).click();
  await expect(page.locator(".card")).toHaveCount(7);
});

test("mahsulot oynasida uch rakurs tanlanadi va savatga qo'shish ishlaydi", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Zen mayka — batafsil", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator(".detail-gallery img.detail-image")).toHaveCount(
    1,
  );
  await expect(dialog.getByRole("tab", { name: /1-rakurs/ })).toBeVisible();
  await expect(dialog.locator(".gallery-thumbs button")).toHaveCount(3);

  await dialog
    .getByRole("button", {
      name: "Zen mayka Yon rakurs, Tosh rang",
      exact: true,
    })
    .click();
  await expect(
    dialog.locator(".detail-gallery img.detail-image"),
  ).toHaveAttribute("src", /zen-top\.jpg/);
  await expect(dialog.getByRole("tab", { name: /2-rakurs/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );

  await dialog.getByRole("tab", { name: /3-rakurs/ }).click();
  await expect(
    dialog.locator(".detail-gallery img.detail-image"),
  ).toHaveAttribute("src", /compression-top\.jpg/);

  await dialog
    .getByRole("button", { name: "Savatga qo'shish", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toHaveText(
    "Iltimos, o'lchamni tanlang.",
  );
  await dialog.getByRole("button", { name: "M", exact: true }).click();
  await dialog
    .getByRole("button", { name: "Savatga qo'shish", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("savatga qo'shildi");
  await expect(
    page.getByRole("button", { name: "Savat, 1 ta mahsulot", exact: true }),
  ).toBeVisible();
});

test("savat miqdori, jami summa va saqlanishi", async ({ page }) => {
  await addToCart(page);
  await page.reload();
  await page
    .getByRole("button", { name: "Savat, 1 ta mahsulot", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator(".cart-total strong")).toHaveText("40 $");
  await dialog
    .getByRole("button", { name: "Zen mayka sonini oshirish" })
    .click();
  await expect(dialog.locator(".cart-total strong")).toHaveText("80 $");
  await dialog
    .getByRole("button", { name: "Zen mayka sonini kamaytirish" })
    .click();
  await expect(dialog.locator(".cart-total strong")).toHaveText("40 $");
  await dialog
    .getByRole("button", { name: "Zen mayka ni savatdan olib tashlash" })
    .click();
  await expect(dialog.getByText("Savatingiz hozircha bo'sh.")).toBeVisible();
});

test("profil saqlanadi va buyurtma formasiga avtomatik qo'yiladi", async ({
  page,
}) => {
  await openProfile(page);
  const profileDialog = page.getByRole("dialog", { name: "Profil" });
  await profileDialog
    .getByRole("textbox", { name: "Ismingiz", exact: true })
    .fill("Malika Karimova");
  await profileDialog
    .getByRole("textbox", { name: "Telefon raqam", exact: true })
    .fill("+998901234567");
  await profileDialog
    .getByRole("button", { name: "Profilni saqlash", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Profil saqlandi");

  await openProfile(page);
  await expect(
    page.getByRole("textbox", { name: "Ismingiz", exact: true }),
  ).toHaveValue("Malika Karimova");
  await page.getByRole("button", { name: "Oynani yopish" }).click();

  await addToCart(page, "Core top", "S");
  await page
    .getByRole("button", { name: "Savat, 1 ta mahsulot", exact: true })
    .click();
  const cartDialog = page.getByRole("dialog");
  await expect(
    cartDialog.getByRole("textbox", { name: "Ismingiz", exact: true }),
  ).toHaveValue("Malika Karimova");
  await expect(
    cartDialog.getByRole("textbox", { name: "Telefon raqam", exact: true }),
  ).toHaveValue("+998901234567");
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("store-profile") || "null"),
    ),
  ).toEqual({ name: "Malika Karimova", phone: "+998901234567" });
});

test("buyurtma berish oddiy forma orqali ishlaydi", async ({ page }) => {
  await addToCart(page, "Core top", "S");
  await page
    .getByRole("button", { name: "Savat, 1 ta mahsulot", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("textbox", { name: "Ismingiz", exact: true })
    .fill("Malika");
  await dialog
    .getByRole("textbox", { name: "Telefon raqam", exact: true })
    .fill("+998901234567");
  await dialog
    .getByRole("button", { name: "Buyurtma berish", exact: true })
    .click();
  await expect(dialog.getByRole("heading", { name: "Rahmat!" })).toBeVisible();
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("store-cart") || "[]"),
    ),
  ).toEqual([]);
  await dialog
    .getByRole("button", { name: "Xaridni davom ettirish", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Savat, 0 ta mahsulot", exact: true }),
  ).toBeVisible();
});

test("brend ranglari #403D4F va oq asosida", async ({ page }) => {
  const header = await page
    .locator(".header")
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(header).toContain("255, 255, 255");
  const band = await page
    .locator(".band")
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(band).toBe("rgb(64, 61, 79)");
  const themeColor = await page
    .locator('meta[name="theme-color"]')
    .getAttribute("content");
  expect(themeColor).toBe("#403d4f");
});

test("oyna klaviatura bilan boshqariladi", async ({ page }) => {
  const trigger = page.getByRole("button", {
    name: "Zen mayka — batafsil",
    exact: true,
  });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press("Tab");
    expect(
      await dialog.evaluate((el) => el.contains(document.activeElement)),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(await page.locator("#root").evaluate((root) => root.inert)).toBe(
    false,
  );
});

test("mobil tab menyu va pastdan chiqadigan oyna", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Faqat mobil ko'rinish uchun");
  const tabs = page.getByRole("navigation", { name: "Mobil menyu" });
  await expect(tabs).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(tabs).toBeInViewport();

  await tabs.getByRole("button", { name: "Savat", exact: true }).click();
  const dialog = page.getByRole("dialog");
  const box = await dialog.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y + box!.height).toBeGreaterThanOrEqual(830);
  await expect(page.locator(".sheet-grabber")).toBeVisible();
});

test("mobil tab-bar to'rtta teng ustunda joylashgan", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Faqat mobil ko'rinish uchun");
  const tabs = page.getByRole("navigation", { name: "Mobil menyu" });
  const labels = ["Asosiy", "Katalog", "Savat", "Profil"];

  for (const width of [320, 375, 430, 600, 700]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(tabs).toBeInViewport();

    const widths = await page.evaluate((names) => {
      const buttons = names.map((name) =>
        [
          ...document.querySelectorAll('[aria-label="Mobil menyu"] > button'),
        ].find((button) => button.textContent?.trim().startsWith(name))!,
      );
      return buttons.map((button) => button.getBoundingClientRect().width);
    }, labels);

    // To'rtta tab bir xil kenglikda.
    const min = Math.min(...widths);
    const max = Math.max(...widths);
    expect(max - min).toBeLessThan(1);
  }
});

test("mobil tab-bar tartibi: Asosiy, Katalog, Savat, Profil", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Faqat mobil ko'rinish uchun");
  const tabs = page.getByRole("navigation", { name: "Mobil menyu" });
  await expect(tabs.getByRole("button")).toHaveText([
    "Asosiy",
    "Katalog",
    "Savat",
    "Profil",
  ]);

  await tabs.getByRole("button", { name: "Katalog", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Katalog");

  await tabs.getByRole("button", { name: "Asosiy", exact: true }).click();
  await expect(page.locator(".hero")).toBeVisible();

  await tabs.getByRole("button", { name: "Savat", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Oynani yopish" }).click();

  await tabs.getByRole("button", { name: "Profil", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Profil" })).toBeVisible();
});

test("kompyuterda tab menyu yashirin", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Faqat kompyuter uchun");
  await expect(
    page.getByRole("navigation", { name: "Mobil menyu" }),
  ).toBeHidden();
  await expect(
    page.getByRole("navigation", { name: "Asosiy menyu" }),
  ).toBeVisible();
});

test("Brand logotipi sarlavha va footerda turadi", async ({ page }) => {
  const brandButtons = page.getByRole("button", {
    name: /bosh sahifa/i,
  });
  await expect(brandButtons).toHaveCount(2);

  const headerLogo = page.locator(".header .logo");
  await expect(headerLogo).toBeVisible();
  const box = await headerLogo.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width / box!.height).toBeGreaterThan(5);
  const headerPositions = await page.evaluate(() => {
    const rect = (selector: string) =>
      document.querySelector(selector)!.getBoundingClientRect();
    const nav = rect(".nav");
    const header = rect(".header");
    return {
      navCenter: nav.left + nav.width / 2,
      headerCenter: header.left + header.width / 2,
    };
  });
  if (
    await page.getByRole("navigation", { name: "Asosiy menyu" }).isVisible()
  ) {
    expect(
      Math.abs(headerPositions.navCenter - headerPositions.headerCenter),
    ).toBeLessThan(2);
  }
  await expect(page.locator(".footer .logo")).toHaveCount(1);
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute(
    "href",
    "/favicon.svg",
  );

  // Eski brend nomi hech qayerda qolmagan.
  expect(await page.content()).not.toMatch(/velvorn/i);

  // Logo bosilganda bosh sahifaga qaytadi.
  await navigate(page, "Katalog");
  await expect(page.locator(".hero")).toHaveCount(0);
  await brandButtons.first().click();
  await expect(page.locator(".hero")).toBeVisible();
});
