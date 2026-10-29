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
  enableClosingConfirmation?: () => void;
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

/** Telegram ichida ochilganda WebApp obyektini qaytaradi. */
export function getTelegramWebApp(): TgWebApp | null {
  try {
    const tg = (window as unknown as TelegramGlobal).Telegram?.WebApp;
    if (tg && typeof tg.ready === "function") {
      return tg;
    }
    return null;
  } catch {
    return null;
  }
}

export type HapticKind = "light" | "medium" | "heavy" | "success" | "warning" | "error" | "select";

export function haptic(tg: TgWebApp | null, kind: HapticKind = "light") {
  try {
    const feedback = tg?.HapticFeedback;
    if (!feedback) return;
    if (kind === "success" || kind === "warning" || kind === "error") {
      feedback.notificationOccurred(kind);
    } else if (kind === "select") {
      feedback.selectionChanged();
    } else {
      feedback.impactOccurred(kind);
    }
  } catch {}
}
