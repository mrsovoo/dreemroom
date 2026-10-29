import { useState, useRef, type TouchEvent, type MouseEvent } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { money, type Product } from "../data";

type Props = {
  product: Product;
  onOpen: (product: Product) => void;
  isLiked?: boolean;
  onToggleWishlist?: (id: string) => void;
  onQuickAdd?: (product: Product) => void;
};

/**
 * Minimalist moda kartochkasi:
 * - Kartochkani bosmasdan o'ngga/chapga surib (swipe) yoki tugmalar bilan keyingi rasmga o'tish
 * - Nechta rasm berilgan bo'lsa, barchasini ko'rsatish va indikator nuqtalarini aks ettirish
 */
export default function ProductCard({
  product,
  onOpen,
  onQuickAdd,
}: Props) {
  const [imgIndex, setImgIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isSwiping = useRef(false);

  const fallbackSvg =
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='700' fill='%23eae6df'><rect width='600' height='700' fill='%23eae6df'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%238c899a' font-family='sans-serif' font-size='20'>DREEM ROOM</text></svg>";

  const images =
    product.images && product.images.length > 0
      ? product.images
      : [{ src: fallbackSvg, alt: product.name }];

  const currentImage = images[imgIndex]?.src || images[0]?.src || fallbackSvg;
  const hasMultiple = images.length > 1;

  const nextImage = (e?: MouseEvent | TouchEvent) => {
    if (e) e.stopPropagation();
    setImgIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e?: MouseEvent | TouchEvent) => {
    if (e) e.stopPropagation();
    setImgIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleTouchStart = (e: TouchEvent) => {
    if (!hasMultiple) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isSwiping.current = false;
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const diffX = touchStartX.current - e.touches[0].clientX;
    const diffY = touchStartY.current - e.touches[0].clientY;
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 12) {
      isSwiping.current = true;
    }
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (!hasMultiple || touchStartX.current === null) return;
    const diffX = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diffX) > 35) {
      e.stopPropagation();
      if (diffX > 0) {
        nextImage();
      } else {
        prevImage();
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
    setTimeout(() => {
      isSwiping.current = false;
    }, 80);
  };

  const handleCardClick = () => {
    if (isSwiping.current) return;
    onOpen(product);
  };

  return (
    <article className="card velvorn-clean-card" onClick={handleCardClick}>
      <div
        className="card-media velvorn-card-media"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={currentImage}
          alt={`${product.name} • ${imgIndex + 1}-rasm`}
          loading="lazy"
          className="velvorn-card-img is-active"
          onError={(e) => {
            const target = e.currentTarget;
            if (!target.src.startsWith("data:image/svg+xml")) {
              target.src = fallbackSvg;
            }
          }}
        />

        {/* Bir nechta rasm bo'lsa: Chapga / O'ngga o'tkazish tugmalari */}
        {hasMultiple && (
          <>
            <button
              type="button"
              className="card-nav-arrow card-nav-prev"
              onClick={prevImage}
              aria-label="Oldingi rasm"
            >
              <ChevronLeft size={16} strokeWidth={2.4} />
            </button>
            <button
              type="button"
              className="card-nav-arrow card-nav-next"
              onClick={nextImage}
              aria-label="Keyingi rasm"
            >
              <ChevronRight size={16} strokeWidth={2.4} />
            </button>

            {/* Pastki ingichka nuqta-indikatorlar */}
            <div
              className="card-dots-bar"
              onClick={(e) => e.stopPropagation()}
              aria-label="Rasmlar indikatori"
            >
              {images.map((_, i) => (
                <span
                  key={i}
                  className={`card-dot-seg ${i === imgIndex ? "is-active" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setImgIndex(i);
                  }}
                  aria-label={`${i + 1}-rasm`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="card-info velvorn-card-info">
        <div className="velvorn-card-text">
          <h3 className="velvorn-card-title">{product.name}</h3>
          <p className="velvorn-card-price" id={`${product.id}-price`}>
            {money(product.price, product.displayPrice)}
          </p>
        </div>
        <button
          type="button"
          className="velvorn-card-plus-btn"
          onClick={(e) => {
            e.stopPropagation();
            if (onQuickAdd) {
              onQuickAdd(product);
            } else {
              onOpen(product);
            }
          }}
          aria-label={`${product.name} savatga qo'shish`}
        >
          <Plus size={15} strokeWidth={1.8} />
        </button>
      </div>
    </article>
  );
}
