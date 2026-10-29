export type ProductImage = {
  src: string;
  alt: string;
};

export type Product = {
  id: string;
  name: string;
  price: number;
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

export const categories = [allCategory];

export const products: Product[] = [];

export const sizes = ["XS", "S", "M", "L", "XL"];
export const money = (amount: number) => {
  if (!amount) return "0 so'm";
  let val = amount;
  if (val > 0 && val < 1000) {
    val = val * 1000;
  }
  return `${val.toLocaleString("ru-RU")} so'm`;
};

/** Karta ichida uchta rasmli ko'rinish uchun oldindan yuklanadigan rasmlar ro'yxati. */
export const imageSources = [
  ...new Set(
    products.flatMap((product) => product.images.map((image) => image.src)),
  ),
];
