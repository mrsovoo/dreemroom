import React from "react";
import { ArrowRight, Trash2 } from "lucide-react";
import Sheet from "../Sheet";
import type { Product } from "../../data";
import { money } from "../../data";
import { getBrandConfig } from "../../config/brandConfig";

type WishlistModalProps = {
  isOpen: boolean;
  onClose: () => void;
  wishlist: string[];
  productsList: Product[];
  openProduct: (product: Product) => void;
  toggleWishlist: (productId: string) => void;
  openCatalog: () => void;
};

export default function WishlistModal({
  isOpen,
  onClose,
  wishlist,
  productsList,
  openProduct,
  toggleWishlist,
  openCatalog,
}: WishlistModalProps) {
  if (!isOpen) return null;
  const config = getBrandConfig();
  const fallbackSvg = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='800' fill='%232b2836'><rect width='600' height='800' fill='%232b2836'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23716d82' font-family='sans-serif' font-size='22'>${config.brandName}</text></svg>`;

  return (
    <Sheet
      key="wishlist"
      title={`Sevimlilar (${wishlist.length})`}
      onClose={onClose}
    >
      {wishlist.length ? (
        <div className="wishlist-sheet">
          <div className="wishlist-list">
            {wishlist.map((id) => {
              const product = productsList.find((p) => p.id === id);
              if (!product) return null;
              return (
                <div className="wishlist-item" key={product.id}>
                  <img
                    src={product.images?.[0]?.src || fallbackSvg}
                    alt={product.name}
                    onClick={() => openProduct(product)}
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (!target.src.startsWith("data:image/svg+xml")) {
                        target.src = fallbackSvg;
                      }
                    }}
                  />
                  <div className="wishlist-info">
                    <strong onClick={() => openProduct(product)}>
                      {product.name}
                    </strong>
                    <span>
                      {product.category} · {product.color}
                    </span>
                    <b>{money(product.price)}</b>
                  </div>
                  <div className="wishlist-actions">
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => openProduct(product)}
                    >
                      Ko'rish
                    </button>
                    <button
                      type="button"
                      className="cart-remove"
                      aria-label={`${product.name} ni sevimlilardan o'chirish`}
                      onClick={() => toggleWishlist(product.id)}
                    >
                      <Trash2 size={16} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="empty">
          <p>Sevimlilar ro'yxatingiz bo'sh.</p>
          <button
            className="btn"
            onClick={() => {
              onClose();
              openCatalog();
            }}
          >
            Katalogni ko'rish
            <ArrowRight size={15} />
          </button>
        </div>
      )}
    </Sheet>
  );
}
