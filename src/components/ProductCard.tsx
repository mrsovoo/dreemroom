import { Plus } from "lucide-react";
import { money, type Product } from "../data";

type Props = {
  product: Product;
  onOpen: (product: Product) => void;
  isLiked?: boolean;
  onToggleWishlist?: (id: string) => void;
  onQuickAdd?: (product: Product) => void;
};

/** Minimalist moda kartochkasi — xuddi namunadagi toza va to'g'ri burchakli kartochka (Zen Tank uslubi) */
export default function ProductCard({
  product,
  onOpen,
  onQuickAdd,
}: Props) {
  const fallbackSvg =
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='700' fill='%23eae6df'><rect width='600' height='700' fill='%23eae6df'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%238c899a' font-family='sans-serif' font-size='20'>DREEM ROOM</text></svg>";

  const mainImage = product.images?.[0]?.src || fallbackSvg;

  return (
    <article className="card velvorn-clean-card" onClick={() => onOpen(product)}>
      <div className="card-media velvorn-card-media">
        <img
          src={mainImage}
          alt={product.name}
          loading="lazy"
          className="velvorn-card-img is-active"
          onError={(e) => {
            const target = e.currentTarget;
            if (!target.src.startsWith("data:image/svg+xml")) {
              target.src = fallbackSvg;
            }
          }}
        />
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
