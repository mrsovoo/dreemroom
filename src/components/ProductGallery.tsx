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

  const fallbackSvg =
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='800' fill='%232b2836'><rect width='600' height='800' fill='%232b2836'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23716d82' font-family='sans-serif' font-size='22' letter-spacing='2'>DREEM ROOM</text></svg>";

  const galleryImages =
    product.images && product.images.length > 0
      ? product.images
      : [{ src: fallbackSvg, alt: product.name }];

  const currentImage = galleryImages[index] || galleryImages[0];

  return (
    <div className="detail-gallery">
      <img
        className="detail-image"
        src={currentImage.src}
        alt={`${product.name}. ${currentImage.alt}`}
        onError={(e) => {
          const target = e.currentTarget;
          if (!target.src.startsWith("data:image/svg+xml")) {
            target.src = fallbackSvg;
          }
        }}
      />
      <div
        className="gallery-points"
        role="tablist"
        aria-label="Mahsulot suratlari"
      >
        {galleryImages.map((image, i) => (
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
        {galleryImages.map((image, i) => (
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
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.startsWith("data:image/svg+xml")) {
                  target.src = fallbackSvg;
                }
              }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
