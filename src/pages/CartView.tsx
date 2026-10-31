import React, { useRef } from "react";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  UserRound,
} from "lucide-react";
import type { CartItem, Profile } from "../types/store";
import type { Product } from "../data";
import { money } from "../data";
import { formatUzbekPhone } from "../utils/phone";
import { getBrandConfig, getBrandFallbackSvg } from "../config/brandConfig";

type CartViewProps = {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  cartCount: number;
  total: number;
  ordered: boolean;
  profile: Profile | null;
  productsList: Product[];
  openProduct: (product: Product) => void;
  openCatalog: () => void;
  goProfile: () => void;
  changeQuantity: (id: string, size: string, delta: number) => void;
  placeOrder: (e: React.FormEvent) => void;
  orderFormRef: React.RefObject<HTMLFormElement | null>;
  setToast: (msg: string) => void;
  haptic: (kind: "light" | "success" | "select") => void;
};

export default function CartView({
  cart,
  setCart,
  cartCount,
  total,
  ordered,
  profile,
  productsList,
  openProduct,
  openCatalog,
  goProfile,
  changeQuantity,
  placeOrder,
  orderFormRef,
  setToast,
  haptic,
}: CartViewProps) {
  const config = getBrandConfig();
  const fallbackSvg = getBrandFallbackSvg(config.brandName);

  const emptyCartSliderRef = useRef<HTMLDivElement | null>(null);
  const isSliderDraggingRef = useRef(false);
  const sliderStartXRef = useRef(0);
  const sliderScrollLeftRef = useRef(0);
  const sliderHasMovedRef = useRef(false);

  const scrollRecommendations = (dir: "left" | "right") => {
    if (!emptyCartSliderRef.current) return;
    const scrollAmount = 260;
    emptyCartSliderRef.current.scrollBy({
      left: dir === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
    haptic("light");
  };

  const handleSliderMouseDown = (e: React.MouseEvent) => {
    if (!emptyCartSliderRef.current) return;
    isSliderDraggingRef.current = true;
    sliderStartXRef.current = e.pageX - emptyCartSliderRef.current.offsetLeft;
    sliderScrollLeftRef.current = emptyCartSliderRef.current.scrollLeft;
    sliderHasMovedRef.current = false;
  };

  const handleSliderMouseLeave = () => {
    isSliderDraggingRef.current = false;
  };

  const handleSliderMouseUp = () => {
    isSliderDraggingRef.current = false;
  };

  const handleSliderMouseMove = (e: React.MouseEvent) => {
    if (!isSliderDraggingRef.current || !emptyCartSliderRef.current) return;
    e.preventDefault();
    const x = e.pageX - emptyCartSliderRef.current.offsetLeft;
    const walk = (x - sliderStartXRef.current) * 1.5;
    if (Math.abs(walk) > 5) {
      sliderHasMovedRef.current = true;
    }
    emptyCartSliderRef.current.scrollLeft = sliderScrollLeftRef.current - walk;
  };

  return (
    <div className="page-cart-container">
      <div className="page-cart-header">
        <div>
          <h1 className="page-cart-title">Savat</h1>
          <span className="page-cart-subtitle">
            {cart.length > 0 ? `${cartCount} ta mahsulot tanlandi` : "Savatingiz bo'sh"}
          </span>
        </div>
        {cart.length > 0 && !ordered && (
          <button
            type="button"
            className="page-cart-clear-btn"
            onClick={() => {
              if (confirm("Savatni tozalashni xohlaysizmi?")) {
                setCart([]);
                setToast("Savat tozalandi");
              }
            }}
          >
            Tozalash
          </button>
        )}
      </div>

      {ordered ? (
        <div className="page-cart-done-card">
          <div className="done-icon-pulse">
            <Check size={36} strokeWidth={2.2} />
          </div>
          <h2>Buyurtmangiz qabul qilindi!</h2>
          <p>
            Rahmat! Buyurtmangiz muvaffaqiyatli rasmiylashtirildi. Tez orada operatorimiz siz bilan bog'lanib, buyurtmani tasdiqlaydi.
          </p>
          <div className="done-details-box">
            <div className="done-row">
              <span>Buyurtma holati:</span>
              <strong className="status-badge">Qabul qilindi</strong>
            </div>
          </div>
          <button className="btn btn-full done-back-btn" onClick={openCatalog}>
            <span>Xaridni davom ettirish</span>
            <ArrowRight size={16} />
          </button>
        </div>
      ) : cart.length > 0 ? (
        <div className="page-cart-content">
          <div className="page-cart-items-card">
            {cart.map((item) => {
              const product = productsList.find((p) => p.id === item.id);
              if (!product) return null;
              return (
                <div
                  className="page-cart-item-row"
                  key={`${item.id}-${item.size}`}
                  onClick={() => openProduct(product)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      openProduct(product);
                    }
                  }}
                >
                  <img
                    src={product.images?.[0]?.src || fallbackSvg}
                    alt={product.name}
                    className="page-cart-item-thumb"
                  />
                  <div className="page-cart-item-meta">
                    <h3 className="page-cart-item-name">{product.name}</h3>
                    <div className="page-cart-item-tags">
                      <span className="size-badge">O'lcham: {item.size}</span>
                      {product.color && <span className="color-badge">{product.color}</span>}
                    </div>
                    <div className="page-cart-item-bottom">
                      <span className="page-cart-item-price">{money(product.price * item.quantity)}</span>
                      <div
                        className="page-cart-qty-stepper"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            haptic("light");
                            changeQuantity(item.id, item.size, -1);
                          }}
                          aria-label="Kamaytirish"
                        >
                          <Minus size={13} />
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          type="button"
                          disabled={item.quantity >= 10}
                          onClick={(e) => {
                            e.stopPropagation();
                            haptic("light");
                            changeQuantity(item.id, item.size, 1);
                          }}
                          aria-label="Ko'paytirish"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="page-cart-item-del"
                    onClick={(e) => {
                      e.stopPropagation();
                      haptic("light");
                      setCart((curr) => curr.filter((r) => !(r.id === item.id && r.size === item.size)));
                    }}
                    aria-label="Olib tashlash"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="page-cart-summary-card">
            <h3 className="summary-title">To'lov hisobi</h3>
            <div className="summary-row">
              <span>Mahsulotlar ({cartCount} ta):</span>
              <strong>{money(total)}</strong>
            </div>
            <div className="summary-divider" />
            <div className="summary-row total-row">
              <span>Jami to'lov:</span>
              <strong className="total-price">{money(total)}</strong>
            </div>
          </div>

          <div className="page-cart-checkout-card">
            <h3 className="checkout-title">Buyurtmachi profili</h3>
            {profile && profile.name ? (
              <form
                ref={orderFormRef}
                className="page-cart-form"
                onSubmit={placeOrder}
              >
                <div className="cart-profile-badge">
                  <div className="cart-profile-avatar">
                    {profile.name.trim().charAt(0).toUpperCase()}
                  </div>
                  <div className="cart-profile-details">
                    <strong className="cart-profile-name">{profile.name}</strong>
                    <span className="cart-profile-phone">{formatUzbekPhone(profile.phone)}</span>
                  </div>
                  <button
                    type="button"
                    className="cart-profile-switch-btn"
                    onClick={goProfile}
                  >
                    Profil
                  </button>
                </div>

                <label className="page-form-label">
                  <span>To'lov usuli</span>
                  <select name="paymentMethod" defaultValue="Naqd pul / Karta">
                    <option value="Naqd pul / Karta">Naqd pul / Karta</option>
                    <option value="Payme / Click (oldindan to'lov)">Payme / Click (oldindan to'lov)</option>
                  </select>
                </label>

                <button type="submit" className="page-cart-submit-btn">
                  <span>Buyurtmani tasdiqlash • {money(total)}</span>
                  <ArrowRight size={17} />
                </button>
              </form>
            ) : (
              <div className="cart-guest-box">
                <div className="cart-guest-content">
                  <div className="cart-guest-avatar">
                    <UserRound size={22} strokeWidth={1.8} />
                  </div>
                  <div className="cart-guest-text">
                    <strong>Profil kiritilmagan</strong>
                    <p>Buyurtma berish uchun avval ro'yxatdan o'ting</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-full cart-guest-btn"
                  onClick={goProfile}
                >
                  <span>Ro'yxatdan o'tish</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="page-cart-empty-card">
            <div className="empty-cart-icon-wrap">
              <ShoppingBag size={44} strokeWidth={1.4} />
            </div>
            <h2>Savatingiz bo'sh</h2>
            <p>Hozircha hech qanday mahsulot tanlanmadi. Yangi to'plamdan o'zingizga ma'qul kiyimlarni tanlang!</p>
            <button
              type="button"
              className="btn btn-full empty-shop-btn"
              onClick={openCatalog}
            >
              <span>Katalogga o'tish</span>
              <ArrowRight size={16} />
            </button>
          </div>

          {productsList.length > 0 && (
            <section className="empty-cart-recommendations">
              <div className="empty-cart-rec-header">
                <div>
                  <h3 className="empty-cart-rec-title">Sizga yoqishi mumkin</h3>
                  <p className="empty-cart-rec-subtitle">Yangi to'plamdan eng sara liboslar</p>
                </div>
                <div className="empty-cart-rec-arrows">
                  <button
                    type="button"
                    className="empty-cart-arrow-btn"
                    onClick={() => scrollRecommendations("left")}
                    aria-label="Oldingi mahsulotlar"
                  >
                    <ChevronLeft size={18} strokeWidth={2.2} />
                  </button>
                  <button
                    type="button"
                    className="empty-cart-arrow-btn"
                    onClick={() => scrollRecommendations("right")}
                    aria-label="Keyingi mahsulotlar"
                  >
                    <ChevronRight size={18} strokeWidth={2.2} />
                  </button>
                </div>
              </div>

              <div
                ref={emptyCartSliderRef}
                className="empty-cart-slider"
                onMouseDown={handleSliderMouseDown}
                onMouseLeave={handleSliderMouseLeave}
                onMouseUp={handleSliderMouseUp}
                onMouseMove={handleSliderMouseMove}
              >
                {productsList.map((product) => (
                  <div
                    key={product.id}
                    className="empty-cart-rec-card"
                    onClick={() => {
                      if (sliderHasMovedRef.current) return;
                      openProduct(product);
                    }}
                  >
                    <div className="empty-cart-card-media">
                      <img
                        src={product.images?.[0]?.src || fallbackSvg}
                        alt={product.name}
                        loading="lazy"
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (!target.src.startsWith("data:image/svg+xml")) {
                            target.src = fallbackSvg;
                          }
                        }}
                      />
                    </div>
                    <div className="empty-cart-card-info">
                      <h4 className="empty-cart-card-name" title={product.name}>{product.name}</h4>
                      <div className="empty-cart-card-bottom">
                        <span className="empty-cart-card-price">{money(product.price, product.displayPrice)}</span>
                        <button
                          type="button"
                          className="empty-cart-card-quick-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            openProduct(product);
                          }}
                          aria-label="Mahsulotni ko'rish"
                        >
                          <Plus size={16} strokeWidth={2.2} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

