type TgButton = {
  show: () => void;
  hide: () => void;
  onClick: (handler: () => void) => void;
  offClick: (handler: () => void) => void;
  setText?: (text: string) => void;
  setParams?: (params: Record<string, unknown>) => void;
};

type TgUser = {
  first_name?: string;
  last_name?: string;
};

export type TgWebApp = {
  initData?: string;
  initDataUnsafe?: Record<string, unknown> & { user?: TgUser };
  platform?: string;
  viewportStableHeight?: number;
  ready: () => void;
  expand: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  disableVerticalSwipes?: () => void;
  onEvent?: (event: string, handler: () => void) => void;
  offEvent?: (event: string, handler: () => void) => void;
  BackButton: TgButton;
  MainButton: TgButton;
  HapticFeedback?: {
    impactOccurred: (style: string) => void;
    notificationOccurred: (type: string) => void;
    selectionChanged: () => void;
  };
};

type TelegramGlobal = { Telegram?: { WebApp?: TgWebApp } };

/** Faqat Telegram ichida ochilganda WebApp obyektini qaytaradi. */
export function getTelegramWebApp(): TgWebApp | null {
  try {
    const tg = (window as unknown as TelegramGlobal).Telegram?.WebApp;
    if (!tg) return null;
    const hasData = typeof tg.initData === "string" && tg.initData.length > 0;
    const hasUser =
      !!tg.initDataUnsafe && Object.keys(tg.initDataUnsafe).length > 0;
    const knownPlatform =
      typeof tg.platform === "string" &&
      tg.platform !== "" &&
      tg.platform !== "unknown";
    return hasData || (knownPlatform && hasUser) ? tg : null;
  } catch {
    return null;
  }
}

export type HapticKind = "light" | "success" | "select";

export function haptic(tg: TgWebApp | null, kind: HapticKind) {
  try {
    const feedback = tg?.HapticFeedback;
    if (!feedback) return;
    if (kind === "success") feedback.notificationOccurred("success");
    else if (kind === "select") feedback.selectionChanged();
    else feedback.impactOccurred("light");
  } catch {
    /* Eski Telegram versiyalarida bo'lmasligi mumkin. */
  }
}
