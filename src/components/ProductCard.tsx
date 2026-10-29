import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { money, type Product } from "../data";

type Props = {
  product: Product;
  onOpen: (product: Product) => void;
};

/** Mahsulot kartasi: uchta rakursi surilishi/hoversi bilan ko'riladi. */
export default function ProductCard({ product, onOpen }: Props) {
  const [index, setIndex] = useState(0);
  const timers = useRef<number[]>([]);

  useEffect(
    () => () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
    },
    [],
  );

  const cardImages =
    product.images && product.images.length > 0
      ? product.images
      : [{ src: "/image-landing/banner-1.jpg", alt: product.name }];

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
                if (!target.src.includes("banner-1.jpg")) {
                  target.src = "/image-landing/banner-1.jpg";
                }
              }}
            />
          ))}
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
      <div className="card-info">
        <div>
          <h3>{product.name}</h3>
          <p id={`${product.id}-price`}>{money(product.price)}</p>
        </div>
        <button
          className="card-add"
          onClick={() => onOpen(product)}
          aria-label={`${product.name} ni tanlash`}
        >
          <Plus size={17} strokeWidth={1.7} />
        </button>
      </div>
    </article>
  );
}
