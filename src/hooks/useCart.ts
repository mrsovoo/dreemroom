import { useState, useEffect } from "react";
import type { CartItem } from "../types/store";

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem("store-cart");
      return stored ? (JSON.parse(stored) as CartItem[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("store-cart", JSON.stringify(cart));
    } catch {
      /* Xotira yopiq bo'lsa ham xarid davom etadi */
    }
  }, [cart]);

  return [cart, setCart] as const;
}

