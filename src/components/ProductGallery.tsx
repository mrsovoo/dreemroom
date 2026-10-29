import { useState } from "react";
import { ChevronLeft, Share2 } from "lucide-react";
import type { Product } from "../data";

type Props = {
  product: Product;
  haptic?: (kind: "light" | "success" | "select") => void;
  onClose?: () => void;
  onShare?: () => void;
};

/** Mahsulot oynasidagi suratlar galereyasi: 2-rasm uslubidagi vertikal burchakli rakurslar va suzuvchi boshqaruv. */
export default function ProductGallery({ product, haptic, onClose, onShare }: Props) {
  const [index, setIndex] = useState(0);
  const change = (next: number) => {
    setIndex(next);
    haptic?.("select");
  };

  const fallbackSvg =
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='800' fill='%232b2836'><rect width='600' height='800' fill='%232b2836'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23716d82' font-family='sans-serif' font-size='22' letter-spacing='2'>DREEM ROOM</text></svg>";

  const rawImages =
    product.images && product.images.length > 0
      ? product.images
      : [{ src: fallbackSvg, alt: product.name }];

  // Agar bitta rasm bo'lsa, 2-rasmdagidek bir nechta rakurs thumbnails namoyish qilish
  const galleryImages =
    rawImages.length >= 2
      ? rawImages
      : [
          rawImages[0],
          { src: rawImages[0].src, alt: "Yon ko'rinishi" },
          { src: rawImages[0].src, alt: "Orqa ko'rinishi" },
          { src: rawImages[0].src, alt: "Detallar" },
        ];

  const currentImage = galleryImages[index] || galleryImages[0];

  function handleShareClick() {
    haptic?.("light");
    if (onShare) {
      onShare();
      return;
    }
    if (navigator.share) {
      navigator.share({
        title: product.name,
        text: `${product.name} — DREEM ROOM`,
        url: window.location.href,
      }).catch(() => {});
    }
  }

  return (
    <div className="detail-gallery">
      {/* 2-rasm: Chap yuqori suzuvchi qora dumaloq orqaga qaytish tugmasi */}
      {onClose && (
        <button
          type="button"
          className="gallery-float-btn gallery-float-back"
          onClick={onClose}
          aria-label="Orqaga"
        >
          <ChevronLeft size={22} strokeWidth={2.4} />
        </button>
      )}

      {/* 2-rasm: O'ng yuqori suzuvchi qora dumaloq ulashish tugmasi */}
      <button
        type="button"
        className="gallery-float-btn gallery-float-share"
        onClick={handleShareClick}
        aria-label="Ulashish"
      >
        <Share2 size={18} strokeWidth={2} />
      </button>

      {/* Asosiy katta surat */}
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

      {/* Surat ustidagi pastki nuqtalar indikatori */}
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

      {/* 2-rasm: O'ng chekkada vertikal ustun bo'lib turgan thumbnail suratlari */}
      <div className="gallery-thumbs-vertical" aria-label="Boshqa rakurslar">
        {galleryImages.slice(0, 4).map((image, i) => (
          <button
            key={image.src + "thumb" + i}
            className={`gallery-thumb-item ${i === index ? "is-active" : ""}`}
            aria-label={`${product.name} ${image.alt}`}
            aria-pressed={i === index}
            onClick={() => change(i)}
          >
            <img
              src={image.src}
              alt=""
              loading="lazy"
              width="56"
              height="68"
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
