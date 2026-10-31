import React from "react";
import { ChevronLeft, Heart, Minus, Plus, ShoppingBag } from "lucide-react";
import type { Product } from "../data";
import { money } from "../data";
import { getBrandConfig, getBrandFallbackSvg } from "../config/brandConfig";

type ProductViewProps = {
  product: Product;
  productImgIndex: number;
  setProductImgIndex: (idx: number) => void;
  handleProductTouchStart: (e: React.TouchEvent) => void;
  handleProductTouchEnd: (e: React.TouchEvent, total: number) => void;
  selectedSize: string;
  setSelectedSize: (size: string) => void;
  productQuantity: number;
  setProductQuantity: React.Dispatch<React.SetStateAction<number>>;
  sizeError: boolean;
  setSizeError: (err: boolean) => void;
  wishlist: string[];
  toggleWishlist: (id: string) => void;
  cartCount: number;
  onBack: () => void;
  goCart: () => void;
  onAddToCart: () => void;
  haptic: (kind: "light" | "success" | "select") => void;
};

export default function ProductView({
  product,
  productImgIndex,
  setProductImgIndex,
  handleProductTouchStart,
  handleProductTouchEnd,
  selectedSize,
  setSelectedSize,
  productQuantity,
  setProductQuantity,
  sizeError,
  setSizeError,
  wishlist,
  toggleWishlist,
  cartCount,
  onBack,
  goCart,
  onAddToCart,
  haptic,
}: ProductViewProps) {
  const config = getBrandConfig();
  const fallbackSvg = getBrandFallbackSvg(config.brandName);

  const gallery =
    product.images && product.images.length > 0
      ? product.images.map((img) => img.src)
      : [fallbackSvg, fallbackSvg, fallbackSvg];

  const safeIndex = productImgIndex % gallery.length;
  const currentSrc = gallery[safeIndex];

  const productSizes =
    product.sizes &&
    product.sizes.length > 0 &&
    !(product.sizes.length === 1 && product.sizes[0] === "Standart")
      ? product.sizes
      : config.sizes || ["S", "M", "L", "XL"];

  return (
    <div className="product-details-page">
      {/* Top Bar: Back | Details | Cart Bag */}
      <header className="pdetails-header">
        <button
          type="button"
          className="pdetails-circle-btn"
          onClick={onBack}
          aria-label="Orqaga"
        >
          <ChevronLeft size={22} strokeWidth={2.2} />
        </button>

        <h1 className="pdetails-header-title">Details</h1>

        <button
          type="button"
          className="pdetails-circle-btn pdetails-cart-btn"
          onClick={goCart}
          aria-label="Savat"
        >
          <ShoppingBag size={20} strokeWidth={2} />
          {cartCount > 0 && <span className="pdetails-cart-badge">{cartCount}</span>}
        </button>
      </header>

      <div className="pdetails-body-layout">
        {/* Hero Image Card */}
        <div className="pdetails-media-section">
          <div
            className="pdetails-image-card"
            onTouchStart={handleProductTouchStart}
            onTouchEnd={(e) => handleProductTouchEnd(e, gallery.length)}
          >
            <img
              src={currentSrc}
              alt={product.name}
              className="pdetails-hero-img"
            />
          </div>

          {/* Swipe / Dots Indicator */}
          <div className="pdetails-dots-row">
            {gallery.map((_, idx) => (
              <button
                key={idx}
                type="button"
                className={`pdetails-dot ${safeIndex === idx ? "is-active" : ""}`}
                onClick={() => {
                  setProductImgIndex(idx);
                  haptic("light");
                }}
                aria-label={`Rasm ${idx + 1}`}
              />
            ))}
          </div>

          {/* Gallery Thumbnails */}
          {gallery.length > 1 && (
            <div className="pdetails-thumbnails-row">
              {gallery.map((thumbSrc, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`pdetails-thumb-btn ${safeIndex === idx ? "is-active" : ""}`}
                  onClick={() => {
                    setProductImgIndex(idx);
                    haptic("light");
                  }}
                  aria-label={`Rasm ${idx + 1}`}
                >
                  <img src={thumbSrc} alt="" className="pdetails-thumb-img" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Information & Details Block */}
        <div className="pdetails-content">
          <div className="pdetails-title-row">
            <div className="pdetails-title-col">
              <span className="pdetails-category-tag">
                {product.category || "To'plam"}
              </span>
              <h2 className="pdetails-name">{product.name}</h2>
            </div>
            <button
              type="button"
              className={`pdetails-heart-btn ${wishlist.includes(product.id) ? "is-liked" : ""}`}
              onClick={() => toggleWishlist(product.id)}
              aria-label="Sevimlilar"
            >
              <Heart
                size={22}
                strokeWidth={1.8}
                fill={wishlist.includes(product.id) ? "#ef4444" : "none"}
                color={wishlist.includes(product.id) ? "#ef4444" : "#9ca3af"}
              />
            </button>
          </div>

          <div className="pdetails-options-header">
            <span className="pdetails-options-label">Select size</span>
            <span className="pdetails-options-label">QTY</span>
          </div>

          <div className="pdetails-options-row">
            <div className="pdetails-sizes-list">
              {productSizes.map((sz) => (
                <button
                  key={sz}
                  type="button"
                  className={`pdetails-size-box ${selectedSize === sz ? "is-selected" : ""}`}
                  onClick={() => {
                    setSelectedSize(sz);
                    setSizeError(false);
                    haptic("select");
                  }}
                >
                  {sz}
                </button>
              ))}
            </div>

            <div className="pdetails-qty-stepper">
              <button
                type="button"
                className="pdetails-qty-btn"
                onClick={() => {
                  setProductQuantity((q) => Math.max(1, q - 1));
                  haptic("light");
                }}
                aria-label="Kamaytirish"
              >
                <Minus size={14} strokeWidth={2.5} />
              </button>
              <span className="pdetails-qty-value">{productQuantity}</span>
              <button
                type="button"
                className="pdetails-qty-btn"
                onClick={() => {
                  setProductQuantity((q) => Math.min(99, q + 1));
                  haptic("light");
                }}
                aria-label="Ko'paytirish"
              >
                <Plus size={14} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {sizeError && (
            <p className="pdetails-size-error">Iltimos, o'lchamni tanlang</p>
          )}

          <div className="pdetails-desc-box">
            <p>
              {product.description ||
                "Yuqori sifatli va qulay materialdan tayyorlangan premium to'plam. Kundalik kiyish uchun ideal tanlov."}
            </p>
          </div>

          {/* Desktop & Tablet Action Card */}
          <div className="pdetails-desktop-action-card">
            <div className="pdetails-desktop-price-block">
              <span className="pdetails-desktop-price-label">Jami narx</span>
              <strong className="pdetails-desktop-price-value">
                {money((product.price || 0) * productQuantity)}
              </strong>
            </div>
            <button
              type="button"
              className="pdetails-desktop-buy-btn"
              onClick={() => {
                onAddToCart();
                haptic("success");
              }}
            >
              <ShoppingBag size={19} strokeWidth={2.2} />
              <span>Savatga qo'shish</span>
            </button>
          </div>

          <div className="pdetails-desktop-perks">
            <div className="pdetails-perk-item">
              <span className="perk-bullet">◈</span>
              <span>100% original va kafolatlangan sifat</span>
            </div>
            <div className="pdetails-perk-item">
              <span className="perk-bullet">◈</span>
              <span>Do'kondan qulay va tez olib ketish</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Bar */}
      <div className="pdetails-bottom-bar">
        <div className="pdetails-price-meta">
          <span className="pdetails-price-meta-label">Jami narx</span>
          <strong className="pdetails-price-meta-value">
            {money((product.price || 0) * productQuantity)}
          </strong>
        </div>
        <button
          type="button"
          className="pdetails-buy-btn"
          onClick={() => {
            onAddToCart();
            haptic("success");
          }}
        >
          <ShoppingBag size={18} strokeWidth={2.2} />
          <span>Savatga qo'shish</span>
        </button>
      </div>
    </div>
  );
}

