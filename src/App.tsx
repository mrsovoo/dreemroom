import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import {
  ArrowRight,
  ArrowUpRight,
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

/** Hero fonidagi avtomatik almashadigan suratlar (public/image-landing/ ichida). */
const heroSlides = [
  { src: "/image-landing/banner-1.jpg", mirrored: false },
  { src: "/image-landing/banner-2.jpg", mirrored: false },
  { src: "/image-landing/banner-3.jpg", mirrored: false },
  { src: "/image-landing/banner-4.jpg", mirrored: false },
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
  const [productsList, setProductsList] = useState<Product[]>(products);
  const [activeProduct, setActiveProduct] = useState<Product | null>(products[0] || null);
  const [selectedSize, setSelectedSize] = useState("");
  const [sizeError, setSizeError] = useState(false);
  const [ordered, setOrdered] = useState(false);
  const [toast, setToast] = useState("");
  const [slide, setSlide] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"default" | "price-asc" | "price-desc">("default");
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

  // Admin panel (localhost:3000) bilan mahsulotlarni real-vaqtda sinxronlash
  useEffect(() => {
    let active = true;
    async function syncProducts() {
      try {
        let res = await fetch("/api/products").catch(() => null);
        if (!res || !res.ok) {
          res = await fetch("http://localhost:3000/api/products").catch(() => null);
        }
        if (res && res.ok && active) {
          const data: Product[] = await res.json();
          if (Array.isArray(data)) {
            setProductsList(data);
          }
        }
      } catch {
        /* Server vaqtincha uzilgan bo'lsa lokal mahsulotlar ishlaydi. */
      }
    }

    syncProducts();
    const interval = setInterval(syncProducts, 3000);
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
    if (sortBy === "price-asc") {
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

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Barcha hero banner suratlarini xotiraga oldindan yuklab qo'yish (kechikish va qotish bo'lmasligi uchun)
  useEffect(() => {
    heroSlides.forEach((item) => {
      const img = new Image();
      img.src = item.src;
    });
  }, []);

  const touchStartXRef = useRef<number | null>(null);

  function handleHeroTouchStart(e: React.TouchEvent) {
    touchStartXRef.current = e.touches[0].clientX;
  }

  function handleHeroTouchEnd(e: React.TouchEvent) {
    if (touchStartXRef.current === null) return;
    const diff = touchStartXRef.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        setSlide((curr) => (curr + 1) % heroSlides.length);
      } else {
        setSlide((curr) => (curr - 1 + heroSlides.length) % heroSlides.length);
      }
    }
    touchStartXRef.current = null;
  }

  // Hero fonidagi suratlar bosh sahifada avtomatik almashib turadi.
  useEffect(() => {
    if (view !== "home") return;
    const timer = setInterval(
      () => setSlide((current) => (current + 1) % heroSlides.length),
      4500,
    );
    return () => clearInterval(timer);
  }, [view, slide]);

  function goHome() {
    setView("home");
    setSearchQuery("");
    setPanel(null);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function openCatalog(nextCategory = allCategory) {
    setCategory(nextCategory);
    setView("catalog");
    setSearchQuery("");
    setPanel(null);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function openProduct(product: Product) {
    setActiveProduct(product);
    const prodSizes = product.sizes && product.sizes.length > 0 ? product.sizes : sizes;
    setSelectedSize(prodSizes[0] || "XS");
    setSizeError(false);
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

  function addToCart() {
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
              ? { ...item, quantity: Math.min(item.quantity + 1, 10) }
              : item,
          )
        : [
            ...current,
            { id: activeProduct.id, size: selectedSize, quantity: 1 },
          ];
    });
    setPanel(null);
    setToast(`${activeProduct.name} savatga qo'shildi`);
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

    const orderPayload = {
      id: "ORD-" + Math.floor(100000 + Math.random() * 900000),
      createdAt: new Date().toISOString(),
      customer: {
        name: customerName,
        phone: customerPhone,
        address: "Yetkazib berish (Veb / Telegram)"
      },
      items: cart.map((item) => {
        const prod = productsList.find((p) => p.id === item.id);
        return {
          id: item.id,
          name: prod?.name || item.id,
          size: item.size,
          quantity: item.quantity,
          price: prod?.price || 0,
          image: prod?.images?.[0]?.src || "/images/core-top.jpg",
        };
      }),
      total,
      status: "Yangi",
      paymentMethod: "Naqd / Karta",
    };

    fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderPayload),
    }).catch(() => null);

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

      <header className="header">
        <div className="header-zone header-brand" aria-label="Bosh sahifa">
          <button
            className="brand"
            onClick={goHome}
            aria-label="DREEM ROOM — bosh sahifa"
          >
            <Logo className="logo" />
          </button>
        </div>
        <nav className="nav" aria-label="Asosiy menyu">
          <button
            className={
              view === "home" && !panel
                ? "nav-link is-active"
                : "nav-link"
            }
            onClick={goHome}
          >
            Asosiy
          </button>
          <button
            className={
              view === "catalog" && !panel
                ? "nav-link is-active"
                : "nav-link"
            }
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
            className={`action-btn ${panel === "wishlist" ? "is-active" : ""}`}
            onClick={() => setPanel("wishlist")}
            aria-label={`Sevimlilar, ${wishlist.length} ta mahsulot`}
          >
            <Heart size={20} strokeWidth={1.6} />
            {wishlist.length > 0 && <span className="action-badge">{wishlist.length}</span>}
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
            className={`action-btn ${panel === "cart" ? "is-active" : ""}`}
            onClick={openCart}
            aria-label={`Savat, ${cartCount} ta mahsulot`}
          >
            <ShoppingBag size={20} strokeWidth={1.6} />
            {cartCount > 0 && <span className="action-badge">{cartCount}</span>}
          </button>
        </div>
      </header>

      <main id="main">
        {view === "home" ? (
          <>
            <section
              className="hero"
              onTouchStart={handleHeroTouchStart}
              onTouchEnd={handleHeroTouchEnd}
            >
              <div className="hero-slides" aria-hidden="true">
                {heroSlides.map((item, index) => (
                  <img
                    key={item.src}
                    src={item.src}
                    alt=""
                    decoding="async"
                    loading={index === 0 ? "eager" : "lazy"}
                    fetchPriority={index === 0 ? "high" : "low"}
                    className={`${index === slide ? "is-active" : ""} ${item.mirrored ? "is-mirrored" : ""}`.trim()}
                    width="1920"
                    height="1080"
                  />
                ))}
              </div>
              <div
                className="hero-dots"
                role="tablist"
                aria-label="Hero suratlari"
              >
                {heroSlides.map((item, index) => (
                  <button
                    key={item.src}
                    role="tab"
                    aria-selected={index === slide}
                    aria-label={`${index + 1}-surat`}
                    className={
                      index === slide ? "hero-dot is-active" : "hero-dot"
                    }
                    onClick={() => setSlide(index)}
                  />
                ))}
              </div>
              <div className="hero-inner">
                <motion.div
                  className="hero-card"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.65 }}
                >
                  <p className="hero-tag">Ayollar uchun</p>
                  <h1>
                    Kuch maqsad
                    <br />
                    bilan uchrashadi
                  </h1>
                  <p className="hero-text">
                    Harakat erkinligi uchun to'qilgan sport kiyimlari —
                    mashg'ulotdan kundalik hayotgacha.
                  </p>
                  <div className="hero-actions">
                    <button
                      className="btn btn-light"
                      onClick={() => openCatalog()}
                    >
                      Katalog
                      <ArrowRight size={16} />
                    </button>
                    <button
                      className="btn btn-ghost"
                      onClick={openContact}
                    >
                      Kontakt
                    </button>
                  </div>
                </motion.div>
              </div>
            </section>

            {productsList.length > 0 && (
              <section className="section" aria-labelledby="catalog-categories-title">
                <div className="section-head">
                  <div>
                    <span className="section-eyebrow">KATALOG</span>
                    <h2 id="catalog-categories-title">Katalog</h2>
                  </div>
                  <button className="link-btn" onClick={() => openCatalog()}>
                    Katalogga o'tish
                    <ArrowUpRight size={14} />
                  </button>
                </div>

                <div className="grid">
                  {productsList.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onOpen={openProduct}
                    />
                  ))}
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
                        e.target.value as "default" | "price-asc" | "price-desc",
                      )
                    }
                    aria-label="Saralash"
                  >
                    <option value="default">Standart saralash</option>
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

      <footer className="footer" id="contact">
        <div className="footer-inner">
          <button
            className="brand"
            onClick={goHome}
            aria-label="DREEM ROOM — bosh sahifa"
          >
            <Logo className="logo" />
          </button>
          <nav className="footer-nav" aria-label="Pastki menyu">
            <button onClick={goHome}>Asosiy</button>
            <button onClick={() => openCatalog()}>Katalog</button>
            <button onClick={openContact}>Kontakt</button>
            <a href="http://localhost:3000" target="_blank" rel="noopener noreferrer">Admin panel</a>
            <a href="mailto:hello@dreemroom.uz">hello@dreemroom.uz</a>
          </nav>
        </div>
        <p className="footer-bottom">© {new Date().getFullYear()} DREEM ROOM</p>
      </footer>

      <nav className="tabbar" aria-label="Mobil menyu">
        <button
          className={view === "home" && !panel ? "tab is-active" : "tab"}
          aria-current={view === "home" && !panel ? "page" : undefined}
          onClick={goHome}
        >
          <span className="tab-icon">
            <Home size={21} strokeWidth={1.7} />
          </span>
          Asosiy
        </button>
        <button
          className={view === "catalog" && !panel ? "tab is-active" : "tab"}
          aria-current={view === "catalog" && !panel ? "page" : undefined}
          onClick={() => openCatalog()}
        >
          <span className="tab-icon">
            <Grid2X2 size={20} strokeWidth={1.7} />
          </span>
          Katalog
        </button>
        <button
          className={panel === "wishlist" ? "tab is-active" : "tab"}
          aria-current={panel === "wishlist" ? "page" : undefined}
          onClick={() => setPanel("wishlist")}
        >
          <span className="tab-icon">
            <Heart size={20} strokeWidth={1.7} />
            {wishlist.length > 0 && (
              <span className="tab-badge" aria-hidden="true">
                {wishlist.length}
              </span>
            )}
          </span>
          Sevimlilar
        </button>
        <button
          className={panel === "cart" ? "tab is-active" : "tab"}
          aria-current={panel === "cart" ? "page" : undefined}
          onClick={openCart}
        >
          <span className="tab-icon">
            <ShoppingBag size={20} strokeWidth={1.7} />
            {cartCount > 0 && (
              <span className="tab-badge" aria-hidden="true">
                {cartCount}
              </span>
            )}
          </span>
          Savat
        </button>
        <button
          className={panel === "profile" ? "tab is-active" : "tab"}
          aria-current={panel === "profile" ? "page" : undefined}
          onClick={openProfile}
        >
          <span className="tab-icon">
            <UserRound size={20} strokeWidth={1.7} />
            {profile && <span className="profile-dot" aria-hidden="true" />}
          </span>
          Profil
        </button>
      </nav>

      <AnimatePresence mode="wait">
        {panel === "product" && activeProduct && (
          <Sheet
            key="product"
            title={activeProduct.name}
            onClose={() => setPanel(null)}
            wide
          >
            <div className="detail">
              <ProductGallery
                product={activeProduct}
                haptic={(kind: "light" | "success" | "select") =>
                  haptic(tgRef.current, kind)
                }
              />
              <div className="detail-body">
                <div className="detail-header-row">
                  <p className="detail-meta">
                    {activeProduct.category} · {activeProduct.color}
                  </p>
                  <button
                    type="button"
                    className={`detail-like-btn ${wishlist.includes(activeProduct.id) ? "is-liked" : ""}`}
                    onClick={() => toggleWishlist(activeProduct.id)}
                    aria-label="Sevimlilar"
                  >
                    <Heart
                      size={18}
                      strokeWidth={1.8}
                      fill={wishlist.includes(activeProduct.id) ? "var(--brand)" : "none"}
                    />
                  </button>
                </div>
                <p className="detail-price">{money(activeProduct.price)}</p>
                <p className="detail-text">{activeProduct.description}</p>
                <p className="detail-label">O'lchamni tanlang</p>
                <div className="sizes">
                  {(activeProduct.sizes && activeProduct.sizes.length > 0
                    ? activeProduct.sizes
                    : sizes
                  ).map((size) => (
                    <button
                      key={size}
                      className={
                        selectedSize === size ? "size is-active" : "size"
                      }
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
                  <p className="error" role="alert">
                    Iltimos, o'lchamni tanlang.
                  </p>
                )}

                {sizeGuideData[selectedSize || "XS"] && (
                  <div className="size-guide">
                    <p className="size-guide-title">
                      <strong>{selectedSize || "XS"}</strong> o'lchami mos keladi:
                    </p>
                    <div className="size-guide-row">
                      <span className="size-guide-label">Bo'y</span>
                      <strong className="size-guide-val">
                        {sizeGuideData[selectedSize || "XS"]?.height}
                      </strong>
                    </div>
                    <div className="size-guide-row">
                      <span className="size-guide-label">Vazn</span>
                      <strong className="size-guide-val">
                        {sizeGuideData[selectedSize || "XS"]?.weight}
                      </strong>
                    </div>
                  </div>
                )}

                <button className="btn btn-full detail-cart-btn" onClick={addToCart}>
                  <span>Savatga qo'shish</span>
                  <ShoppingBag size={18} strokeWidth={1.6} />
                </button>
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
                <h3>DREEM ROOM MAYBE</h3>
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
                  <a href="https://t.me/dreemroom_bot" target="_blank" rel="noreferrer" className="contact-item">
                    <span className="contact-icon"><MessageCircle size={18} /></span>
                    <div>
                      <strong>Telegram Bot (Buyurtma)</strong>
                      <span>@dreemroom_bot</span>
                    </div>
                  </a>
                  <a href="mailto:hello@dreemroom.uz" className="contact-item">
                    <span className="contact-icon"><Mail size={18} /></span>
                    <div>
                      <strong>Elektron pochta</strong>
                      <span>hello@dreemroom.uz</span>
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
                          src={product.images[0].src}
                          alt={product.name}
                          onClick={() => openProduct(product)}
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
                        <img src={product.images[0].src} alt={product.name} />
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
                    Ismingiz
                    <input
                      name="name"
                      autoComplete="name"
                      defaultValue={profile?.name ?? ""}
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
                  <button className="btn btn-full" type="submit">
                    Buyurtma berish
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
