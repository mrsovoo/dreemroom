import React from "react";
import {
  Crown,
  Feather,
  Flame,
  Layers,
  Shirt,
  Sparkles,
  Tag,
  ShoppingBag,
  Heart,
  Star,
} from "lucide-react";
import { defaultBrandConfig } from "../config/brandConfig";

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  Layers,
  Shirt,
  Feather,
  Crown,
  Flame,
  Tag,
  ShoppingBag,
  Sparkles,
  Heart,
  Star,
};

export function renderCategoryIcon(cat: string): React.ReactNode {
  const c = (cat || "").toLowerCase().trim();
  if (c === "barchasi" || c === "all") {
    return <Sparkles size={14} strokeWidth={1.8} />;
  }

  const categories = defaultBrandConfig.categories || [];
  for (const item of categories) {
    if (item.keywords && item.keywords.some((kw) => c.includes(kw.toLowerCase()))) {
      const IconComponent = ICON_MAP[item.icon] || Tag;
      return <IconComponent size={14} strokeWidth={1.8} />;
    }
  }

  // Fallback defaults
  if (c.includes("kurtka") || c.includes("jacket") || c.includes("palto")) return <Layers size={14} strokeWidth={1.8} />;
  if (c.includes("sviter") || c.includes("sweater") || c.includes("kardigan") || c.includes("cardigan")) return <Shirt size={14} strokeWidth={1.8} />;
  if (c.includes("chopon")) return <Feather size={14} strokeWidth={1.8} />;
  if (c.includes("ko'ylak") || c.includes("dress")) return <Crown size={14} strokeWidth={1.8} />;
  if (c.includes("sport")) return <Flame size={14} strokeWidth={1.8} />;
  if (c.includes("kostyum") || c.includes("suit")) return <Shirt size={14} strokeWidth={1.8} />;
  if (c.includes("shim") || c.includes("jean") || c.includes("pants")) return <Tag size={14} strokeWidth={1.8} />;

  return <Tag size={14} strokeWidth={1.8} />;
}
