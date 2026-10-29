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
  collectionSection?: "hot-deals" | "latest-drops" | "standard";
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

export const categories = [allCategory, "Women", "Men", "Hot Style Steals", "Latest Drops", "Sportswear"];

export const products: Product[] = [
  {
    id: "velvorn-sports-bra-01",
    name: "Sports Bra Top",
    price: 30,
    oldPrice: 45,
    displayPrice: "$30.00",
    displayOldPrice: "$45.00",
    images: [
      { src: "/images/velvorn-sports-bra.jpg", alt: "Sports Bra Top" }
    ],
    category: "Women",
    collectionSection: "hot-deals",
    season: "All Season",
    isNew: true,
    isPopular: true,
    salesCount: 140,
    ordersCount: 85,
    color: "Black",
    description: "Premium athletic sports bra designed for peak moves and built for style. High-support, breathable compression fabric.",
    sizes: ["XS", "S", "M", "L", "XL"],
  },
  {
    id: "velvorn-compression-top-02",
    name: "Compression Top",
    price: 30,
    oldPrice: 45,
    displayPrice: "$30.00",
    displayOldPrice: "$45.00",
    images: [
      { src: "/images/velvorn-compression-top.jpg", alt: "Compression Top" }
    ],
    category: "Women",
    collectionSection: "hot-deals",
    season: "All Season",
    isNew: true,
    isPopular: true,
    salesCount: 120,
    ordersCount: 72,
    color: "Heather Gray",
    description: "Ergonomic compression top for workouts, running and all-day active comfort.",
    sizes: ["XS", "S", "M", "L", "XL"],
  },
  {
    id: "velvorn-wind-breaker-03",
    name: "Wind Breaker",
    price: 52,
    oldPrice: 70,
    displayPrice: "$52.00",
    displayOldPrice: "$70.00",
    images: [
      { src: "/images/velvorn-wind-breaker.jpg", alt: "Wind Breaker" }
    ],
    category: "Women",
    collectionSection: "hot-deals",
    season: "Autumn/Spring",
    isNew: true,
    isPopular: true,
    salesCount: 95,
    ordersCount: 48,
    color: "Dark Onyx",
    description: "Lightweight weather-resistant windbreaker jacket tailored for modern movement.",
    sizes: ["S", "M", "L", "XL"],
  },
  {
    id: "velvorn-zen-tank-04",
    name: "Zen Tank",
    price: 40,
    displayPrice: "$40.00",
    images: [
      { src: "/images/velvorn-zen-tank.jpg", alt: "Zen Tank" }
    ],
    category: "Women",
    collectionSection: "latest-drops",
    season: "Summer",
    isNew: true,
    isPopular: true,
    salesCount: 88,
    ordersCount: 40,
    color: "Taupe / Sand",
    description: "Buttery-soft yoga and studio tank top offering effortless freedom of movement.",
    sizes: ["XS", "S", "M", "L"],
  },
  {
    id: "velvorn-oura-top-05",
    name: "Oura Top",
    price: 35,
    displayPrice: "$35.00",
    images: [
      { src: "/images/velvorn-oura-top.jpg", alt: "Oura Top" }
    ],
    category: "Women",
    collectionSection: "latest-drops",
    season: "Autumn/Winter",
    isNew: true,
    isPopular: false,
    salesCount: 65,
    ordersCount: 30,
    color: "Slate Blue",
    description: "Seamless long-sleeve performance layer with moisture-wicking technology.",
    sizes: ["XS", "S", "M", "L"],
  },
  {
    id: "velvorn-zen-top-06",
    name: "Zen Top",
    price: 50,
    displayPrice: "$50.00",
    images: [
      { src: "/images/velvorn-zen-top.jpg", alt: "Zen Top" }
    ],
    category: "Women",
    collectionSection: "latest-drops",
    season: "All Season",
    isNew: true,
    isPopular: true,
    salesCount: 78,
    ordersCount: 39,
    color: "Teal Forest",
    description: "Strappy studio top providing medium support with an elegant cross-back design.",
    sizes: ["S", "M", "L"],
  },
  {
    id: "velvorn-hoodie-07",
    name: "Hoodie",
    price: 45,
    displayPrice: "$45.00",
    images: [
      { src: "/images/velvorn-hoodie.jpg", alt: "Hoodie" }
    ],
    category: "Women",
    collectionSection: "latest-drops",
    season: "Autumn/Winter",
    isNew: true,
    isPopular: true,
    salesCount: 110,
    ordersCount: 60,
    color: "Heather Gray",
    description: "Cropped performance fleece hoodie with raw-edge finish and soft inner lining.",
    sizes: ["XS", "S", "M", "L", "XL"],
  },
  {
    id: "velvorn-sportswear-men-08",
    name: "Pro Performance Long-Sleeve",
    price: 48,
    displayPrice: "$48.00",
    images: [
      { src: "/images/sport-set.jpg", alt: "Pro Performance Long-Sleeve" }
    ],
    category: "Men",
    collectionSection: "standard",
    season: "All Season",
    isNew: true,
    isPopular: true,
    salesCount: 90,
    ordersCount: 45,
    color: "White / Black",
    description: "Men's athletic training compression shirt with fast-drying yarn.",
    sizes: ["S", "M", "L", "XL", "XXL"],
  },
  {
    id: "velvorn-sportswear-pants-09",
    name: "Active Tapered Jogger",
    price: 55,
    displayPrice: "$55.00",
    images: [
      { src: "/images/classic-set.jpg", alt: "Active Tapered Jogger" }
    ],
    category: "Men",
    collectionSection: "standard",
    season: "All Season",
    isNew: false,
    isPopular: true,
    salesCount: 82,
    ordersCount: 38,
    color: "Onyx Black",
    description: "Tailored athletic joggers with zippered pockets and 4-way stretch.",
    sizes: ["S", "M", "L", "XL"],
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

/** Karta ichida rasmli ko'rinish uchun oldindan yuklanadigan rasmlar ro'yxati. */
export const imageSources = [
  ...new Set(
    products.flatMap((product) => product.images.map((image) => image.src)),
  ),
];
