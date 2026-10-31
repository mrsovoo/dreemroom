import React, { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { Check, X } from "lucide-react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import BottomNav from "./components/BottomNav";
import HomeView from "./pages/HomeView";
import CatalogView from "./pages/CatalogView";
import ProductView from "./pages/ProductView";
import CartView from "./pages/CartView";
import ProfileView from "./pages/ProfileView";
import ContactModal from "./components/modals/ContactModal";
import SizeGuideModal from "./components/modals/SizeGuideModal";
import WishlistModal from "./components/modals/WishlistModal";
import ProfileModal from "./components/modals/ProfileModal";
import CartModal from "./components/modals/CartModal";
import ProductModal from "./components/modals/ProductModal";
import { useWishlist } from "./hooks/useWishlist";
import { useCart } from "./hooks/useCart";
import { useProfile } from "./hooks/useProfile";
import { formatUzbekPhone } from "./utils/phone";
import { getTelegramWebApp, haptic, type TgWebApp } from "./telegram";
import { allCategory, money, products, sizes, type Product } from "./data";
import { getLocalDemoProducts } from "./demoData";
import { getBrandConfig } from "./config/brandConfig";
import type { Panel, View, HeroSlide, SiteContacts, Profile } from "./types/store";

export default function App() {
  const brandConfig = getBrandConfig();

  const defaultHeroSlides: HeroSlide[] = useMemo(() => [
    {
      id: "banner-1",
      src: brandConfig.hero?.banner || "/brand/banner.jpg",
      alt: `${brandConfig.brandName} • Yangi to'plam`,
      title: brandConfig.hero?.title || "Har Kunlik Nafislik\nVa Go'zallik",
      subtitle: brandConfig.hero?.subtitle || "Zamonaviy bichim va yuqori sifatli matolar.",
      eyebrow: brandConfig.hero?.eyebrow || `${brandConfig.brandName} • TO'PLAM`,
      buttonText: brandConfig.hero?.buttonText || "TO'PLAMNI KO'RISH",
    },
    {
      id: "banner-2",
      src: "/image-landing/banner-2.jpg?v=2",
      alt: `${brandConfig.brandName} • Eksklyuziv to'plam`,
      title: "Eksklyuziv Mavsumiy\nTo'plam",
      subtitle: "Har bir detalda nozik did va qulaylik uyg'unligi.",
      eyebrow: `${brandConfig.brandName} • TO'PLAM`,
      buttonText: "TO'PLAMNI KO'RISH",
    },
  ], [brandConfig]);

  const defaultSiteContacts: SiteContacts = useMemo(() => ({
    phone: brandConfig.contacts?.phone || "+998 90 123 45 67",
    telegram: brandConfig.contacts?.telegram || "@brand",
    telegramUrl: brandConfig.contacts?.telegramUrl || "https://t.me",
    instagram: brandConfig.contacts?.instagram || "@brand",
    instagramUrl: brandConfig.contacts?.instagramUrl || "https://instagram.com",
    address: brandConfig.contacts?.address || "Toshkent shahri, O'zbekiston",
    workHours: brandConfig.contacts?.workHours || "Har kuni 09:00 — 21:00",
    email: brandConfig.contacts?.email || "info@brand.uz",
    brandDesc: brandConfig.footer?.description || brandConfig.tagline,
  }), [brandConfig]);

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
    if (import.meta.env.DEV) {
      return getLocalDemoProducts();
    }
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

  const [activeProduct, setActiveProduct] = useState<Product | null>(() => {
    if (products[0]) return products[0];
    if (import.meta.env.DEV) {
      const devProds = getLocalDemoProducts();
      return devProds[0] || null;
    }
    return null;
  });

  const [selectedSize, setSelectedSize] = useState("");
  const [sizeError, setSizeError] = useState(false);
  const [productQuantity, setProductQuantity] = useState(1);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [ordered, setOrdered] = useState(false);
  const [toast, setToast] = useState("");
  const [slide, setSlide] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"default" | "popular" | "price-asc" | "price-desc">("default");
  const [profileName, setProfileName] = useState(() => profile?.name || "");
  const [profilePhone, setProfilePhone] = useState(() => {
    if (profile?.phone) return formatUzbekPhone(profile.phone);
    return "+998 ";
  });
  const [orderName, setOrderName] = useState(() => profile?.name || "");
  const [orderPhone, setOrderPhone] = useState(() => {
    if (profile?.phone) return formatUzbekPhone(profile.phone);
    return "+998 ";
  });
  const [notifications, setNotifications] = useState<string[]>([]);
  const [returnView, setReturnView] = useState<View>("home");
  const [productImgIndex, setProductImgIndex] = useState(0);

  const productTouchStartXRef = useRef<number | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const isHeroSwipingRef = useRef(false);
  const tgRef = useRef<TgWebApp | null>(null);
  const orderFormRef = useRef<HTMLFormElement>(null);

  const actionsRef = useRef({
    addToCart: () => {},
    openCatalog: () => {},
    submitOrder: () => {},
    saveProfile: () => {},
  });

  useEffect(() => {
    if (profile?.name) {
      setProfileName(profile.name);
      setOrderName(profile.name);
    }
    if (profile?.phone) {
      const formatted = formatUzbekPhone(profile.phone);
      setProfilePhone(formatted);
      setOrderPhone(formatted);
    }
  }, [profile]);

  // Sync products from backend
  useEffect(() => {
    let active = true;
    async function syncProducts() {
      try {
        const res = await fetch("/api/products");
        if (res.ok && active) {
          const data: Product[] = await res.json();
          if (Array.isArray(data)) {
            if (data.length > 0) {
              setProductsList(data);
              try {
                localStorage.setItem("dreemroom_cached_prods", JSON.stringify(data));
              } catch {}
            } else if (import.meta.env.DEV) {
              setProductsList((curr) => (curr.length > 0 ? curr : getLocalDemoProducts()));
            } else {
              setProductsList([]);
            }
          }
        } else if (import.meta.env.DEV && active) {
          setProductsList((curr) => (curr.length > 0 ? curr : getLocalDemoProducts()));
        }
      } catch {
        if (import.meta.env.DEV && active) {
          setProductsList((curr) => (curr.length > 0 ? curr : getLocalDemoProducts()));
        }
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

  // Sync banners
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
      } catch {}
    }

    syncBanners();
    const interval = setInterval(syncBanners, 20000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // Sync contacts
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

  // Active product & Telegram startapp routing
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

    try {
      let startParam = "";
      const tg = getTelegramWebApp();
      if (tg?.initDataUnsafe && (tg.initDataUnsafe as any).start_param) {
        startParam = String((tg.initDataUnsafe as any).start_param).trim();
      }
      if (!startParam && typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        startParam = urlParams.get("tgWebAppStartParam") || urlParams.get("startapp") || "";
      }

      if (startParam && startParam.startsWith("product_")) {
        const targetId = startParam.replace(/^product_/, "").trim();
        const found = productsList.find(
          (p) => String(p.id) === targetId || String(p.id).toLowerCase() === targetId.toLowerCase(),
        );
        if (found) {
          openProduct(found);
        }
      }
    } catch {}
  }, [productsList]);

  // Telegram Mini App expand & background
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
    } catch {}

    return () => {
      document.body.classList.remove("in-telegram");
      try {
        tg.offEvent?.("viewportChanged", syncHeight);
      } catch {}
    };
  }, []);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce(
    (sum, item) =>
      sum +
      (productsList.find((p) => p.id === item.id)?.price || 0) * item.quantity,
    0,
  );

  const dynamicCategories = useMemo(() => {
    const catMap = new Map<string, string>();
    const counts: Record<string, number> = {};
    for (const p of productsList) {
      const rawCat = (p.category || "").trim();
      if (rawCat) {
        const key = rawCat.toLowerCase();
        if (!catMap.has(key)) {
          catMap.set(key, rawCat.charAt(0).toUpperCase() + rawCat.slice(1));
        }
        counts[key] = (counts[key] || 0) + 1;
      }
    }
    const sorted = Array.from(catMap.entries())
      .sort((a, b) => (counts[b[0]] || 0) - (counts[a[0]] || 0))
      .map(([, formatted]) => formatted);

    return [allCategory, ...sorted];
  }, [productsList]);

  const randomizedProductsList = useMemo(() => {
    if (!productsList || productsList.length === 0) return [];
    const list = [...productsList];
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
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

  const catalogProducts = useMemo(() => {
    if (category === allCategory) {
      return filterAndSort(randomizedProductsList);
    }
    const targetCat = category.toLowerCase().trim();
    const filtered = productsList.filter((p) => {
      const pCat = (p.category || "").toLowerCase().trim();
      return pCat === targetCat;
    });
    return filterAndSort(filtered);
  }, [category, productsList, randomizedProductsList, searchQuery, sortBy]);

  const popularTopProducts = useMemo(() => {
    if (!productsList || productsList.length === 0) return [];
    const sorted = [...productsList].sort((a, b) => {
      const aScore = (a.salesCount || 0) * 20 + (a.ordersCount || 0) * 10 + (a.isPopular ? 100 : 0) + (a.isNew ? 5 : 0);
      const bScore = (b.salesCount || 0) * 20 + (b.ordersCount || 0) * 10 + (b.isPopular ? 100 : 0) + (b.isNew ? 5 : 0);
      return bScore - aScore;
    });

    const top3 = sorted.slice(0, 3);
    for (let i = 0; i < productsList.length && top3.length < 3; i++) {
      if (!top3.some((p) => p.id === productsList[i].id)) {
        top3.push(productsList[i]);
      }
    }
    return top3;
  }, [productsList]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Preload banner images
  useEffect(() => {
    heroSlidesList.forEach((item) => {
      const img = new Image();
      img.src = item.src;
    });
  }, [heroSlidesList]);

  function handleHeroTouchStart(e: React.TouchEvent) {
    touchStartXRef.current = e.touches[0].clientX;
    isHeroSwipingRef.current = false;
  }

  function handleHeroTouchEnd(e: React.TouchEvent) {
    if (touchStartXRef.current === null) return;
    const diff = touchStartXRef.current - e.changedTouches[0].clientX;
    const len = heroSlidesList.length || 1;
    if (Math.abs(diff) > 40) {
      isHeroSwipingRef.current = true;
      if (diff > 0) {
        setSlide((curr) => (curr + 1) % len);
      } else {
        setSlide((curr) => (curr - 1 + len) % len);
      }
    }
    touchStartXRef.current = null;
  }

  function handleMobileHeroClick() {
    if (typeof window !== "undefined" && window.innerWidth <= 768) {
      if (isHeroSwipingRef.current) {
        isHeroSwipingRef.current = false;
        return;
      }
      haptic(tgRef.current, "light");
      openCatalog();
    }
  }

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
    setProductImgIndex(0);
    setShowSizeGuide(false);
    setReturnView(view === "product" ? "home" : view);
    setView("product");
    setPanel(null);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function handleProductTouchStart(e: React.TouchEvent) {
    productTouchStartXRef.current = e.touches[0].clientX;
  }

  function handleProductTouchEnd(e: React.TouchEvent, totalImagesCount?: number) {
    if (productTouchStartXRef.current === null || !activeProduct) return;
    const diff = productTouchStartXRef.current - e.changedTouches[0].clientX;
    const len = totalImagesCount ?? (activeProduct.images && activeProduct.images.length > 0 ? activeProduct.images.length : 3);
    if (len > 1 && Math.abs(diff) > 35) {
      if (diff > 0) {
        setProductImgIndex((curr) => (curr + 1) % len);
      } else {
        setProductImgIndex((curr) => (curr - 1 + len) % len);
      }
      haptic(tgRef.current, "light");
    }
    productTouchStartXRef.current = null;
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
          text: `${product.name} — ${brandConfig.brandName}`,
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
    const customerName = profile?.name || orderName || (form?.elements.namedItem("name") as HTMLInputElement)?.value;
    const customerPhone = profile?.phone || orderPhone || (form?.elements.namedItem("phone") as HTMLInputElement)?.value;
    const paymentMethod = (form?.elements.namedItem("paymentMethod") as HTMLSelectElement)?.value || "Naqd pul / Karta";

    if (!customerName || customerName.trim() === "" || !customerPhone || customerPhone.replace(/\D/g, "").length < 12) {
      setToast("Iltimos, avval ro'yxatdan o'ting");
      goProfile();
      return;
    }

    const orderPayload = {
      id: "ORD-" + Math.floor(100000 + Math.random() * 900000),
      createdAt: new Date().toISOString(),
      customer: {
        name: customerName.trim(),
        phone: customerPhone.trim(),
        address: "Do'kondan olib ketish",
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

    if (customerName && customerPhone) {
      setProfile({ name: customerName.trim(), phone: customerPhone.trim() });
    }

    setCart([]);
    setOrdered(true);
    setNotifications((prev) => [...prev, "Buyurtmangiz muvaffaqiyatli qabul qilindi!"]);
    haptic(tgRef.current, "success");
  }

  function placeOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitOrder();
  }

  function goCart() {
    setPanel(null);
    setOrdered(false);
    setView("cart");
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function goProfile() {
    setPanel(null);
    const telegramUser = tgRef.current?.initDataUnsafe?.user;
    const telegramName = [telegramUser?.first_name, telegramUser?.last_name]
      .filter(Boolean)
      .join(" ");
    setProfileName(profile?.name || telegramName || "");
    setProfilePhone(profile?.phone ? formatUzbekPhone(profile.phone) : "+998 ");
    setView("profile");
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function openProfile() {
    const telegramUser = tgRef.current?.initDataUnsafe?.user;
    const telegramName = [telegramUser?.first_name, telegramUser?.last_name]
      .filter(Boolean)
      .join(" ");
    setProfileName(profile?.name || telegramName || "");
    setProfilePhone(profile?.phone ? formatUzbekPhone(profile.phone) : "+998 ");
    if (typeof window !== "undefined" && window.innerWidth <= 768) {
      goProfile();
    } else {
      setPanel("profile");
    }
  }

  function saveProfile() {
    const name = profileName.trim();
    const phone = profilePhone.trim();
    if (!name) {
      setToast("Iltimos, ismingizni kiriting");
      return;
    }
    if (phone.replace(/\D/g, "").length < 12) {
      setToast("Iltimos, telefon raqamingizni to'liq kiriting (+998 00 000 0000)");
      return;
    }
    setProfile({ name, phone });
    setPanel(null);
    setToast(profile ? "O'zgarishlar saqlandi" : "Muvaffaqiyatli ro'yxatdan o'tdingiz");
    haptic(tgRef.current, "success");
  }

  actionsRef.current = { addToCart, openCatalog, submitOrder, saveProfile };

  // Telegram BackButton
  useEffect(() => {
    const button = tgRef.current?.BackButton;
    if (!button) return;
    const shouldShow = panel !== null || view !== "home";
    const handler = () => {
      if (panel) setPanel(null);
      else if (view === "product") setView(returnView || "home");
      else goHome();
    };
    try {
      if (shouldShow) {
        button.show();
        button.onClick(handler);
      } else {
        button.hide();
      }
    } catch {}
    return () => {
      try {
        button.offClick(handler);
      } catch {}
    };
  });

  // Telegram MainButton
  useEffect(() => {
    const button = tgRef.current?.MainButton;
    if (!button) return;

    let text = "";
    let onClick: (() => void) | null = null;
    if (panel === "product" || view === "product") {
      text = "Savatga qo'shish";
      onClick = () => actionsRef.current.addToCart();
    } else if ((panel === "cart" || view === "cart") && ordered) {
      text = "Xaridni davom ettirish";
      onClick = () => actionsRef.current.openCatalog();
    } else if ((panel === "cart" || view === "cart") && cart.length > 0) {
      text = `Buyurtma berish • ${money(total)}`;
      onClick = () => {
        const form = orderFormRef.current;
        if (form && !form.reportValidity()) return;
        actionsRef.current.submitOrder();
      };
    }

    if (!onClick) {
      try {
        button.hide();
      } catch {}
      document.documentElement.classList.remove("tg-mainbutton-on");
      return;
    }

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
    } catch {}
    return () => {
      try {
        button.offClick(handler);
        button.hide();
      } catch {}
      document.documentElement.classList.remove("tg-mainbutton-on");
    };
  });

  function openCart() {
    setOrdered(false);
    if (typeof window !== "undefined" && window.innerWidth <= 768) {
      goCart();
    } else {
      setPanel("cart");
    }
  }

  function openContact() {
    setPanel("contact");
  }

  function openWishlist() {
    setPanel("wishlist");
  }

  function openSizeGuide() {
    setPanel("size-guide");
  }

  return (
    <MotionConfig reducedMotion="user">
      <a className="skip-link" href="#main">
        Tarkibga o'tish
      </a>

      {/* HEADER */}
      <Header
        view={view}
        panel={panel}
        profile={profile}
        wishlistCount={wishlist.length}
        cartCount={cartCount}
        hasNotifications={notifications.length > 0}
        goHome={goHome}
        openCatalog={() => openCatalog()}
        openContact={openContact}
        openProfile={openProfile}
        openWishlist={openWishlist}
        openCart={openCart}
        onNotificationsClick={() => {
          if (notifications.length > 0) {
            setToast(notifications[notifications.length - 1]);
            setNotifications((prev) => prev.slice(0, -1));
          } else {
            setToast("Yangi bildirishnomalar yo'q");
          }
        }}
      />

      {/* MAIN VIEW */}
      <main id="main">
        {view === "home" && (
          <HomeView
            heroSlidesList={heroSlidesList}
            slide={slide}
            setSlide={setSlide}
            handleHeroTouchStart={handleHeroTouchStart}
            handleHeroTouchEnd={handleHeroTouchEnd}
            handleMobileHeroClick={handleMobileHeroClick}
            openCatalog={() => openCatalog()}
            openProduct={openProduct}
            productsList={productsList}
            isLoadingProducts={isLoadingProducts}
            popularTopProducts={popularTopProducts}
            wishlist={wishlist}
            toggleWishlist={toggleWishlist}
          />
        )}

        {view === "catalog" && (
          <CatalogView
            category={category}
            setCategory={setCategory}
            dynamicCategories={dynamicCategories}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            sortBy={sortBy}
            setSortBy={setSortBy}
            catalogProducts={catalogProducts}
            openProduct={openProduct}
            wishlist={wishlist}
            toggleWishlist={toggleWishlist}
          />
        )}

        {view === "product" && activeProduct && (
          <ProductView
            product={activeProduct}
            productImgIndex={productImgIndex}
            setProductImgIndex={setProductImgIndex}
            handleProductTouchStart={handleProductTouchStart}
            handleProductTouchEnd={handleProductTouchEnd}
            selectedSize={selectedSize}
            setSelectedSize={setSelectedSize}
            productQuantity={productQuantity}
            setProductQuantity={setProductQuantity}
            sizeError={sizeError}
            setSizeError={setSizeError}
            wishlist={wishlist}
            toggleWishlist={toggleWishlist}
            cartCount={cartCount}
            onBack={() => setView(returnView || "home")}
            goCart={goCart}
            onAddToCart={addToCart}
            haptic={(kind) => haptic(tgRef.current, kind)}
          />
        )}

        {view === "cart" && (
          <CartView
            cart={cart}
            setCart={setCart}
            cartCount={cartCount}
            total={total}
            ordered={ordered}
            profile={profile}
            productsList={productsList}
            openProduct={openProduct}
            openCatalog={() => openCatalog()}
            goProfile={goProfile}
            changeQuantity={changeQuantity}
            placeOrder={placeOrder}
            orderFormRef={orderFormRef}
            setToast={setToast}
            haptic={(kind) => haptic(tgRef.current, kind)}
          />
        )}

        {view === "profile" && (
          <ProfileView
            profile={profile}
            profileName={profileName}
            setProfileName={setProfileName}
            profilePhone={profilePhone}
            setProfilePhone={setProfilePhone}
            onSaveProfile={saveProfile}
            onClearProfile={() => {
              setProfile(null);
              setProfileName("");
              setProfilePhone("+998 ");
              setToast("Profil tozalandi");
            }}
            goCart={goCart}
            openContact={openContact}
            openSizeGuide={openSizeGuide}
            cartCount={cartCount}
          />
        )}
      </main>

      {/* FOOTER */}
      <Footer
        siteContacts={siteContacts}
        goHome={goHome}
        openCatalog={() => openCatalog()}
        openCart={openCart}
        openContact={openContact}
        openProfile={openProfile}
        openWishlist={openWishlist}
        openSizeGuide={openSizeGuide}
      />

      {/* BOTTOM NAVIGATION FOR MOBILE */}
      <BottomNav
        view={view}
        panel={panel}
        cartCount={cartCount}
        profile={profile}
        goHome={goHome}
        openCatalog={() => openCatalog()}
        goCart={goCart}
        goProfile={goProfile}
      />

      {/* MODALS & SHEETS */}
      <AnimatePresence>
        <ContactModal
          isOpen={panel === "contact"}
          onClose={() => setPanel(null)}
          siteContacts={siteContacts}
        />

        <SizeGuideModal
          isOpen={panel === "size-guide" || showSizeGuide}
          onClose={() => {
            setPanel(null);
            setShowSizeGuide(false);
          }}
        />

        <WishlistModal
          isOpen={panel === "wishlist"}
          onClose={() => setPanel(null)}
          wishlist={wishlist}
          productsList={productsList}
          openProduct={openProduct}
          toggleWishlist={toggleWishlist}
          openCatalog={() => openCatalog()}
        />

        <ProfileModal
          isOpen={panel === "profile"}
          onClose={() => setPanel(null)}
          profile={profile}
          onSaveProfile={(updated) => {
            setProfile(updated);
            setPanel(null);
            setToast("Profil saqlandi");
          }}
          onClearProfile={() => {
            setProfile(null);
            setPanel(null);
            setToast("Profil tozalandi");
          }}
        />

        <CartModal
          isOpen={panel === "cart"}
          onClose={() => setPanel(null)}
          ordered={ordered}
          cart={cart}
          setCart={setCart}
          cartCount={cartCount}
          total={total}
          profile={profile}
          productsList={productsList}
          openProduct={openProduct}
          openCatalog={() => openCatalog()}
          goProfile={goProfile}
          changeQuantity={changeQuantity}
          placeOrder={placeOrder}
          orderFormRef={orderFormRef}
        />
      </AnimatePresence>

      {/* TOAST NOTIFICATION */}
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
            <button
              type="button"
              onClick={() => setToast("")}
              aria-label="Xabarni yopish"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
