import { Product } from "./data";

/**
 * Universal kiyim-kechak shabloni uchun demo ma'lumotlar.
 *
 * MUHIM:
 * Ushbu demo mahsulotlar FAQAT VITE_DEMO_MODE="true" yoki DEMO_MODE="true" bo'lganda ko'rinadi.
 * Ishlab chiqarish (production) muhitida standart holatda o'chirilgan bo'ladi va bo'sh massiv qaytaradi.
 */
export function getLocalDemoProducts(): Product[] {
  // Faqat demo rejim yoqilgan bo'lsa ko'rsatiladi
  const isDemo = import.meta.env.VITE_DEMO_MODE === "true";
  if (!isDemo) {
    return [];
  }

  return [
    {
      id: "demo-prod-1",
      name: "Klassik Oq Ko'ylak",
      price: 280000,
      oldPrice: 350000,
      images: [{ src: "/images/placeholder.svg", alt: "Klassik Oq Ko'ylak" }],
      category: "Ko'ylaklar",
      season: "Barcha fasllar",
      isNew: true,
      isPopular: true,
      salesCount: 42,
      ordersCount: 56,
      color: "Oq",
      description: "Nafis va qulay paxta matosidan tikilgan klassik ko'ylak. Kundalik va ofis uslubi uchun ideal tanlov.",
      sizes: ["S", "M", "L", "XL"],
    },
    {
      id: "demo-prod-2",
      name: "Qora Klassik Shim",
      price: 340000,
      oldPrice: 420000,
      images: [{ src: "/images/placeholder.svg", alt: "Qora Klassik Shim" }],
      category: "Shimlar",
      season: "Barcha fasllar",
      isNew: true,
      isPopular: true,
      salesCount: 88,
      ordersCount: 104,
      color: "Qora",
      description: "To'g'ri bichimli qulay shim. Harakatlanish uchun juda qulay va sifatli mato.",
      sizes: ["S", "M", "L", "XL", "2XL"],
    },
    {
      id: "demo-prod-3",
      name: "Premium Jun Sviter Oversize",
      price: 420000,
      oldPrice: 510000,
      images: [{ src: "/images/placeholder.svg", alt: "Premium Jun Sviter" }],
      category: "Sviter",
      season: "Kuz / Qish",
      isNew: false,
      isPopular: true,
      salesCount: 115,
      ordersCount: 130,
      color: "Qaymoqrang",
      description: "Yumshoq junli to'qima. Issiq tutuvchi va zamonaviy oversize bichim.",
      sizes: ["XS", "S", "M", "L"],
    },
    {
      id: "demo-prod-4",
      name: "Oversize Paxta Futbolka",
      price: 180000,
      oldPrice: 220000,
      images: [{ src: "/images/placeholder.svg", alt: "Oversize Futbolka" }],
      category: "Futbolka",
      season: "Bahor / Yoz",
      isNew: true,
      isPopular: false,
      salesCount: 65,
      ordersCount: 78,
      color: "To'q kulrang",
      description: "100% paxta matosi. Nafas oluvchi va yuvilganda shaklini yo'qotmaydi.",
      sizes: ["S", "M", "L", "XL"],
    },
    {
      id: "demo-prod-5",
      name: "Yengil Bahorgi Kurtka",
      price: 590000,
      oldPrice: 720000,
      images: [{ src: "/images/placeholder.svg", alt: "Bahorgi Kurtka" }],
      category: "Kurtka",
      season: "Bahor / Kuz",
      isNew: true,
      isPopular: true,
      salesCount: 39,
      ordersCount: 47,
      color: "Zaytun / Xaki",
      description: "Shamol va yengil yomg'ir o'tkazmaydigan zamonaviy yengil kurtka.",
      sizes: ["S", "M", "L", "XL"],
    },
    {
      id: "demo-prod-6",
      name: "Sport Uslubidagi Kostyum",
      price: 480000,
      oldPrice: 580000,
      images: [{ src: "/images/placeholder.svg", alt: "Sport Kostyum" }],
      category: "Sport kiyimlari",
      season: "Barcha fasllar",
      isNew: false,
      isPopular: true,
      salesCount: 92,
      ordersCount: 110,
      color: "To'q ko'k",
      description: "Faol dam olish va harakatlanish uchun qulay ikki qismli sport to'plami.",
      sizes: ["S", "M", "L", "XL"],
    },
    {
      id: "demo-prod-7",
      name: "Klassik Trench Palto",
      price: 790000,
      oldPrice: 950000,
      images: [{ src: "/images/placeholder.svg", alt: "Klassik Trench Palto" }],
      category: "Kostyumlar",
      season: "Kuz / Bahor",
      isNew: true,
      isPopular: true,
      salesCount: 24,
      ordersCount: 31,
      color: "Bej / Qumrang",
      description: "Zamonaviy shahar uslubidagi nafis trench palto. Belbog'li qulay bichim.",
      sizes: ["S", "M", "L"],
    },
  ];
}
