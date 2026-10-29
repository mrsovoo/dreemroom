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

export const products: Product[] = [
  {
    id: "dreem-kardigan-01",
    name: "Kardigan to'plami",
    price: 280000,
    images: [
      { src: "/images/kardigan-navy.jpg", alt: "Kardigan to'plami" },
      { src: "/images/kardigan-navy.jpg", alt: "Kardigan yon ko'rinishi" },
    ],
    category: "Kardigan",
    season: "Kuz/Qish",
    isNew: true,
    isPopular: true,
    salesCount: 14,
    ordersCount: 8,
    color: "To'q ko'k (Navy)",
    description: "Nafis va qulay bichimli ayollar kardigan to'plami. Yuqori sifatli matodan tayyorlangan.",
    sizes: ["XS", "S", "M", "L", "XL"],
  },
  {
    id: "dreem-dvoyka-02",
    name: "Klassik Dvoyka",
    price: 320000,
    images: [
      { src: "/images/dvoyka-black.jpg", alt: "Klassik Dvoyka" },
      { src: "/images/dvoyka-black.jpg", alt: "Klassik Dvoyka yon tomoni" },
    ],
    category: "Dvoyka",
    season: "Barchasi",
    isNew: true,
    isPopular: true,
    salesCount: 21,
    ordersCount: 12,
    color: "Qora",
    description: "Har qanday vaziyat uchun mos keladigan zamonaviy dvoyka kostyum. Nafis va erkin bichim.",
    sizes: ["XS", "S", "M", "L", "XL"],
  },
  {
    id: "dreem-dvoyka-03",
    name: "Zamonaviy Dvoyka",
    price: 290000,
    images: [
      { src: "/images/dvoyka-beige.jpg", alt: "Zamonaviy Dvoyka" },
    ],
    category: "Dvoyka",
    season: "Bahor",
    isNew: true,
    isPopular: false,
    salesCount: 6,
    ordersCount: 4,
    color: "Och kulrang / Bej",
    description: "Kuz va bahor mavsumi uchun qulay va zamonaviy dvoyka libosi.",
    sizes: ["S", "M", "L", "XL"],
  },
  {
    id: "dreem-sport-04",
    name: "Sport kostyum to'plami",
    price: 260000,
    images: [
      { src: "/images/sport-set.jpg", alt: "Sport kostyumi" },
    ],
    category: "Sport kiyim",
    season: "Barchasi",
    isNew: false,
    isPopular: true,
    salesCount: 18,
    ordersCount: 9,
    color: "Zangori / Moviy",
    description: "Erkin harakatlanish uchun mo'ljallangan yengil va qulay sport kiyimi.",
    sizes: ["XS", "S", "M", "L"],
  },
  {
    id: "dreem-classic-05",
    name: "Eksklyuziv Kostyum",
    price: 380000,
    images: [
      { src: "/images/classic-set.jpg", alt: "Eksklyuziv Kostyum" },
    ],
    category: "Kostyum",
    season: "Kuz/Qish",
    isNew: true,
    isPopular: false,
    salesCount: 5,
    ordersCount: 3,
    color: "Qora / To'q kulrang",
    description: "DREEM ROOM maxsus to'plami. Yuqori sifatli mato va mukammal tikilish.",
    sizes: ["S", "M", "L", "XL", "XXL"],
  },
];

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
