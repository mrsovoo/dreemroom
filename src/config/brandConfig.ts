import { brandConfig as rawConfig } from "../../brand.config.js";

export type CategoryConfig = {
  id: string;
  name: string;
  icon: string;
  keywords: string[];
};

export type SizeGuideItem = {
  size: string;
  bust?: string;
  waist?: string;
  hips?: string;
  height?: string;
  weight?: string;
};

export type BrandConfig = {
  brandName: string;
  shortName: string;
  tagline: string;
  logo: string;
  favicon: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    card: string;
    border: string;
  };
  font: {
    heading: string;
    body: string;
  };
  radius: string;
  cardStyle: string;
  hero: {
    title: string;
    subtitle: string;
    eyebrow: string;
    buttonText: string;
    banner: string;
  };
  footer: {
    description: string;
    copyright: string;
  };
  contacts: {
    phone: string;
    phoneClean: string;
    address: string;
    workHours: string;
    email: string;
    telegram: string;
    telegramUrl: string;
    instagram: string;
    instagramUrl: string;
  };
  currency: string;
  bot: {
    BOT_USERNAME: string;
    APP_NAME: string;
    welcomeMessage: string;
    buttons: Record<string, string>;
    dailyReportTime?: string;
    timezone?: string;
  };
  categories: CategoryConfig[];
  sizes: string[];
  sizeGuide: {
    enabled: boolean;
    table: SizeGuideItem[];
  };
  features: {
    season: boolean;
    color: boolean;
    wishlist: boolean;
  };
};

export const defaultBrandConfig: BrandConfig = rawConfig as BrandConfig;

let activeConfig: BrandConfig = { ...defaultBrandConfig };

export function getBrandConfig(): BrandConfig {
  return activeConfig;
}

export function setBrandConfig(overrides: Partial<BrandConfig>): BrandConfig {
  activeConfig = {
    ...defaultBrandConfig,
    ...overrides,
    colors: { ...defaultBrandConfig.colors, ...(overrides.colors || {}) },
    font: { ...defaultBrandConfig.font, ...(overrides.font || {}) },
    hero: { ...defaultBrandConfig.hero, ...(overrides.hero || {}) },
    contacts: { ...defaultBrandConfig.contacts, ...(overrides.contacts || {}) },
    bot: {
      ...defaultBrandConfig.bot,
      ...(overrides.bot || {}),
      buttons: { ...defaultBrandConfig.bot.buttons, ...(overrides.bot?.buttons || {}) },
    },
    features: { ...defaultBrandConfig.features, ...(overrides.features || {}) },
  };
  applyBrandTheme(activeConfig);
  return activeConfig;
}



/**
 * Ranglar, shriftlar va radiuslarni butun sayt va mini app uchun CSS o'zgaruvchilariga o'rnatish
 */
export function applyBrandTheme(config: BrandConfig = activeConfig): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const { colors, font, radius } = config;

  if (colors) {
    if (colors.primary) {
      root.style.setProperty("--color-primary", colors.primary);
      root.style.setProperty("--brand", colors.primary);
      root.style.setProperty("--ink-strong", colors.primary);
    }
    if (colors.secondary) {
      root.style.setProperty("--color-secondary", colors.secondary);
      root.style.setProperty("--brand-hover", colors.secondary);
      root.style.setProperty("--ink-hover", colors.secondary);
    }
    if (colors.accent) {
      root.style.setProperty("--color-accent", colors.accent);
    }
    if (colors.background) {
      root.style.setProperty("--color-background", colors.background);
    }
    if (colors.text) {
      root.style.setProperty("--color-text", colors.text);
      root.style.setProperty("--ink", colors.text);
    }
    if (colors.card) {
      root.style.setProperty("--color-card", colors.card);
      root.style.setProperty("--white", colors.card);
    }
    if (colors.border) {
      root.style.setProperty("--color-border", colors.border);
      root.style.setProperty("--line", colors.border);
    }
  }

  if (font) {
    if (font.heading) {
      root.style.setProperty("--font-heading", font.heading);
    }
    if (font.body) {
      root.style.setProperty("--font-body", font.body);
      document.body.style.fontFamily = font.body;
    }
  }

  if (radius) {
    root.style.setProperty("--radius-card", radius);
  }

  if (config.brandName) {
    document.title = `${config.brandName} | ${config.tagline || "Kiyim-kechak to'plami"}`;
  }

  if (config.favicon) {
    let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = config.favicon;
  }
}

/**
 * Serverdan dinamik admin sozlamalarini yuklash va mavzuni yangilash
 */
export async function loadStoreSettings(): Promise<BrandConfig> {
  try {
    const res = await fetch("/api/settings");
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === "object") {
        return setBrandConfig(data);
      }
    }
  } catch (err) {
    // Backend mavjud bo'lmasa standart config qo'llanadi
  }
  applyBrandTheme(activeConfig);
  return activeConfig;
}

export function getBrandFallbackSvg(name?: string): string {
  const brand = name || activeConfig.brandName || "Brand";
  return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='800' fill='%232b2836'><rect width='600' height='800' fill='%232b2836'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23716d82' font-family='sans-serif' font-size='22'>${encodeURIComponent(brand)}</text></svg>`;
}


