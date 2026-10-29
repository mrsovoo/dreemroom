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
              Zamonaviy va premium sifatdagi kiyimlar to'plami. O'zbekiston bo'ylab tezkor va qulay yetkazib berish xizmati.
            </p>
            <div className="footer-social-row">
              <a href="https://t.me" target="_blank" rel="noopener noreferrer" aria-label="Telegram">
                <MessageCircle size={17} />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a href="mailto:info@dreemroom.uz" aria-label="Email">
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
              <a href="tel:+998901234567" className="footer-contact-link">
                <Phone size={15} />
                <span>+998 90 123 45 67</span>
              </a>
              <a href="https://t.me/dreemroom" target="_blank" rel="noopener noreferrer" className="footer-contact-link">
                <MessageCircle size={15} />
                <span>Telegram: @dreemroom</span>
              </a>
              <div className="footer-contact-link">
                <MapPin size={15} />
                <span>Toshkent shahri, O'zbekiston</span>
              </div>
              <p className="footer-work-hours">Ish vaqti: Har kuni 09:00 — 21:00</p>
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
                  <a href="tel:+998901234567" className="contact-item">
                    <span className="contact-icon"><Phone size={18} /></span>
                    <div>
                      <strong>Telefon</strong>
                      <span>+998 90 123 45 67</span>
                    </div>
                  </a>
                  <a href="https://t.me/dreemroom" target="_blank" rel="noreferrer" className="contact-item">
                    <span className="contact-icon"><MessageCircle size={18} /></span>
                    <div>
                      <strong>Telegram (Qo'llab-quvvatlash)</strong>
                      <span>@dreemroom</span>
                    </div>
                  </a>
                  <a href="mailto:info@dreemroom.uz" className="contact-item">
                    <span className="contact-icon"><Mail size={18} /></span>
                    <div>
                      <strong>Elektron pochta</strong>
                      <span>info@dreemroom.uz</span>
                    </div>
                  </a>
                  <div className="contact-item">
                    <span className="contact-icon"><MapPin size={18} /></span>
                    <div>
                      <strong>Manzil</strong>
                      <span>Toshkent shahri, O'zbekiston</span>
                    </div>
                  </div>
                </div>
                <div className="contact-actions">
                  <a href="tel:+998901234567" className="btn btn-full">
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
