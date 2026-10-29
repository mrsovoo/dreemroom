import { useState } from "react";
import type { Product } from "../data";

type Props = {
  product: Product;
  haptic?: (kind: "light" | "success" | "select") => void;
  onClose?: () => void;
  onShare?: () => void;
};

/** Ultra-minimalist mahsulot suratlari galereyasi: toza, xalaqit beruvchi tugmalarsiz va radiussiz */
export default function ProductGallery({ product, haptic }: Props) {
  const [index, setIndex] = useState(0);
  const change = (next: number) => {
    setIndex(next);
    haptic?.("select");
  };

  const fallbackSvg =
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='800' fill='%23f0f0f2'><rect width='600' height='800' fill='%23f0f0f2'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%238c899a' font-family='sans-serif' font-size='20' letter-spacing='2'>DREEM ROOM</text></svg>";

  const galleryImages =
    product.images && product.images.length > 0
      ? product.images
      : [{ src: fallbackSvg, alt: product.name }];

  const currentImage = galleryImages[index] || galleryImages[0];

  return (
    <div className="detail-gallery-minimal">
      <div className="detail-gallery-main">
        <img
          className="detail-gallery-img"
          src={currentImage.src}
          alt={`${product.name}. ${currentImage.alt || ""}`}
          onError={(e) => {
            const target = e.currentTarget;
            if (!target.src.startsWith("data:image/svg+xml")) {
              target.src = fallbackSvg;
            }
          }}
        />
      </div>

      {galleryImages.length > 1 && (
        <div className="detail-gallery-thumbs" aria-label="Boshqa suratlar">
          {galleryImages.map((image, i) => (
            <button
              key={image.src + i}
              type="button"
              className={`gallery-thumb-minimal ${i === index ? "is-active" : ""}`}
              onClick={() => change(i)}
              aria-label={`${i + 1}-rasm`}
            >
              <img src={image.src} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
