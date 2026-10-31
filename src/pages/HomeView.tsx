import React from "react";
import { ArrowRight } from "lucide-react";
import ProductCard from "../components/ProductCard";
import type { HeroSlide } from "../types/store";
import type { Product } from "../data";
import { money } from "../data";
import { getBrandConfig } from "../config/brandConfig";

type HomeViewProps = {
  heroSlidesList: HeroSlide[];
  slide: number;
  setSlide: (idx: number) => void;
  handleHeroTouchStart: (e: React.TouchEvent) => void;
  handleHeroTouchEnd: (e: React.TouchEvent) => void;
  handleMobileHeroClick: () => void;
  openCatalog: () => void;
  openProduct: (product: Product) => void;
  productsList: Product[];
  isLoadingProducts: boolean;
  popularTopProducts: Product[];
  wishlist: string[];
  toggleWishlist: (id: string) => void;
};

export default function HomeView({
  heroSlidesList,
  slide,
  setSlide,
  handleHeroTouchStart,
  handleHeroTouchEnd,
  handleMobileHeroClick,
  openCatalog,
  openProduct,
  productsList,
  isLoadingProducts,
  popularTopProducts,
  wishlist,
  toggleWishlist,
}: HomeViewProps) {
  const config = getBrandConfig();
  const currentHero = heroSlidesList[slide] || {};

  return (
    <>
      {/* 1. HERO SECTION */}
      <section
        className="velvorn-hero-section"
        aria-label="Asosiy banner"
        onTouchStart={handleHeroTouchStart}
        onTouchEnd={handleHeroTouchEnd}
        onClick={handleMobileHeroClick}
      >
        <div className="velvorn-hero-container">
          {heroSlidesList.map((item, idx) => (
            <img
              key={item.src + idx}
              src={item.src}
              alt={item.alt || config.brandName}
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
                  {currentHero.eyebrow || config.hero?.eyebrow || `${config.brandName} • TO'PLAM`}
                </span>
              </div>
              <h1 className="hero-editorial-title">
                {currentHero.title || config.hero?.title || "Har Kunlik Nafislik\nVa Go'zallik"}
              </h1>
              <p className="hero-editorial-desc">
                {currentHero.subtitle || config.hero?.subtitle || "Zamonaviy bichim va yuqori sifatli matolar."}
              </p>
              <button
                type="button"
                className="velvorn-cta-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  openCatalog();
                }}
                aria-label="To'plamni ko'rish"
              >
                <span>{currentHero.buttonText || config.hero?.buttonText || "TO'PLAMNI KO'RISH"}</span>
                <ArrowRight size={14} className="velvorn-cta-arrow" />
              </button>
            </div>

            {/* Indikator nuqtalari */}
            <div
              className="velvorn-hero-dots"
              onClick={(e) => e.stopPropagation()}
            >
              {heroSlidesList.map((_, idx) => (
                <button
                  key={"dot-" + idx}
                  type="button"
                  className={`velvorn-hero-dot ${idx === slide ? "is-active" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSlide(idx);
                  }}
                  aria-label={`${idx + 1}-banner`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 2. KATALOG (6 ta kartochka) */}
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
                  isLiked={wishlist.includes(product.id)}
                  onToggleWishlist={toggleWishlist}
                />
              ))}
            </div>
            <div className="catalog-see-all-wrap">
              <button
                type="button"
                className="btn-see-all"
                onClick={openCatalog}
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

      {/* 3. OMMABOP TO'PLAMLAR */}
      {popularTopProducts.length > 0 && (
        <section className="velvorn-cards-section hot-sale-section" id="ommabop-toplamlar">
          <div className="velvorn-section-header hot-sale-center-head">
            <h2 className="velvorn-heading-drops hot-sale-title">Ommabop to'plamlar</h2>
          </div>
          <div className="hot-sale-grid">
            {popularTopProducts.map((prod, idx) => {
              const cardImg = prod.images?.[0]?.src || (prod as any).image || "/brand/banner.jpg";
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
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = "/brand/banner.jpg";
                      }}
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
  );
}

