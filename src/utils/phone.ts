import type React from "react";

/**
 * O'zbekiston telefon raqamlari formati:
 * Doim "+998 " bilan avto boshlanadi va qolgan raqamlar "00 000 0000" shaklida formatlanadi.
 * Masalan: "+998 90 123 4567"
 */
export function formatUzbekPhone(value: string): string {
  let digits = (value || "").replace(/\D/g, "");
  if (digits.startsWith("998")) {
    digits = digits.slice(3);
  }
  digits = digits.slice(0, 9);

  if (digits.length === 0) {
    return "+998 ";
  }
  let res = "+998 " + digits.slice(0, 2);
  if (digits.length > 2) {
    res += " " + digits.slice(2, 5);
  }
  if (digits.length > 5) {
    res += " " + digits.slice(5, 9);
  }
  return res;
}

export function handlePhoneKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
  const input = e.currentTarget;
  // "+998 " ning o'chirilishiga yo'l qo'ymaslik
  if ((e.key === "Backspace" || e.key === "Delete") && (input.selectionStart ?? 0) <= 5) {
    e.preventDefault();
  }
}

export function handlePhoneFocus(e: React.FocusEvent<HTMLInputElement>) {
  if (!e.target.value || e.target.value.trim() === "" || e.target.value.trim() === "+998") {
    e.target.value = "+998 ";
  }
}

