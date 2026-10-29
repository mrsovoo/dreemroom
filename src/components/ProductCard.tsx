import { useEffect, useRef, useState } from "react";
import { Heart, Plus } from "lucide-react";
import { money, type Product } from "../data";

type Props = {
  product: Product;
  onOpen: (product: Product) => void;
  isLiked?: boolean;
  onToggleWishlist?: (id: string) => void;
};

/** Mahsulot kartasi: uchta rakursi surilishi/hoversi bilan ko'riladi. */
export default function ProductCard({
  product,
  onOpen,
  isLiked = false,
  onToggleWishlist,
}: Props) {
  const [index, setIndex] = useState(0);
  const timers = useRef<number[]>([]);

  useEffect(
    () => () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
    },
    [],
  );

  const fallbackSvg =
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='800' fill='%232b2836'><rect width='600' height='800' fill='%232b2836'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23716d82' font-family='sans-serif' font-size='22' letter-spacing='2'>DREEM ROOM</text></svg>";

  const cardImages =
    product.images && product.images.length > 0
      ? product.images
      : [{ src: fallbackSvg, alt: product.name }];

  function previewSide(direction: number) {
    setIndex(
      (current) =>
        (current + direction + cardImages.length) % cardImages.length,
    );
  }

  function startAuto() {
    clearAuto();
    timers.current = cardImages
      .slice(1)
      .map((_, i) => window.setTimeout(() => setIndex(i + 1), 430 * (i + 1)));
  }

  function clearAuto() {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
  }

  return (
    <article className="card">
      <div
        className="card-media"
        onPointerEnter={() => {
          if (window.matchMedia("(hover: hover)").matches) startAuto();
        }}
        onPointerLeave={() => {
          clearAuto();
          setIndex(0);
        }}
      >
        <button
          className="card-open"
          onClick={() => onOpen(product)}
          aria-label={`${product.name} — batafsil`}
          aria-describedby={`${product.id}-price`}
        >
          {cardImages.map((image, i) => (
            <img
              key={image.src + image.alt + i}
              src={image.src}
              alt=""
              loading="lazy"
              width="640"
              height="800"
              className={i === index ? "is-active" : ""}
              aria-hidden={i !== index}
              title={image.alt}
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.startsWith("data:image/svg+xml")) {
                  target.src = fallbackSvg;
                }
              }}
            />
          ))}
        </button>

        {/* 1-rasmdagi chap yuqori qismdagi dumaloq sevimli (heart) tugmasi */}
        <button
          type="button"
          className={`card-wishlist-circle ${isLiked ? "is-liked" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleWishlist?.(product.id);
          }}
          aria-label={isLiked ? "Sevimlilardan o'chirish" : "Sevimlilarga qo'shish"}
        >
          <Heart
            size={17}
            strokeWidth={1.8}
            fill={isLiked ? "var(--brand, #403D4F)" : "none"}
            color={isLiked ? "var(--brand, #403D4F)" : "#1e1e24"}
          />
        </button>

        {product.isNew && <span className="card-flag">Yangi</span>}
        <span className="card-dots" aria-hidden="true">
          {cardImages.map((image, i) => (
            <span
              key={image.src + i}
              className={i === index ? "is-active" : ""}
            />
          ))}
        </span>
        <div className="card-navigation" aria-hidden="false">
          <button
            type="button"
            tabIndex={-1}
            aria-label={`${product.name} oldingi rakursi`}
            onClick={() => previewSide(-1)}
          />
          <button
            type="button"
            tabIndex={-1}
            aria-label={`${product.name} keyingi rakursi`}
            onClick={() => previewSide(1)}
          />
        </div>
      </div>
      <div className="card-info" onClick={() => onOpen(product)}>
        <div>
          <h3>{product.name}</h3>
          <p id={`${product.id}-price`}>{money(product.price)}</p>
        </div>
        <button
          type="button"
          className="card-add"
          onClick={(e) => {
            e.stopPropagation();
            onOpen(product);
          }}
          aria-label={`${product.name} ni tanlash`}
        >
          <Plus size={17} strokeWidth={1.7} />
        </button>
      </div>
    </article>
  );
}
