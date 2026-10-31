import { useState, useMemo } from "react";
import { Share2 } from "lucide-react";
import type { Product } from "../data";
import { defaultBrandConfig } from "../config/brandConfig";

type Props = {
  product: Product;
  haptic?: (kind: "light" | "success" | "select") => void;
  onShare?: () => void;
};

/** Modern minimalist mahsulot galereyasi: pagination pill, ulashish tugmasi va vertikal miniatyuralar */
export default function ProductGallery({ product, haptic, onShare }: Props) {
  const [index, setIndex] = useState(0);

  const fallbackSvg =
    `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='800' fill='%23f0f0f2'><rect width='600' height='800' fill='%23f0f0f2'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%238c899a' font-family='sans-serif' font-size='20' letter-spacing='2'>${defaultBrandConfig.brandName}</text></svg>`;

  // Agar mahsulotda bir nechta rasm bo'lsa, ulardan foydalanamiz;
  // Aks holda dizayn referensidagi kabi 4 ta ko'rinish nuqtalarini yaratamiz
  const galleryImages = useMemo(() => {
    if (product.images && product.images.length > 1) {
      return product.images;
    }
    const src = product.images?.[0]?.src || fallbackSvg;
    return [
      { src, alt: `${product.name} • 1-ko'rinish` },
      { src, alt: `${product.name} • 2-ko'rinish` },
      { src, alt: `${product.name} • 3-ko'rinish` },
      { src, alt: `${product.name} • 4-ko'rinish` },
    ];
  }, [product, fallbackSvg]);

  const currentImage = galleryImages[index] || galleryImages[0];

  const change = (next: number) => {
    setIndex(next);
    haptic?.("select");
  };

  return (
    <div className="modal-gallery-container">
      {/* Asosiy surat maydoni */}
      <div className="modal-gallery-main">
        <img
          className="modal-gallery-img"
          src={currentImage.src}
          alt={`${product.name}. ${currentImage.alt || ""}`}
          onError={(e) => {
            const target = e.currentTarget;
            if (!target.src.startsWith("data:image/svg+xml")) {
              target.src = fallbackSvg;
            }
          }}
        />

        {/* Yuqori chap: Pagination indikatori */}
        <div className="modal-gallery-pagination" aria-label="Surat ko'rsatkichi">
          {galleryImages.map((_, i) => (
            <span
              key={i}
              className={`pagination-dot ${i === index ? "is-active" : ""}`}
              onClick={() => change(i)}
            />
          ))}
        </div>

        {/* Yuqori o'ng: Ulashish tugmasi */}
        <button
          type="button"
          className="modal-gallery-share"
          onClick={onShare}
          aria-label="Ulashish"
        >
          <Share2 size={16} strokeWidth={2} />
        </button>

        {/* O'ng tomon: Vertikal miniatyuralar */}
        <div className="modal-gallery-thumbs" aria-label="Boshqa suratlar">
          {galleryImages.map((image, i) => (
            <button
              key={image.src + i}
              type="button"
              className={`gallery-thumb-item ${i === index ? "is-active" : ""}`}
              onClick={() => change(i)}
              aria-label={`${i + 1}-ko'rinish`}
            >
              <img src={image.src} alt="" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
