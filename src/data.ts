import { defaultBrandConfig } from "./config/brandConfig";

export type ProductImage = {
  src: string;
  alt: string;
};

export type Product = {
  id: string;
  name: string;
  price: number;
  oldPrice?: number;
  displayPrice?: string;
  displayOldPrice?: string;
  images: ProductImage[];
  category: string;
  season?: string;
  isNew: boolean;
  isPopular?: boolean;
  salesCount?: number;
  ordersCount?: number;
  color: string;
  description: string;
  sizes?: string[];
};

export const allCategory = "Barchasi";

export const categories = [
  allCategory,
  ...(defaultBrandConfig.categories?.map((c) => c.name) || [
    "Kurtka",
    "Sviter",
    "Kostyumlar",
    "Choponlar",
    "Sport kiyimlari",
  ]),
];

export const products: Product[] = [];

export const sizes = defaultBrandConfig.sizes || ["XS", "S", "M", "L", "XL"];

export function money(value: number, explicitDisplay?: string): string {
  if (explicitDisplay && !explicitDisplay.includes("$")) {
    return explicitDisplay;
  }
  let num = Number(value) || 0;
  // Agar narx 250, 180, 40 kabi kiritilgan bo'lsa (1000 dan kichik), avtomatik 000 qo'shiladi
  if (num > 0 && num < 1000) {
    num = num * 1000;
  }
  const curr = defaultBrandConfig.currency || "so'm";
  return `${num.toLocaleString("ru-RU")} ${curr}`;
}
