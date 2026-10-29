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

export const categories = [allCategory, "Kurtka", "Sviter", "Kostyumlar", "Choponlar", "Sport kiyimlari"];

export const products: Product[] = [
  {
    id: "prod-01-hoodie-red",
    name: "Bordo rangli xudi va shim to'plami",
    price: 35,
    displayPrice: "$35.00",
    images: [
      { src: "/images/1.png", alt: "Bordo rangli xudi va shim to'plami" }
    ],
    category: "Sport kiyimlari",
    season: "Kuz/Qish",
    isNew: true,
    isPopular: false,
    salesCount: 0,
    ordersCount: 0,
    color: "To'q qizil / Bordo",
    description: "Yumshoq paxtali flis matodan tikilgan, qulay va keng bichimdagi zamonaviy xudi va shim to'plami.",
    sizes: ["XS", "S", "M", "L", "XL"]
  },
  {
    id: "prod-02-jacket-red",
    name: "Milliy naqshli qavilgan kurtka (Qizil)",
    price: 40,
    displayPrice: "$40.00",
    images: [
      { src: "/images/2.png", alt: "Milliy naqshli qavilgan kurtka (Qizil)" }
    ],
    category: "Kurtka",
    season: "Kuz/Bahor",
    isNew: true,
    isPopular: false,
    salesCount: 0,
    ordersCount: 0,
    color: "Qizil / Naqshinkor",
    description: "Nafis milliy naqshli, belbog'li va qavilgan issiq va zamonaviy ayollar kurtkasi.",
    sizes: ["XS", "S", "M", "L", "XL"]
  },
  {
    id: "prod-03-jacket-blue",
    name: "Milliy naqshli qavilgan kurtka (Moviy)",
    price: 40,
    displayPrice: "$40.00",
    images: [
      { src: "/images/3.png", alt: "Milliy naqshli qavilgan kurtka (Moviy)" }
    ],
    category: "Kurtka",
    season: "Kuz/Bahor",
    isNew: true,
    isPopular: false,
    salesCount: 0,
    ordersCount: 0,
    color: "Moviy / Naqshinkor",
    description: "Yorqin moviy fondagi milliy bodom naqshli, qavilgan zamonaviy va nafis kurtka.",
    sizes: ["XS", "S", "M", "L", "XL"]
  },
  {
    id: "prod-04-chapan-striped",
    name: "Chiziqli uzun beqasam chopon",
    price: 45,
    displayPrice: "$45.00",
    images: [
      { src: "/images/4.png", alt: "Chiziqli uzun beqasam chopon" }
    ],
    category: "Choponlar",
    season: "Barcha fasllar",
    isNew: true,
    isPopular: false,
    salesCount: 0,
    ordersCount: 0,
    color: "Chiziqli beqasam",
    description: "Zamonaviy bichimdagi uzun milliy chiziqli chopon, qulay belbog' va cho'ntaklar bilan.",
    sizes: ["S", "M", "L", "XL"]
  },
  {
    id: "prod-05-sweater-blue",
    name: "Ko'k romb naqshli trikotaj sviter",
    price: 32,
    displayPrice: "$32.00",
    images: [
      { src: "/images/5.png", alt: "Ko'k romb naqshli trikotaj sviter" }
    ],
    category: "Sviter",
    season: "Kuz/Qish",
    isNew: true,
    isPopular: false,
    salesCount: 0,
    ordersCount: 0,
    color: "Ko'k / Havorang romb",
    description: "Klassik romb naqshli, mayin va issiq trikotaj matodan to'qilgan qulay ayollar sviteri.",
    sizes: ["XS", "S", "M", "L", "XL"]
  },
  {
    id: "prod-06-suit-navy",
    name: "To'q ko'k rangli kamarlik to'plam",
    price: 48,
    displayPrice: "$48.00",
    images: [
      { src: "/images/6.png", alt: "To'q ko'k rangli kamarlik to'plam" }
    ],
    category: "Kostyumlar",
    season: "Barcha fasllar",
    isNew: true,
    isPopular: false,
    salesCount: 0,
    ordersCount: 0,
    color: "To'q ko'k",
    description: "Zamonaviy tik yoqali, qulay zamokli va belbog'li ikki qismli nafis kostyum-shim to'plami.",
    sizes: ["XS", "S", "M", "L", "XL"]
  },
  {
    id: "prod-07-suit-brown",
    name: "Shokolad rangli kamarlik to'plam",
    price: 48,
    displayPrice: "$48.00",
    images: [
      { src: "/images/7.png", alt: "Shokolad rangli kamarlik to'plam" }
    ],
    category: "Kostyumlar",
    season: "Barcha fasllar",
    isNew: true,
    isPopular: false,
    salesCount: 0,
    ordersCount: 0,
    color: "Shokolad / Jigarrang",
    description: "Tik yoqali, zamokli va belbog'li ikki qismli qulay va nafis shokolad rangli ayollar to'plami.",
    sizes: ["XS", "S", "M", "L", "XL"]
  }
];

export const sizes = ["XS", "S", "M", "L", "XL"];

export const money = (amount: number, display?: string) => {
  if (display) return display;
  if (!amount && amount !== 0) return "$0.00";
  if (amount < 1000) {
    return `$${amount.toFixed(2)}`;
  }
  return `${amount.toLocaleString("ru-RU")} so'm`;
};

export const imageSources = [
  ...new Set(
    products.flatMap((product) => product.images.map((image) => image.src)),
  ),
];
