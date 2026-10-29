import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import {
  ArrowRight,
  Check,
  Grid2X2,
  Heart,
  Home,
  Mail,
  MapPin,
  MessageCircle,
  Minus,
  Phone,
  Plus,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import Sheet from "./components/Sheet";
import ProductCard from "./components/ProductCard";
import ProductGallery from "./components/ProductGallery";
import Logo from "./components/Logo";
import { getTelegramWebApp, haptic, type TgWebApp } from "./telegram";
import {
  allCategory,
  money,
  products,
  sizes,
  type Product,
} from "./data";

type Panel = "product" | "cart" | "profile" | "contact" | "wishlist" | null;
type View = "home" | "catalog";
type CartItem = { id: string; size: string; quantity: number };
type Profile = { name: string; phone: string };

export type HeroSlide = {
  id?: string;
  src: string;
  alt?: string;
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  buttonText?: string;
};

/** Hero fonidagi avtomatik almashadigan suratlar (public/image-landing/ ichidagi bannerlar). */
const defaultHeroSlides: HeroSlide[] = [
  {
    id: "banner-1",
    src: "/image-landing/banner-1.jpg?v=2",
    alt: "DREEM ROOM • Yangi mavsum",
    title: "Har Kunlik Nafislik\nVa Go'zallik",
    subtitle: "Zamonaviy bichim va yuqori sifatli matolar. Har bir kun uchun nafislik va qulaylik uyg'unligi.",
    eyebrow: "DREEM ROOM • TO'PLAM",
    buttonText: "TO'PLAMNI KO'RISH",
  },
  {
    id: "banner-2",
    src: "/image-landing/banner-2.jpg?v=2",
    alt: "DREEM ROOM • Eksklyuziv to'plam",
    title: "Eksklyuziv Qishki\nTo'plam",
    subtitle: "Har bir detalda nozik did va qulaylik. Cheklangan miqdordagi eksklyuziv modellar.",
    eyebrow: "DREEM ROOM • TO'PLAM",
    buttonText: "TO'PLAMNI KO'RISH",
  },
  {
    id: "banner-3",
    src: "/image-landing/banner-3.jpg?v=2",
    alt: "DREEM ROOM • Premium uslub",
    title: "Zamonaviy Shahar\nUslubi",
    subtitle: "Zamonaviy shahar ritmi uchun maxsus yaratilgan qulay va bejirim kiyimlar.",
    eyebrow: "DREEM ROOM • TO'PLAM",
    buttonText: "TO'PLAMNI KO'RISH",
  },
  {
    id: "banner-4",
    src: "/image-landing/banner-4.jpg?v=2",
    alt: "DREEM ROOM • Nafis kolleksiya",
    title: "Qulaylik Va\nNafis Did",
    subtitle: "Har doim urfda bo'ladigan klassik va zamonaviy uslub uyg'unligi.",
    eyebrow: "DREEM ROOM • TO'PLAM",
    buttonText: "TO'PLAMNI KO'RISH",
  },
];

/** O'lcham yo'riqnomasi parametrlari. */
const sizeGuideData: Record<string, { height: string; weight: string }> = {
  XS: { height: "150–158 sm", weight: "40–48 kg" },
  S: { height: "158–165 sm", weight: "48–55 kg" },
  M: { height: "165–172 sm", weight: "55–62 kg" },
  L: { height: "170–178 sm", weight: "62–70 kg" },
  XL: { height: "175–182 sm", weight: "70–78 kg" },
  XXL: { height: "180–190 sm", weight: "78–88 kg" },
  "3XL": { height: "185–195 sm", weight: "88–98 kg" },
  Standart: { height: "158–180 sm", weight: "48–78 kg (Universal)" },
};

function useWishlist() {
  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("dreemroom-wishlist");
      return stored ? (JSON.parse(stored) as string[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("dreemroom-wishlist", JSON.stringify(wishlist));
    } catch {}
  }, [wishlist]);

  return [wishlist, setWishlist] as const;
}

function useCart() {
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem("dreemroom-cart");
      return stored ? (JSON.parse(stored) as CartItem[]) : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("dreemroom-cart", JSON.stringify(cart));
    } catch {
      /* Xotira yopiq bo'lsa ham xarid davom etadi. */
    }
  }, [cart]);
  return [cart, setCart] as const;
}

function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(() => {
    try {
      const stored = localStorage.getItem("dreemroom-profile");
      return stored ? (JSON.parse(stored) as Profile) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (profile)
        localStorage.setItem("dreemroom-profile", JSON.stringify(profile));
      else localStorage.removeItem("dreemroom-profile");
    } catch {
      /* Profil saqlanmasa ham xarid oqimi ishlayveradi. */
    }
  }, [profile]);

  return [profile, setProfile] as const;
}

type SiteContacts = {
  phone: string;
  telegram: string;
  telegramUrl: string;
  instagram: string;
  instagramUrl: string;
  address: string;
  workHours: string;
  email: string;
  brandDesc: string;
};

const defaultSiteContacts: SiteContacts = {
  phone: "+998 90 123 45 67",
  telegram: "@dreemroom",
  telegramUrl: "https://t.me/dreemroom",
  instagram: "@dreemroom",
  instagramUrl: "https://instagram.com/dreemroom",
  address: "Toshkent shahri, O'zbekiston",
  workHours: "Har kuni 09:00 — 21:00",
  email: "info@dreemroom.uz",
  brandDesc: "Zamonaviy va premium sifatdagi kiyimlar to'plami. O'zbekiston bo'ylab tezkor va qulay yetkazib berish xizmati.",
};

export default function App() {
  const [view, setView] = useState<View>("home");
  const [panel, setPanel] = useState<Panel>(null);
  const [category, setCategory] = useState(allCategory);
  const [cart, setCart] = useCart();
  const [wishlist, setWishlist] = useWishlist();
  const [profile, setProfile] = useProfile();
  const [productsList, setProductsList] = useState<Product[]>(() => {
    try {
      const cached = localStorage.getItem("dreemroom_cached_prods");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return products;
  });
  const [heroSlidesList, setHeroSlidesList] = useState<HeroSlide[]>(() => {
    try {
      const cached = localStorage.getItem("dreemroom_cached_slides");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return defaultHeroSlides;
  });
  const [siteContacts, setSiteContacts] = useState<SiteContacts>(() => {
    try {
      const cached = localStorage.getItem("dreemroom_cached_contacts");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === "object") return { ...defaultSiteContacts, ...parsed };
      }
    } catch {}
    return defaultSiteContacts;
  });
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(() => {
    try {
      const cached = localStorage.getItem("dreemroom_cached_prods");
      return !cached || JSON.parse(cached).length === 0;
    } catch {
      return true;
    }
  });
  const [activeProduct, setActiveProduct] = useState<Product | null>(products[0] || null);
  const [selectedSize, setSelectedSize] = useState("");
  const [sizeError, setSizeError] = useState(false);
  const [productQuantity, setProductQuantity] = useState(1);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [ordered, setOrdered] = useState(false);
  const [toast, setToast] = useState("");
  const [slide, setSlide] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"default" | "popular" | "price-asc" | "price-desc">("default");
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const tgRef = useRef<TgWebApp | null>(null);
  const orderFormRef = useRef<HTMLFormElement>(null);
  const profileFormRef = useRef<HTMLFormElement>(null);
  const actionsRef = useRef({
    addToCart: () => {},
    openCatalog: () => {},
    submitOrder: () => {},
    saveProfile: () => {},
  });

  // Backend / Admin panel bilan mahsulotlarni xavfsiz sinxronlash (Tezkor kesh bilan)
  useEffect(() => {
    let active = true;
    async function syncProducts() {
      try {
        const res = await fetch("/api/products");
        if (res.ok && active) {
          const data: Product[] = await res.json();
          if (Array.isArray(data)) {
            setProductsList(data);
            try {
              localStorage.setItem("dreemroom_cached_prods", JSON.stringify(data));
            } catch {}
          }
        }
      } catch {
        /* Backend uzilgan bo'lsa ham keshdagi mahsulotlar ishlayveradi */
      } finally {
        if (active) setIsLoadingProducts(false);
      }
    }

    syncProducts();
    const interval = setInterval(syncProducts, 15000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // Backend / Admin panel bilan bannyerlarni sinxronlash (Tezkor kesh bilan)
  useEffect(() => {
    let active = true;
    async function syncBanners() {
      try {
        const res = await fetch("/api/banners");
        if (res.ok && active) {
          const data: HeroSlide[] = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setHeroSlidesList(data);
            try {
              localStorage.setItem("dreemroom_cached_slides", JSON.stringify(data));
            } catch {}
          }
        }
      } catch {
        /* Backend ulanmagan bo'lsa boshlang'ich bannyerlar qoladi */
      }
    }

    syncBanners();
    const interval = setInterval(syncBanners, 20000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // Backend / Admin panel bilan sayt kontaktlarini sinxronlash
  useEffect(() => {
    let active = true;
    async function syncContacts() {
      try {
        const res = await fetch("/api/contacts");
        if (res.ok && active) {
          const data = await res.json();
          if (data && typeof data === "object") {
            setSiteContacts((prev) => ({ ...prev, ...data }));
            try {
              localStorage.setItem("dreemroom_cached_contacts", JSON.stringify(data));
            } catch {}
          }
        }
      } catch {}
    }

    syncContacts();
    const interval = setInterval(syncContacts, 30000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!productsList.length) {
      setActiveProduct(null);
      setCart([]);
      setWishlist([]);
      try {
        localStorage.removeItem("dreemroom-cart");
        localStorage.removeItem("dreemroom-wishlist");
      } catch {}
      return;
    }
    const current = activeProduct ? productsList.find((p) => p.id === activeProduct.id) : null;
    if (current) {
      setActiveProduct(current);
    } else {
      setActiveProduct(productsList[0] || null);
    }
  }, [productsList]);

  // Telegram Mini App: kengayish, orqa fon va barqaror balandlik.
  useEffect(() => {
    const tg = getTelegramWebApp();
    if (!tg) return;
    tgRef.current = tg;
    document.body.classList.add("in-telegram");

    const syncHeight = () => {
      if (tg.viewportStableHeight) {
        document.documentElement.style.setProperty(
          "--app-height",
          `${tg.viewportStableHeight}px`,
        );
      }
    };

    try {
      tg.ready();
      tg.expand();
      tg.setHeaderColor?.("#ffffff");
      tg.setBackgroundColor?.("#ffffff");
      tg.disableVerticalSwipes?.();
      syncHeight();
      tg.onEvent?.("viewportChanged", syncHeight);
    } catch {
      /* WebApp funksiyalari versiyaga qarab farq qilishi mumkin. */
    }

    return () => {
      document.body.classList.remove("in-telegram");
      try {
        tg.offEvent?.("viewportChanged", syncHeight);
      } catch {
        /* Tozalash xatosi interfeysga ta'sir qilmaydi. */
      }
    };
  }, []);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce(
    (sum, item) =>
      sum +
      (productsList.find((p) => p.id === item.id)?.price || 0) * item.quantity,
    0,
  );

  // Dinamik toifalar: Eng ko'p mahsulot qo'shilgan toifalar birinchi bo'lib chiqadi
  const dynamicCategories = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of productsList) {
      const cat = (p.category || "").trim();
      if (cat) {
        counts[cat] = (counts[cat] || 0) + 1;
      }
    }
    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([cat]) => cat);

    return [allCategory, ...sorted];
  }, [productsList]);

  const filterAndSort = (items: Product[]) => {
    let result = items;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.color.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q),
      );
    }
    if (sortBy === "popular") {
      result = [...result].sort((a, b) => {
        const aScore = (a.salesCount || 0) * 10 + (a.ordersCount || 0) * 5 + (a.isPopular ? 1000 : 0);
        const bScore = (b.salesCount || 0) * 10 + (b.ordersCount || 0) * 5 + (b.isPopular ? 1000 : 0);
        if (bScore !== aScore) return bScore - aScore;
        return (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0);
      });
    } else if (sortBy === "price-asc") {
      result = [...result].sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-desc") {
      result = [...result].sort((a, b) => b.price - a.price);
    }
    return result;
  };

  const catalogProducts = filterAndSort(
    productsList.filter((p) => {
      if (category === allCategory) return true;
      const q = category.toLowerCase();
      return (
        (p.category && p.category.toLowerCase() === q) ||
        (p.name && p.name.toLowerCase().includes(q))
      );
    }),
  );

  // Eng ko'p xarid qilingan ommabop mahsulotlar (Best Sellers dinamik algoritmi)
  const popularTopProducts = useMemo(() => {
    const sorted = [...productsList].sort((a, b) => {
      const aSales = (a.salesCount || 0) * 10 + (a.ordersCount || 0) * 5 + (a.isPopular ? 100 : 0);
      const bSales = (b.salesCount || 0) * 10 + (b.ordersCount || 0) * 5 + (b.isPopular ? 100 : 0);
      if (bSales !== aSales) return bScoreDiff(bSales, aSales);
      return 0;
    });

    function bScoreDiff(bScore: number, aScore: number) {
      return bScore - aScore;
    }

    const top3 = sorted.slice(0, 3);
    while (top3.length < 3 && productsList[top3.length]) {
      top3.push(productsList[top3.length]);
    }
    return top3;
  }, [productsList]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Barcha hero banner suratlarini xotiraga oldindan yuklab qo'yish (kechikish va qotish bo'lmasligi uchun)
  useEffect(() => {
    heroSlidesList.forEach((item) => {
      const img = new Image();
      img.src = item.src;
    });
  }, [heroSlidesList]);

  const touchStartXRef = useRef<number | null>(null);

  function handleHeroTouchStart(e: React.TouchEvent) {
    touchStartXRef.current = e.touches[0].clientX;
  }

  function handleHeroTouchEnd(e: React.TouchEvent) {
    if (touchStartXRef.current === null) return;
    const diff = touchStartXRef.current - e.changedTouches[0].clientX;
    const len = heroSlidesList.length || 1;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        setSlide((curr) => (curr + 1) % len);
      } else {
        setSlide((curr) => (curr - 1 + len) % len);
      }
    }
    touchStartXRef.current = null;
  }

  // Hero fonidagi suratlar bosh sahifada avtomatik almashib turadi.
  useEffect(() => {
    if (view !== "home") return;
    const len = heroSlidesList.length || 1;
    const timer = setInterval(
      () => setSlide((current) => (current + 1) % len),
      4500,
    );
    return () => clearInterval(timer);
  }, [view, slide, heroSlidesList]);

  function goHome() {
    setView("home");
    setSearchQuery("");
    setPanel(null);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function openCatalog(
    nextCategory = allCategory,
    nextSort: "default" | "popular" | "price-asc" | "price-desc" = "default",
  ) {
    setCategory(nextCategory);
    setSortBy(nextSort);
    setView("catalog");
    setSearchQuery("");
    setPanel(null);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function openProduct(product: Product) {
    setActiveProduct(product);
    const prodSizes =
      product.sizes &&
      product.sizes.length > 0 &&
      !(product.sizes.length === 1 && product.sizes[0] === "Standart")
        ? product.sizes
        : ["XS", "S", "M", "L", "XL"];
    setSelectedSize(prodSizes[0] || "S");
    setSizeError(false);
    setProductQuantity(1);
    setShowSizeGuide(false);
    setPanel("product");
  }

  function toggleWishlist(productId: string) {
    setWishlist((current) => {
      const isLiked = current.includes(productId);
      const next = isLiked
        ? current.filter((id) => id !== productId)
        : [...current, productId];
      setToast(
        isLiked ? "Sevimlilardan o'chirildi" : "Sevimlilarga qo'shildi"
      );
      haptic(tgRef.current, "select");
      return next;
    });
  }

  function handleShareProduct(product: Product) {
    haptic(tgRef.current, "light");
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator
        .share({
          title: product.name,
          text: `${product.name} — DREEM ROOM`,
          url: window.location.href,
        })
        .catch(() => {});
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setToast("Mahsulot havolasi nusxalandi!");
    }
  }

  function addToCartWithQuantity(qty = 1) {
    if (!activeProduct) return;
    if (!selectedSize) {
      setSizeError(true);
      return;
    }
    setCart((current) => {
      const existing = current.find(
        (item) => item.id === activeProduct.id && item.size === selectedSize,
      );
      return existing
        ? current.map((item) =>
            item === existing
              ? { ...item, quantity: Math.min(item.quantity + qty, 10) }
              : item,
          )
        : [
            ...current,
            { id: activeProduct.id, size: selectedSize, quantity: qty },
          ];
    });
    setPanel(null);
    setToast(`${activeProduct.name} (${qty} dona) savatga qo'shildi`);
    haptic(tgRef.current, "success");
  }

  function addToCart() {
    addToCartWithQuantity(productQuantity);
  }

  function handleQuickAdd(product: Product) {
    const prodSizes = product.sizes && product.sizes.length > 0 ? product.sizes : sizes;
    const defaultSize = prodSizes[0] || "XS";
    setCart((current) => {
      const existing = current.find(
        (item) => item.id === product.id && item.size === defaultSize,
      );
      return existing
        ? current.map((item) =>
            item === existing
              ? { ...item, quantity: Math.min(item.quantity + 1, 10) }
              : item,
          )
        : [...current, { id: product.id, size: defaultSize, quantity: 1 }];
    });
    setToast(`${product.name} (${defaultSize}) savatga qo'shildi`);
    haptic(tgRef.current, "success");
  }

  function changeQuantity(id: string, size: string, step: number) {
    setCart((current) =>
      current
        .map((item) =>
          item.id === id && item.size === size
            ? { ...item, quantity: Math.min(10, item.quantity + step) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  function submitOrder() {
    const form = orderFormRef.current;
    const customerName = (form?.elements.namedItem("name") as HTMLInputElement)?.value || profile?.name || "Mijoz";
    const customerPhone = (form?.elements.namedItem("phone") as HTMLInputElement)?.value || profile?.phone || "+998 90 000 00 00";
    const customerAddress = (form?.elements.namedItem("address") as HTMLInputElement)?.value || "Yetkazib berish (Telegram)";
    const paymentMethod = (form?.elements.namedItem("paymentMethod") as HTMLSelectElement)?.value || "Naqd pul / Karta (kuryerga)";

    const orderPayload = {
      id: "ORD-" + Math.floor(100000 + Math.random() * 900000),
      createdAt: new Date().toISOString(),
      customer: {
        name: customerName,
        phone: customerPhone,
        address: customerAddress,
      },
      items: cart.map((item) => {
        const prod = productsList.find((p) => p.id === item.id);
        return {
          id: item.id,
          name: prod?.name || item.id,
          size: item.size,
          quantity: item.quantity,
          price: prod?.price || 0,
          image: prod?.images?.[0]?.src || "",
        };
      }),
      total,
      status: "Yangi",
      paymentMethod: paymentMethod,
    };

    fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderPayload),
    }).catch(() => null);

    // Profilga ism va telefonni eslab qolish
    if (customerName && customerPhone) {
      setProfile({ name: customerName, phone: customerPhone });
    }

    setCart([]);
    setOrdered(true);
    haptic(tgRef.current, "success");
  }

  function placeOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitOrder();
  }

  function openProfile() {
    const telegramUser = tgRef.current?.initDataUnsafe?.user;
    const telegramName = [telegramUser?.first_name, telegramUser?.last_name]
      .filter(Boolean)
      .join(" ");
    setProfileName(profile?.name || telegramName);
    setProfilePhone(profile?.phone || "");
    setPanel("profile");
  }

  function saveProfile() {
    const name = profileName.trim();
    const phone = profilePhone.trim();
    if (!name || !phone) return;
    setProfile({ name, phone });
    setPanel(null);
    setToast("Profil saqlandi");
    haptic(tgRef.current, "success");
  }

  actionsRef.current = { addToCart, openCatalog, submitOrder, saveProfile };

  // Telegram "Orqaga" tugmasi: oyna > katalog > bosh sahifa.
  useEffect(() => {
    const button = tgRef.current?.BackButton;
    if (!button) return;
    const shouldShow = panel !== null || view === "catalog";
    const handler = () => {
      if (panel) setPanel(null);
      else goHome();
    };
    try {
      if (shouldShow) {
        button.show();
        button.onClick(handler);
      } else {
        button.hide();
      }
    } catch {
      /* Tugma mavjud bo'lmasa, ichki navigatsiya ishlayveradi. */
    }
    return () => {
      try {
        button.offClick(handler);
      } catch {
        /* Tozalash xatosi interfeysga ta'sir qilmaydi. */
      }
    };
  });

  // Telegram pastdagi asosiy tugma mahsulot va savat oynalarida.
  useEffect(() => {
    const button = tgRef.current?.MainButton;
    if (!button) return;

    let text = "";
    let onClick: (() => void) | null = null;
    if (panel === "product") {
      text = "Savatga qo'shish";
      onClick = () => actionsRef.current.addToCart();
    } else if (panel === "profile") {
      text = "Profilni saqlash";
      onClick = () => {
        const form = profileFormRef.current;
        if (form && !form.reportValidity()) return;
        actionsRef.current.saveProfile();
      };
    } else if (panel === "cart" && ordered) {
      text = "Xaridni davom ettirish";
      onClick = () => actionsRef.current.openCatalog();
    } else if (panel === "cart" && cart.length > 0) {
      text = `Buyurtma berish • ${money(total)}`;
      onClick = () => {
        const form = orderFormRef.current;
        if (form && !form.reportValidity()) return;
        actionsRef.current.submitOrder();
      };
    }
    if (!onClick) return;

    const handler = onClick;
    try {
      button.setParams?.({
        text,
        color: "#403D4F",
        text_color: "#FFFFFF",
        is_active: panel !== "product" || Boolean(selectedSize),
      });
      if (!button.setParams && button.setText) button.setText(text);
      button.show();
      button.onClick(handler);
      document.documentElement.classList.add("tg-mainbutton-on");
    } catch {
      /* Asosiy tugma bo'lmasa, oynadagi tugma ishlayveradi. */
    }
    return () => {
      try {
        button.offClick(handler);
        button.hide();
      } catch {
        /* Tozalash xatosi interfeysga ta'sir qilmaydi. */
      }
      document.documentElement.classList.remove("tg-mainbutton-on");
    };
  });

  function openCart() {
    setOrdered(false);
    setPanel("cart");
  }

  function openContact() {
    setPanel("contact");
  }

  return (
    <MotionConfig reducedMotion="user">
      <a className="skip-link" href="#main">
        Tarkibga o'tish
      </a>

      <header className="header velvorn-header">
        <div className="header-zone header-brand" aria-label="Bosh sahifa">
          <button
            className="brand brand-velvorn"
            onClick={goHome}
            aria-label="DREEM ROOM"
          >
            <Logo />
          </button>
        </div>

        <nav className="nav velvorn-nav" aria-label="Asosiy menyu">
          <button
            className={view === "home" && !panel ? "nav-link is-active" : "nav-link"}
            onClick={goHome}
          >
            Asosiy
          </button>
          <button
            className={view === "catalog" && !panel ? "nav-link is-active" : "nav-link"}
            onClick={() => openCatalog()}
          >
            Katalog
          </button>
          <button
            className={panel === "contact" ? "nav-link is-active" : "nav-link"}
            onClick={openContact}
          >
            Kontakt
          </button>
        </nav>

        <div className="header-zone header-actions">
          <button
            className="action-btn"
            onClick={() => {
              haptic(tgRef.current, "light");
              openCatalog();
            }}
            aria-label="Katalogdan qidirish"
          >
            <Search size={20} strokeWidth={1.6} />
          </button>
          <button
            className={`action-btn ${panel === "profile" ? "is-active" : ""}`}
            onClick={openProfile}
            aria-label="Profil"
          >
            <UserRound size={20} strokeWidth={1.6} />
            {profile && (
              <span className="profile-initial">
                {profile.name.charAt(0).toUpperCase()}
              </span>
            )}
          </button>
          <button
            className={`action-btn ${panel === "wishlist" ? "is-active" : ""}`}
            onClick={() => {
              haptic(tgRef.current, "light");
              setPanel("wishlist");
            }}
            aria-label={`Sevimlilar, ${wishlist.length} ta mahsulot`}
          >
            <Heart size={20} strokeWidth={1.6} />
            {wishlist.length > 0 && <span className="action-badge">{wishlist.length}</span>}
          </button>
          <button
            className={`action-btn action-cart-frame ${panel === "cart" ? "is-active" : ""}`}
            onClick={openCart}
            aria-label={`Savat, ${cartCount} ta mahsulot`}
          >
            <ShoppingBag size={18} strokeWidth={1.8} />
            <span className="cart-frame-label">Savat</span>
            {cartCount > 0 && <span className="action-badge">{cartCount}</span>}
          </button>
        </div>
      </header>

      <main id="main">
        {view === "home" ? (
          <>
            {/* =================================================================
                1. HERO SECTION: DREEM ROOM • Daily Winds For Colors (4 ta banner)
                ================================================================= */}
            <section
              className="velvorn-hero-section"
              aria-label="Asosiy banner"
              onTouchStart={handleHeroTouchStart}
              onTouchEnd={handleHeroTouchEnd}
            >
              <div className="velvorn-hero-container">
                {heroSlidesList.map((item, idx) => (
                  <img
                    key={item.src + idx}
                    src={item.src}
                    alt={item.alt || "DREEM ROOM"}
                    className={`velvorn-hero-bg ${idx === slide ? "is-active" : ""}`}
                    loading={idx === 0 ? "eager" : "lazy"}
                    decoding="async"
                  />
                ))}

                <div className="velvorn-hero-overlay">
                  <div className="velvorn-hero-editorial">
                    <div className="hero-eyebrow-row">
                      <span className="hero-eyebrow-symbol">◈</span>
                      <span className="hero-eyebrow-text">
                        {heroSlidesList[slide]?.eyebrow || "DREEM ROOM • TO'PLAM"}
                      </span>
                    </div>
                    <h1 className="hero-editorial-title">
                      {heroSlidesList[slide]?.title || "Har Kunlik Nafislik\nVa Go'zallik"}
                    </h1>
                    <p className="hero-editorial-desc">
                      {heroSlidesList[slide]?.subtitle ||
                        "Zamonaviy bichim va yuqori sifatli matolar. Har bir kun uchun nafislik va qulaylik uyg'unligi."}
                    </p>
                    <button
                      type="button"
                      className="velvorn-cta-btn"
                      onClick={() => {
                        haptic(tgRef.current, "light");
                        openCatalog();
                      }}
                      aria-label="To'plamni ko'rish"
                    >
                      <span>
                        {heroSlidesList[slide]?.buttonText || "TO'PLAMNI KO'RISH"}
                      </span>
                      <ArrowRight size={14} className="velvorn-cta-arrow" />
                    </button>
                  </div>

                  {/* Kapsula shaklidagi pastki indikator nuqtalari */}
                  <div className="velvorn-hero-dots">
                    {heroSlidesList.map((_, idx) => (
                      <button
                        key={"dot-" + idx}
                        type="button"
                        className={`velvorn-hero-dot ${idx === slide ? "is-active" : ""}`}
                        onClick={() => setSlide(idx)}
                        aria-label={`${idx + 1}-banner`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* =================================================================
                2. KATALOG (6 ta kartochka va BARCHASI tugmasi)
                ================================================================= */}
            <section className="velvorn-cards-section" id="katalog">
              <div className="velvorn-section-header velvorn-center-header">
                <h2 className="velvorn-heading-drops">Katalog</h2>
              </div>
              {isLoadingProducts && productsList.length === 0 ? (
                <div className="velvorn-clean-grid grid-radiusless">
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <div key={n} className="card-skeleton">
                      <div className="card-skeleton-img" />
                      <div className="card-skeleton-info">
                        <div className="card-skeleton-line" />
                        <div className="card-skeleton-line short" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : productsList.length > 0 ? (
                <>
                  <div className="velvorn-clean-grid grid-radiusless">
                    {productsList.slice(0, 6).map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onOpen={openProduct}
                      />
                    ))}
                  </div>
                  <div className="catalog-see-all-wrap">
                    <button
                      type="button"
                      className="btn-see-all"
                      onClick={() => openCatalog()}
                      aria-label="Barcha mahsulotlarni ko'rish"
                    >
                      <span>BARCHASI</span>
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: "center", padding: "48px 20px", color: "#71717a" }}>
                  <p style={{ fontSize: "15px", fontWeight: 500, margin: "0 0 6px" }}>
                    Hozircha mahsulotlar mavjud emas.
                  </p>
                  <p style={{ fontSize: "13px", color: "#a1a1aa", margin: 0 }}>
                    Yangi to'plamlar tez orada qo'shiladi.
                  </p>
                </div>
              )}
            </section>

            {/* =================================================================
                3. OMMABOP TO'PLAMLAR (Eng ko'p xarid qilinganlar algoritmi)
                ================================================================= */}
            {popularTopProducts.length > 0 && (
              <section className="velvorn-cards-section hot-sale-section" id="ommabop-toplamlar">
                <div className="velvorn-section-header hot-sale-center-head">
                  <h2 className="velvorn-heading-drops hot-sale-title">Ommabop to'plamlar</h2>
                </div>
                <div className="hot-sale-grid">
                  {popularTopProducts.map((prod, idx) => {
                    const cardImg = ["/images/10.jpg", "/images/11.png", "/images/12.png"][idx] || prod.images?.[0]?.src;
                    return (
                      <div
                        key={prod.id || `popular-${idx}`}
                        className="hot-sale-card"
                        onClick={() => openProduct(prod)}
                      >
                        <div className="hot-sale-media">
                          <img
                            src={cardImg}
                            alt={prod.name}
                            className="hot-sale-img"
                            loading="lazy"
                          />
                        </div>
                        <div className="hot-sale-info">
                          <h3 className="hot-sale-card-title">{prod.name}</h3>
                          <p className="hot-sale-card-price">{money(prod.price, prod.displayPrice)}</p>
                          <button
                            type="button"
                            className="btn-shop-now"
                            onClick={(e) => {
                              e.stopPropagation();
                              openProduct(prod);
                            }}
                          >
                            <span>XARID QILISH</span>
                            <span className="shop-arrow">→</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        ) : (
          <section className="section catalog">
            <div className="catalog-head-block">
              <div>
                <h1 className="catalog-title">
                  {category === allCategory ? "Katalog" : category}
                </h1>
                <p className="catalog-count">{catalogProducts.length} ta model</p>
              </div>
              <div className="catalog-toolbar">
                <div className="search-field">
                  <Search size={16} />
                  <input
                    type="text"
                    placeholder="Katalogdan qidirish..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      aria-label="Tozalash"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <div className="sort-field">
                  <SlidersHorizontal size={15} />
                  <select
                    value={sortBy}
                    onChange={(e) =>
                      setSortBy(
                        e.target.value as "default" | "popular" | "price-asc" | "price-desc",
                      )
                    }
                    aria-label="Saralash"
                  >
                    <option value="default">Standart saralash</option>
                    <option value="popular">Ommabop (Eng ko'p sotilganlar)</option>
                    <option value="price-asc">Narx: Arzondan qimmatga</option>
                    <option value="price-desc">Narx: Qimmatdan arzonga</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="chips" aria-label="Kategoriyalar">
              {dynamicCategories.map((item) => (
                <button
                  key={item}
                  className={category === item ? "chip is-active" : "chip"}
                  onClick={() => setCategory(item)}
                  aria-pressed={category === item}
                >
                  {item}
                </button>
              ))}
            </div>

            {catalogProducts.length ? (
              <div className="grid">
                {catalogProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onOpen={openProduct}
                  />
                ))}
              </div>
            ) : (
              <div className="empty">
                <p>Ushbu bo'limda yoki qidiruv bo'yicha model topilmadi.</p>
                <button
                  className="btn"
                  onClick={() => {
                    setCategory(allCategory);
                    setSearchQuery("");
                  }}
                >
                  Barcha mahsulotlar
                  <ArrowRight size={15} />
                </button>
              </div>
            )}
          </section>
        )}
      </main>

      <footer className="velvorn-footer" id="contact">
        {/* Orqa fondagi DREEM ROOM suv belgisi (Watermark) */}
        <div className="footer-bg-watermark" aria-hidden="true">
          <svg
            id="_Слой_1"
            data-name="Слой 1"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 1033.19 90"
            className="footer-watermark-svg"
          >
            <path d="M9.12,0h31.02c5.08,0,10.04.52,14.9,1.56,4.85,1.04,9.34,2.48,13.45,4.34,4.11,1.85,7.9,4.11,11.37,6.78,3.46,2.67,6.4,5.58,8.81,8.73,2.41,3.15,4.29,6.6,5.64,10.34,1.35,3.74,2.03,7.57,2.03,11.48s-.68,7.74-2.03,11.48c-1.35,3.74-3.23,7.19-5.64,10.34-2.41,3.15-5.35,6.06-8.81,8.73-3.47,2.67-7.25,4.93-11.37,6.78-4.11,1.85-8.6,3.3-13.45,4.34-4.86,1.04-9.82,1.56-14.9,1.56H.56c-.15,0-.28-.06-.39-.17-.11-.11-.17-.24-.17-.39V.56c0-.15.06-.28.17-.39.11-.11.24-.17.39-.17h8.56ZM17.12,77.83h23.01c5.52,0,10.78-.91,15.79-2.72,5-1.82,9.33-4.26,12.98-7.34,3.65-3.08,6.54-6.75,8.67-11.03,2.13-4.28,3.2-8.77,3.2-13.48,0-5-1.07-9.67-3.2-14.01-2.13-4.34-5.02-8-8.67-10.98-3.65-2.98-7.97-5.34-12.95-7.06-4.98-1.72-10.26-2.59-15.82-2.59h-23.01v69.21Z"/>
            <path d="M119.46,0h47.25c3.85,0,7.56.32,11.12.95s6.97,1.66,10.23,3.09c3.26,1.43,6.11,3.18,8.53,5.25,2.43,2.08,4.38,4.65,5.86,7.73,1.48,3.08,2.28,6.49,2.39,10.23.11,3.3-.44,6.41-1.64,9.34-1.2,2.93-2.87,5.47-5,7.62-2.13,2.15-4.59,4-7.37,5.56-2.78,1.56-5.72,2.72-8.81,3.5-3.09.78-6.18,1.17-9.26,1.17h-6.95c20.42,15.9,33.3,25.92,38.64,30.07.41.33.53.74.36,1.22-.17.48-.51.72-1.03.72h-20.79c-.3,0-.56-.11-.78-.33-4.45-4.45-10.03-10.02-16.76-16.71-6.73-6.69-11.74-11.68-15.04-14.98h-22.96v31.46c0,.15-.05.28-.14.39-.09.11-.21.17-.36.17h-16.07c-.15,0-.28-.06-.39-.17-.11-.11-.17-.24-.17-.39V.56c0-.15.06-.28.17-.39.11-.11.24-.17.39-.17h8.56ZM127.47,45.81h45.31c2.56,0,4.9-.41,7.03-1.22,2.13-.82,3.87-1.87,5.23-3.17,1.35-1.3,2.5-2.78,3.45-4.45.95-1.67,1.61-3.32,2-4.95.39-1.63.58-3.22.58-4.78s-.25-3.21-.75-4.84c-.5-1.63-1.36-3.28-2.58-4.95-1.22-1.67-2.73-3.15-4.53-4.45-1.8-1.3-4.12-2.35-6.98-3.17-2.85-.81-6.02-1.22-9.51-1.22h-39.25v37.19Z"/>
            <path d="M295.63,86.44h-75.71c-.15,0-.28-.06-.39-.17-.11-.11-.17-.24-.17-.39V.56c0-.15.06-.28.17-.39.11-.11.24-.17.39-.17h75.71c.15,0,.27.06.36.17.09.11.14.24.14.39v4.34c0,.15-.05.27-.14.36s-.21.14-.36.14h-59.15v37.86h35.69c.15,0,.28.05.39.14s.17.21.17.36v4.34c0,.15-.06.28-.17.39s-.24.17-.39.17h-35.69v32.41h59.15c.15,0,.27.05.36.14s.14.21.14.36v4.34c0,.15-.05.28-.14.39-.09.11-.21.17-.36.17Z"/>
            <path d="M386.68,86.44h-75.71c-.15,0-.28-.06-.39-.17-.11-.11-.17-.24-.17-.39V.56c0-.15.06-.28.17-.39.11-.11.24-.17.39-.17h75.71c.15,0,.27.06.36.17.09.11.14.24.14.39v4.34c0,.15-.05.27-.14.36s-.21.14-.36.14h-59.15v37.86h35.69c.15,0,.28.05.39.14s.17.21.17.36v4.34c0,.15-.06.28-.17.39s-.24.17-.39.17h-35.69v32.41h59.15c.15,0,.27.05.36.14s.14.21.14.36v4.34c0,.15-.05.28-.14.39-.09.11-.21.17-.36.17Z"/>
            <path d="M502.81.5c.18,2.37,1.37,16.65,3.56,42.83,2.19,26.18,3.37,40.35,3.56,42.5,0,.19-.05.33-.14.44-.09.11-.23.17-.42.17h-13.34c-.33,0-.52-.17-.56-.5-.41-5.23-2.52-30.65-6.34-76.27-22.12,43.92-33.6,66.69-34.41,68.32-.07.19-.24.28-.5.28h-4.67c-.22,0-.39-.08-.5-.22-5.37-9.67-17.33-31.09-35.86-64.26-3.3,32.84-5.71,56.89-7.23,72.16-.04.33-.22.5-.56.5h-7.5c-.19,0-.32-.06-.42-.17-.09-.11-.14-.26-.14-.44,4.22-42.36,7.06-70.8,8.51-85.33.04-.33.22-.5.56-.5h15.9c.22,0,.39.09.5.28.67,1.19,3.34,5.98,8.01,14.37s9.95,17.85,15.84,28.38c5.89,10.53,9.45,16.88,10.67,19.07C477.65,21.7,488,1.09,488.41.28c.11-.19.28-.28.5-.28h13.34c.33,0,.52.17.56.5Z"/>
            <path d="M630.39,0h47.25c3.85,0,7.56.32,11.12.95s6.97,1.66,10.23,3.09c3.26,1.43,6.11,3.18,8.53,5.25,2.43,2.08,4.38,4.65,5.86,7.73,1.48,3.08,2.28,6.49,2.39,10.23.11,3.3-.44,6.41-1.64,9.34-1.2,2.93-2.87,5.47-5,7.62-2.13,2.15-4.59,4-7.37,5.56-2.78,1.56-5.72,2.72-8.81,3.5-3.09.78-6.18,1.17-9.26,1.17h-6.95c20.42,15.9,33.3,25.92,38.64,30.07.41.33.53.74.36,1.22-.17.48-.51.72-1.03.72h-20.79c-.3,0-.56-.11-.78-.33-4.45-4.45-10.03-10.02-16.76-16.71-6.73-6.69-11.74-11.68-15.04-14.98h-22.96v31.46c0,.15-.05.28-.14.39-.09.11-.21.17-.36.17h-16.07c-.15,0-.28-.06-.39-.17-.11-.11-.17-.24-.17-.39V.56c0-.15.06-.28.17-.39.11-.11.24-.17.39-.17h8.56ZM638.39,45.81h45.31c2.56,0,4.9-.41,7.03-1.22,2.13-.82,3.87-1.87,5.23-3.17,1.35-1.3,2.5-2.78,3.45-4.45.95-1.67,1.61-3.32,2-4.95.39-1.63.58-3.22.58-4.78s-.25-3.21-.75-4.84c-.5-1.63-1.36-3.28-2.58-4.95-1.22-1.67-2.73-3.15-4.53-4.45-1.8-1.3-4.12-2.35-6.98-3.17-2.85-.81-6.02-1.22-9.51-1.22h-39.25v37.19Z"/>
            <path d="M855.36,0c5.23,0,10.32.54,15.29,1.61,4.97,1.08,9.55,2.59,13.76,4.53,4.21,1.95,8.09,4.3,11.65,7.06,3.56,2.76,6.57,5.79,9.03,9.09,2.46,3.3,4.39,6.89,5.78,10.78,1.39,3.89,2.08,7.88,2.08,11.95s-.69,8.06-2.08,11.95c-1.39,3.89-3.32,7.48-5.78,10.76-2.47,3.28-5.48,6.31-9.03,9.09-3.56,2.78-7.44,5.13-11.65,7.06-4.21,1.93-8.79,3.43-13.76,4.5-4.97,1.07-10.06,1.61-15.29,1.61-6.78,0-13.28-.88-19.48-2.64-6.21-1.76-11.83-4.25-16.87-7.48-5.08,3.22-10.72,5.72-16.93,7.48-6.21,1.76-12.7,2.64-19.48,2.64-5.19,0-10.28-.54-15.26-1.61-4.98-1.08-9.58-2.58-13.79-4.5-4.21-1.93-8.08-4.28-11.62-7.06-3.54-2.78-6.55-5.81-9.03-9.09-2.48-3.28-4.41-6.87-5.78-10.76-1.37-3.89-2.06-7.87-2.06-11.95s.69-8.06,2.06-11.95c1.37-3.89,3.3-7.49,5.78-10.78,2.48-3.3,5.49-6.33,9.03-9.09,3.54-2.76,7.41-5.11,11.62-7.06,4.21-1.95,8.8-3.46,13.79-4.53,4.98-1.07,10.07-1.61,15.26-1.61,6.78,0,13.28.88,19.48,2.64,6.21,1.76,11.85,4.25,16.93,7.48,5.04-3.22,10.66-5.72,16.87-7.48,6.21-1.76,12.7-2.64,19.48-2.64ZM782.59,9.01c-3.74,0-7.42.47-11.03,1.42-3.61.95-6.93,2.24-9.95,3.89-3.02,1.65-5.83,3.63-8.42,5.95-2.59,2.32-4.78,4.79-6.56,7.42-1.78,2.63-3.17,5.44-4.17,8.42-1,2.98-1.5,5.95-1.5,8.89s.5,5.91,1.5,8.89c1,2.98,2.39,5.8,4.17,8.45,1.78,2.65,3.96,5.12,6.56,7.42,2.59,2.3,5.4,4.27,8.42,5.92,3.02,1.65,6.34,2.96,9.95,3.92,3.61.96,7.29,1.45,11.03,1.45,4.97,0,9.73-.8,14.29-2.39,4.56-1.59,8.71-3.8,12.45-6.62-3.71-3.85-6.55-8.08-8.53-12.67-1.98-4.59-2.97-9.39-2.97-14.37s.99-9.77,2.97-14.37c1.98-4.59,4.83-8.8,8.53-12.62-3.74-2.85-7.89-5.07-12.45-6.64-4.56-1.57-9.32-2.36-14.29-2.36ZM819,28.29c-3.52,5.41-5.28,10.98-5.28,16.71s1.76,11.29,5.28,16.7c3.52-5.41,5.28-10.98,5.28-16.7s-1.76-11.29-5.28-16.71ZM828.68,72.04c3.71,2.82,7.85,5.02,12.42,6.62,4.58,1.59,9.33,2.39,14.26,2.39,3.74,0,7.43-.48,11.06-1.45,3.63-.96,6.96-2.27,9.98-3.92,3.02-1.65,5.82-3.62,8.39-5.92,2.58-2.3,4.75-4.77,6.53-7.42,1.78-2.65,3.17-5.47,4.17-8.45,1-2.98,1.5-5.95,1.5-8.89s-.5-5.91-1.5-8.89c-1-2.98-2.39-5.79-4.17-8.42-1.78-2.63-3.96-5.1-6.53-7.42-2.58-2.32-5.37-4.3-8.39-5.95-3.02-1.65-6.35-2.95-9.98-3.89-3.63-.95-7.32-1.42-11.06-1.42-4.93,0-9.68.79-14.26,2.36-4.58,1.58-8.72,3.79-12.42,6.64,3.67,3.82,6.5,8.02,8.51,12.62,2,4.6,3,9.39,3,14.37s-1,9.77-3,14.37c-2,4.6-4.84,8.82-8.51,12.67Z"/>
            <path d="M1026.08.5c.18,2.37,1.37,16.65,3.56,42.83,2.19,26.18,3.37,40.35,3.56,42.5,0,.19-.05.33-.14.44-.09.11-.23.17-.42.17h-13.34c-.33,0-.52-.17-.56-.5-.41-5.23-2.52-30.65-6.34-76.27-22.12,43.92-33.6,66.69-34.41,68.32-.07.19-.24.28-.5.28h-4.67c-.22,0-.39-.08-.5-.22-5.37-9.67-17.33-31.09-35.86-64.26-3.3,32.84-5.71,56.89-7.23,72.16-.04.33-.22.5-.56.5h-7.5c-.19,0-.32-.06-.42-.17-.09-.11-.14-.26-.14-.44,4.22-42.36,7.06-70.8,8.51-85.33.04-.33.22-.5.56-.5h15.9c.22,0,.39.09.5.28.67,1.19,3.34,5.98,8.01,14.37s9.95,17.85,15.84,28.38c5.89,10.53,9.45,16.88,10.67,19.07,20.31-40.39,30.67-61,31.07-61.82.11-.19.28-.28.5-.28h13.34c.33,0,.52.17.56.5Z"/>
          </svg>
        </div>

        <div className="velvorn-footer-inner">
          <div className="footer-col col-brand">
            <button
              className="brand brand-velvorn"
              onClick={goHome}
              aria-label="DREEM ROOM"
            >
              <Logo />
            </button>
            <p className="footer-brand-desc">
              {siteContacts.brandDesc}
            </p>
            <div className="footer-social-row">
              <a href={siteContacts.telegramUrl} target="_blank" rel="noopener noreferrer" aria-label="Telegram">
                <MessageCircle size={17} />
              </a>
              <a href={siteContacts.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a href={`mailto:${siteContacts.email}`} aria-label="Email">
                <Mail size={17} />
              </a>
            </div>
          </div>

          <div className="footer-col">
            <h3 className="footer-col-title">Bo'limlar</h3>
            <ul className="footer-links">
              <li><button onClick={goHome}>Asosiy sahifa</button></li>
              <li><button onClick={() => openCatalog()}>Katalog</button></li>
              <li><button onClick={() => {
                const el = document.getElementById("ommabop-toplamlar");
                if (el) el.scrollIntoView({ behavior: "smooth" });
                else openCatalog();
              }}>Ommabop to'plamlar</button></li>
              <li><button onClick={() => setPanel("wishlist")}>Sevimlilar</button></li>
              <li><button onClick={openCart}>Savat</button></li>
            </ul>
          </div>

          <div className="footer-col">
            <h3 className="footer-col-title">Mijozlarga yordam</h3>
            <ul className="footer-links">
              <li><button onClick={openContact}>Biz bilan bog'lanish</button></li>
              <li><button onClick={openProfile}>Mening profilim</button></li>
              <li><button onClick={openContact}>Yetkazib berish va to'lov</button></li>
              <li><button onClick={() => {
                if (productsList[0]) openProduct(productsList[0]);
                setShowSizeGuide(true);
              }}>O'lchamlar jadvali</button></li>
            </ul>
          </div>

          <div className="footer-col col-contact-info">
            <h3 className="footer-col-title">Aloqa</h3>
            <div className="footer-contact-items">
              <a href={`tel:${siteContacts.phone.replace(/[^0-9+]/g, '')}`} className="footer-contact-link">
                <Phone size={15} />
                <span>{siteContacts.phone}</span>
              </a>
              <a href={siteContacts.telegramUrl} target="_blank" rel="noopener noreferrer" className="footer-contact-link">
                <MessageCircle size={15} />
                <span>Telegram: {siteContacts.telegram}</span>
              </a>
              <div className="footer-contact-link">
                <MapPin size={15} />
                <span>{siteContacts.address}</span>
              </div>
              <p className="footer-work-hours">Ish vaqti: {siteContacts.workHours}</p>
            </div>
          </div>
        </div>

        <div className="velvorn-footer-bottom">
          <p>© {new Date().getFullYear()} DREEM ROOM — Barcha huquqlar himoyalangan.</p>
        </div>
      </footer>

      {/* Mobil telefonlar uchun pastki suzuvchi dok navigatsiya paneli (Tabbar Dock) */}
      <nav className="tabbar" aria-label="Mobil navigatsiya">
        <button
          className={view === "home" && !panel ? "tab is-active" : "tab"}
          onClick={goHome}
          aria-label="Asosiy"
        >
          <span className="tab-icon">
            <Home size={22} strokeWidth={1.8} />
          </span>
          <span className="tab-label">Asosiy</span>
        </button>

        <button
          className={view === "catalog" && !panel ? "tab is-active" : "tab"}
          onClick={() => openCatalog()}
          aria-label="Katalog"
        >
          <span className="tab-icon">
            <Grid2X2 size={22} strokeWidth={1.8} />
          </span>
          <span className="tab-label">Katalog</span>
        </button>

        <button
          className={panel === "wishlist" ? "tab is-active" : "tab"}
          onClick={() => {
            haptic(tgRef.current, "light");
            setPanel("wishlist");
          }}
          aria-label="Sevimlilar"
        >
          <span className="tab-icon">
            <Heart size={22} strokeWidth={1.8} />
            {wishlist.length > 0 && <span className="tab-badge">{wishlist.length}</span>}
          </span>
          <span className="tab-label">Sevimlilar</span>
        </button>

        <button
          className={panel === "profile" ? "tab is-active" : "tab"}
          onClick={openProfile}
          aria-label="Profil"
        >
          <span className="tab-icon">
            <UserRound size={22} strokeWidth={1.8} />
          </span>
          <span className="tab-label">Profil</span>
        </button>

        <button
          className={panel === "cart" ? "tab is-active" : "tab"}
          onClick={openCart}
          aria-label="Savat"
        >
          <span className="tab-icon">
            <ShoppingBag size={22} strokeWidth={1.8} />
            {cartCount > 0 && <span className="tab-badge">{cartCount}</span>}
          </span>
          <span className="tab-label">Savat</span>
        </button>
      </nav>

      <AnimatePresence mode="wait">
        {panel === "product" && activeProduct && (
          <Sheet
            key="product"
            title={activeProduct.name}
            onClose={() => setPanel(null)}
            wide
            hideHeader={true}
          >
            <div className="modal-product-card">
              <div className="modal-left-col">
                <ProductGallery
                  product={activeProduct}
                  onShare={() => handleShareProduct(activeProduct)}
                  haptic={(kind: "light" | "success" | "select") =>
                    haptic(tgRef.current, kind)
                  }
                />
              </div>

              <div className="modal-right-col">
                {/* 1-qator: Sarlavha va Harakatlar (Wishlist + Yopish) */}
                <div className="modal-title-row">
                  <h1 className="modal-product-title">{activeProduct.name}</h1>
                  <div className="modal-actions-group">
                    <button
                      type="button"
                      className={`modal-action-circle ${wishlist.includes(activeProduct.id) ? "is-liked" : ""}`}
                      onClick={() => toggleWishlist(activeProduct.id)}
                      aria-label="Sevimlilar"
                      title="Sevimlilar"
                    >
                      <Heart
                        size={17}
                        strokeWidth={1.8}
                        fill={wishlist.includes(activeProduct.id) ? "#ef4444" : "none"}
                        color={wishlist.includes(activeProduct.id) ? "#ef4444" : "#18181b"}
                      />
                    </button>
                    <button
                      type="button"
                      className="modal-action-circle modal-close-action"
                      onClick={() => setPanel(null)}
                      aria-label="Yopish"
                      title="Yopish"
                    >
                      <X size={17} strokeWidth={2} />
                    </button>
                  </div>
                </div>

                {/* Subtitle */}
                <p className="modal-subtitle">
                  {activeProduct.category || "To'plam"} · {activeProduct.color || "Asosiy"}
                </p>

                {/* O'lcham tanlash */}
                {(() => {
                  const productSizes =
                    activeProduct.sizes &&
                    activeProduct.sizes.length > 0 &&
                    !(activeProduct.sizes.length === 1 && activeProduct.sizes[0] === "Standart")
                      ? activeProduct.sizes
                      : ["XS", "S", "M", "L", "XL"];

                  return (
                    <div className="modal-size-section">
                      <div className="modal-size-header">
                        <span className="modal-size-label">
                          O'lcham: <strong>{selectedSize || productSizes[0]}</strong>
                        </span>
                        <button
                          type="button"
                          className="modal-size-guide-link"
                          onClick={() => setShowSizeGuide(!showSizeGuide)}
                        >
                          O'lcham jadvali
                        </button>
                      </div>

                      <div className="modal-sizes-pills">
                        {productSizes.map((size) => (
                          <button
                            key={size}
                            type="button"
                            className={`modal-size-pill ${selectedSize === size ? "is-active" : ""}`}
                            onClick={() => {
                              setSelectedSize(size);
                              setSizeError(false);
                              haptic(tgRef.current, "select");
                            }}
                            aria-pressed={selectedSize === size}
                          >
                            {size}
                          </button>
                        ))}
                      </div>

                      {sizeError && (
                        <p className="modal-size-error" role="alert">
                          Iltimos, o'lchamni tanlang.
                        </p>
                      )}

                      {showSizeGuide && (
                        <div className="modal-size-guide-popup">
                          <p className="size-guide-title">
                            <strong>{selectedSize || productSizes[0]}</strong> o'lchami tavsiyasi:
                          </p>
                          <div className="size-guide-row">
                            <span>Bo'y:</span>
                            <strong>{sizeGuideData[selectedSize || productSizes[0]]?.height || "160-170 sm"}</strong>
                          </div>
                          <div className="size-guide-row">
                            <span>Vazn:</span>
                            <strong>{sizeGuideData[selectedSize || productSizes[0]]?.weight || "50-60 kg"}</strong>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Pastki harakatlar guruhi: Miqdor, Narx va Savatga qo'shish */}
                <div className="modal-bottom-actions">
                  {/* Miqdori va Jami Narx */}
                  <div className="modal-qty-price-row">
                    <div className="modal-qty-container">
                      <span className="modal-field-title">Miqdori</span>
                      <div className="modal-qty-stepper">
                        <button
                          type="button"
                          className="modal-qty-btn"
                          onClick={() => {
                            setProductQuantity((q) => Math.max(1, q - 1));
                            haptic(tgRef.current, "light");
                          }}
                          aria-label="Kamaytirish"
                        >
                          <Minus size={13} strokeWidth={2.5} />
                        </button>
                        <span className="modal-qty-num">{productQuantity}</span>
                        <button
                          type="button"
                          className="modal-qty-btn"
                          onClick={() => {
                            setProductQuantity((q) => Math.min(10, q + 1));
                            haptic(tgRef.current, "light");
                          }}
                          aria-label="Ko'paytirish"
                        >
                          <Plus size={13} strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>

                    <div className="modal-price-container">
                      <span className="modal-field-title text-right">Jami narx</span>
                      <span className="modal-price-old">
                        {money(Math.round(activeProduct.price * 1.25) * productQuantity)}
                      </span>
                      <span className="modal-price-val">
                        {money(activeProduct.price * productQuantity)}
                      </span>
                    </div>
                  </div>

                  {/* Savatga qo'shish tugmasi */}
                  <div className="modal-add-cart-wrap">
                    <button
                      type="button"
                      className="modal-add-cart-btn"
                      onClick={() => addToCartWithQuantity(productQuantity)}
                    >
                      <ShoppingBag size={18} strokeWidth={1.8} />
                      <span>SAVATGA QO'SHISH</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Sheet>
        )}

        {panel === "profile" && (
          <Sheet key="profile" title="Profil" onClose={() => setPanel(null)}>
            <div className="profile-sheet">
              <div className="profile-intro">
                <span className="profile-avatar" aria-hidden="true">
                  {profileName ? (
                    profileName.charAt(0).toUpperCase()
                  ) : (
                    <UserRound size={24} strokeWidth={1.5} />
                  )}
                </span>
                <div>
                  <h3>
                    {profile ? "Ma'lumotlaringiz" : "Profilingizni yarating"}
                  </h3>
                  <p>Buyurtma berishda ma'lumotlar avtomatik to'ldiriladi.</p>
                </div>
              </div>
              <form
                ref={profileFormRef}
                className="profile-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  saveProfile();
                }}
              >
                <label>
                  Ismingiz
                  <input
                    name="profile-name"
                    autoComplete="name"
                    value={profileName}
                    onChange={(event) => setProfileName(event.target.value)}
                    placeholder="Ism va familiya"
                    required
                    data-autofocus
                  />
                </label>
                <label>
                  Telefon raqam
                  <input
                    name="profile-phone"
                    type="tel"
                    autoComplete="tel"
                    value={profilePhone}
                    onChange={(event) => setProfilePhone(event.target.value)}
                    placeholder="+998 90 123 45 67"
                    required
                  />
                </label>
                <button className="btn btn-full" type="submit">
                  Profilni saqlash
                  <Check size={17} strokeWidth={1.8} />
                </button>
              </form>
              {profile && (
                <button
                  className="profile-clear"
                  onClick={() => {
                    setProfile(null);
                    setProfileName("");
                    setProfilePhone("");
                    setToast("Profil o'chirildi");
                  }}
                >
                  Saqlangan profilni o'chirish
                </button>
              )}
            </div>
          </Sheet>
        )}

        {panel === "contact" && (
          <Sheet key="contact" title="Biz bilan bog'lanish" onClose={() => setPanel(null)}>
            <div className="contact-sheet">
              <div className="contact-card">
                <h3>DREEM ROOM</h3>
                <p className="contact-desc">
                  Savollaringiz, takliflaringiz yoki buyurtma bo'yicha yordam kerak bo'lsa, biz bilan bog'laning.
                </p>
                <div className="contact-list">
                  <a href={`tel:${siteContacts.phone.replace(/[^0-9+]/g, '')}`} className="contact-item">
                    <span className="contact-icon"><Phone size={18} /></span>
                    <div>
                      <strong>Telefon</strong>
                      <span>{siteContacts.phone}</span>
                    </div>
                  </a>
                  <a href={siteContacts.telegramUrl} target="_blank" rel="noreferrer" className="contact-item">
                    <span className="contact-icon"><MessageCircle size={18} /></span>
                    <div>
                      <strong>Telegram (Qo'llab-quvvatlash)</strong>
                      <span>{siteContacts.telegram}</span>
                    </div>
                  </a>
                  <a href={`mailto:${siteContacts.email}`} className="contact-item">
                    <span className="contact-icon"><Mail size={18} /></span>
                    <div>
                      <strong>Elektron pochta</strong>
                      <span>{siteContacts.email}</span>
                    </div>
                  </a>
                  <div className="contact-item">
                    <span className="contact-icon"><MapPin size={18} /></span>
                    <div>
                      <strong>Manzil</strong>
                      <span>{siteContacts.address}</span>
                    </div>
                  </div>
                </div>
                <div className="contact-actions">
                  <a href={`tel:${siteContacts.phone.replace(/[^0-9+]/g, '')}`} className="btn btn-full">
                    Qo'ng'iroq qilish
                    <Phone size={16} />
                  </a>
                </div>
              </div>
            </div>
          </Sheet>
        )}

        {panel === "wishlist" && (
          <Sheet
            key="wishlist"
            title={`Sevimlilar (${wishlist.length})`}
            onClose={() => setPanel(null)}
          >
            {wishlist.length ? (
              <div className="wishlist-sheet">
                <div className="wishlist-list">
                  {wishlist.map((id) => {
                    const product = productsList.find((p) => p.id === id);
                    if (!product) return null;
                    return (
                      <div className="wishlist-item" key={product.id}>
                        <img
                          src={product.images?.[0]?.src || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='800' fill='%232b2836'><rect width='600' height='800' fill='%232b2836'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23716d82' font-family='sans-serif' font-size='22'>DREEM ROOM</text></svg>"}
                          alt={product.name}
                          onClick={() => openProduct(product)}
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (!target.src.startsWith("data:image/svg+xml")) {
                              target.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='800' fill='%232b2836'><rect width='600' height='800' fill='%232b2836'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23716d82' font-family='sans-serif' font-size='22'>DREEM ROOM</text></svg>";
                            }
                          }}
                        />
                        <div className="wishlist-info">
                          <strong onClick={() => openProduct(product)}>
                            {product.name}
                          </strong>
                          <span>
                            {product.category} · {product.color}
                          </span>
                          <b>{money(product.price)}</b>
                        </div>
                        <div className="wishlist-actions">
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => openProduct(product)}
                          >
                            Ko'rish
                          </button>
                          <button
                            type="button"
                            className="cart-remove"
                            aria-label={`${product.name} ni sevimlilardan o'chirish`}
                            onClick={() => toggleWishlist(product.id)}
                          >
                            <Trash2 size={16} strokeWidth={1.5} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="empty">
                <p>Hozircha sevimlilar ro'yxatingiz bo'sh.</p>
                <button className="btn" onClick={() => openCatalog()}>
                  Katalogga o'tish
                  <ArrowRight size={15} />
                </button>
              </div>
            )}
          </Sheet>
        )}

        {panel === "cart" && (
          <Sheet
            key="cart"
            title={ordered ? "Buyurtma qabul qilindi" : `Savat (${cartCount})`}
            onClose={() => setPanel(null)}
          >
            {ordered ? (
              <div className="done">
                <span className="done-icon">
                  <Check size={26} strokeWidth={1.7} />
                </span>
                <h3>Rahmat!</h3>
                <p>
                  Buyurtmangiz qabul qilindi. Tez orada siz bilan bog'lanamiz.
                </p>
                <button className="btn btn-full" onClick={() => openCatalog()}>
                  Xaridni davom ettirish
                  <ArrowRight size={16} />
                </button>
              </div>
            ) : cart.length ? (
              <>
                <div className="cart-list">
                  {cart.map((item) => {
                    const product = productsList.find((p) => p.id === item.id);
                    if (!product) return null;
                    return (
                      <div className="cart-row" key={`${item.id}-${item.size}`}>
                        <img
                          src={product.images?.[0]?.src || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='800' fill='%232b2836'><rect width='600' height='800' fill='%232b2836'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23716d82' font-family='sans-serif' font-size='22'>DREEM ROOM</text></svg>"}
                          alt={product.name}
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (!target.src.startsWith("data:image/svg+xml")) {
                              target.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='800' fill='%232b2836'><rect width='600' height='800' fill='%232b2836'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23716d82' font-family='sans-serif' font-size='22'>DREEM ROOM</text></svg>";
                            }
                          }}
                        />
                        <div className="cart-info">
                          <strong>{product.name}</strong>
                          <span>O'lcham {item.size}</span>
                          <b>{money(product.price)}</b>
                          <div className="qty">
                            <button
                              aria-label={`${product.name} sonini kamaytirish`}
                              onClick={() =>
                                changeQuantity(item.id, item.size, -1)
                              }
                            >
                              <Minus size={13} />
                            </button>
                            <span>{item.quantity}</span>
                            <button
                              aria-label={`${product.name} sonini oshirish`}
                              disabled={item.quantity >= 10}
                              onClick={() =>
                                changeQuantity(item.id, item.size, 1)
                              }
                            >
                              <Plus size={13} />
                            </button>
                          </div>
                        </div>
                        <button
                          className="cart-remove"
                          aria-label={`${product.name} ni savatdan olib tashlash`}
                          onClick={() =>
                            setCart((current) =>
                              current.filter(
                                (row) =>
                                  !(
                                    row.id === item.id && row.size === item.size
                                  ),
                              ),
                            )
                          }
                        >
                          <Trash2 size={15} strokeWidth={1.5} />
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div className="cart-total">
                  <span>Jami</span>
                  <strong>{money(total)}</strong>
                </div>
                <form
                  ref={orderFormRef}
                  className="order-form"
                  onSubmit={placeOrder}
                >
                  <label>
                    Ism va familiya
                    <input
                      name="name"
                      autoComplete="name"
                      defaultValue={profile?.name ?? ""}
                      placeholder="Ismingizni kiriting"
                      required
                    />
                  </label>
                  <label>
                    Telefon raqam
                    <input
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      placeholder="+998 90 123 45 67"
                      defaultValue={profile?.phone ?? ""}
                      required
                    />
                  </label>
                  <label>
                    Yetkazib berish manzili
                    <input
                      name="address"
                      autoComplete="street-address"
                      placeholder="Shahar, tuman, ko'cha, xonadon raqami"
                      required
                    />
                  </label>
                  <label>
                    To'lov turi
                    <select
                      name="paymentMethod"
                      defaultValue="Naqd pul / Karta (kuryerga)"
                    >
                      <option value="Naqd pul / Karta (kuryerga)">Naqd pul / Karta (kuryerga)</option>
                      <option value="Payme / Click (oldindan to'lov)">Payme / Click (oldindan to'lov)</option>
                    </select>
                  </label>
                  <div className="cart-delivery-hint">
                    <span>🚚 Yetkazib berish:</span>
                    <strong>Bepul (O'zbekiston bo'ylab 1-3 kun)</strong>
                  </div>
                  <button className="btn btn-full" type="submit">
                    Buyurtmani tasdiqlash • {money(total)}
                    <ArrowRight size={16} />
                  </button>
                </form>
              </>
            ) : (
              <div className="empty">
                <p>Savatingiz hozircha bo'sh.</p>
                <button className="btn" onClick={() => openCatalog()}>
                  Katalogni ochish
                  <ArrowRight size={15} />
                </button>
              </div>
            )}
          </Sheet>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            className="toast"
            role="status"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <Check size={16} strokeWidth={2} />
            <span>{toast}</span>
            <button onClick={() => setToast("")} aria-label="Xabarni yopish">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
