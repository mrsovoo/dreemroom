import { useState } from "react";
import type { Product } from "../data";

type Props = {
  product: Product;
  haptic?: (kind: "light" | "success" | "select") => void;
};

/** Mahsulot oynasidagi uch rakursli suratlar galereyasi. */
export default function ProductGallery({ product, haptic }: Props) {
  const [index, setIndex] = useState(0);
  const change = (next: number) => {
    setIndex(next);
    haptic?.("select");
  };

  return (
    <div className="detail-gallery">
      <img
        className="detail-image"
        src={product.images[index].src}
        alt={`${product.name}. ${product.images[index].alt}`}
      />
      <div
        className="gallery-points"
        role="tablist"
        aria-label="Mahsulot suratlari"
      >
        {product.images.map((image, i) => (
          <button
            key={image.src + i}
            role="tab"
            className={i === index ? "is-active" : ""}
            aria-selected={i === index}
            aria-label={`${i + 1}-rakurs · ${image.alt}`}
            onClick={() => change(i)}
          />
        ))}
      </div>
      <div className="gallery-thumbs" aria-label="Boshqa rakurslar">
        {product.images.map((image, i) => (
          <button
            key={image.src + "thumb" + i}
            className={i === index ? "is-active" : ""}
            aria-label={`${product.name} ${image.alt}`}
            aria-pressed={i === index}
            onClick={() => change(i)}
          >
            <img
              src={image.src}
              alt=""
              loading="lazy"
              width="104"
              height="128"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
