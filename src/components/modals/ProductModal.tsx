import React from "react";
import { Heart, Minus, Plus, ShoppingBag, X } from "lucide-react";
import Sheet from "../Sheet";
import ProductGallery from "../ProductGallery";
import type { Product } from "../../data";
import { money } from "../../data";

type ProductModalProps = {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  wishlist: string[];
  toggleWishlist: (id: string) => void;
  selectedSize: string;
  setSelectedSize: (size: string) => void;
  productQuantity: number;
  setProductQuantity: React.Dispatch<React.SetStateAction<number>>;
  sizeError: boolean;
  setSizeError: (err: boolean) => void;
  showSizeGuide: boolean;
  setShowSizeGuide: (show: boolean) => void;
  onAddToCart: (qty: number) => void;
  onShare: (product: Product) => void;
  haptic: (kind: "light" | "success" | "select") => void;
};

const defaultSizeGuideData: Record<string, { height: string; weight: string }> = {
  XS: { height: "150–158 sm", weight: "40–48 kg" },
  S: { height: "158–165 sm", weight: "48–55 kg" },
  M: { height: "165–172 sm", weight: "55–62 kg" },
  L: { height: "170–178 sm", weight: "62–70 kg" },
  XL: { height: "175–182 sm", weight: "70–78 kg" },
  XXL: { height: "180–190 sm", weight: "78–88 kg" },
  "3XL": { height: "185–195 sm", weight: "88–98 kg" },
  Standart: { height: "158–180 sm", weight: "48–78 kg (Universal)" },
};

export default function ProductModal({
  isOpen,
  onClose,
  product,
  wishlist,
  toggleWishlist,
  selectedSize,
  setSelectedSize,
  productQuantity,
  setProductQuantity,
  sizeError,
  setSizeError,
  showSizeGuide,
  setShowSizeGuide,
  onAddToCart,
  onShare,
  haptic,
}: ProductModalProps) {
  if (!isOpen) return null;

  const productSizes =
    product.sizes &&
    product.sizes.length > 0 &&
    !(product.sizes.length === 1 && product.sizes[0] === "Standart")
      ? product.sizes
      : ["XS", "S", "M", "L", "XL"];

  return (
    <Sheet
      key="product"
      title={product.name}
      onClose={onClose}
      wide
      hideHeader={true}
    >
      <div className="modal-product-card">
        <div className="modal-left-col">
          <ProductGallery
            product={product}
            onShare={() => onShare(product)}
            haptic={haptic}
          />
        </div>

        <div className="modal-right-col">
          {/* Title and actions */}
          <div className="modal-title-row">
            <h1 className="modal-product-title">{product.name}</h1>
            <div className="modal-actions-group">
              <button
                type="button"
                className={`modal-action-circle ${wishlist.includes(product.id) ? "is-liked" : ""}`}
                onClick={() => toggleWishlist(product.id)}
                aria-label="Sevimlilar"
                title="Sevimlilar"
              >
                <Heart
                  size={17}
                  strokeWidth={1.8}
                  fill={wishlist.includes(product.id) ? "#ef4444" : "none"}
                  color={wishlist.includes(product.id) ? "#ef4444" : "#18181b"}
                />
              </button>
              <button
                type="button"
                className="modal-action-circle modal-close-action"
                onClick={onClose}
                aria-label="Yopish"
                title="Yopish"
              >
                <X size={17} strokeWidth={2} />
              </button>
            </div>
          </div>

          <p className="modal-subtitle">
            {product.category || "To'plam"} · {product.color || "Asosiy"}
          </p>

          {/* O'lcham tanlash */}
          <div className="modal-size-section">
            <div className="modal-size-header">
              <span className="modal-size-label">
                O'lcham: <strong>{selectedSize || productSizes[0]}</strong>
              </span>
              <button
                type="button"
                className="modal-size-guide-link"
                onClick={() => setShowSizeGuide(!showSizeGuide)}
              >
                O'lcham jadvali
              </button>
            </div>

            <div className="modal-sizes-pills">
              {productSizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  className={`modal-size-pill ${selectedSize === size ? "is-active" : ""}`}
                  onClick={() => {
                    setSelectedSize(size);
                    setSizeError(false);
                    haptic("select");
                  }}
                  aria-pressed={selectedSize === size}
                >
                  {size}
                </button>
              ))}
            </div>

            {sizeError && (
              <p className="modal-size-error" role="alert">
                Iltimos, o'lchamni tanlang.
              </p>
            )}

            {showSizeGuide && (
              <div className="modal-size-guide-popup">
                <p className="size-guide-title">
                  <strong>{selectedSize || productSizes[0]}</strong> o'lchami tavsiyasi:
                </p>
                <div className="size-guide-row">
                  <span>Bo'y:</span>
                  <strong>{defaultSizeGuideData[selectedSize || productSizes[0]]?.height || "160-170 sm"}</strong>
                </div>
                <div className="size-guide-row">
                  <span>Vazn:</span>
                  <strong>{defaultSizeGuideData[selectedSize || productSizes[0]]?.weight || "50-60 kg"}</strong>
                </div>
              </div>
            )}
          </div>

          {/* Pastki harakatlar guruhi: Miqdor, Narx va Savatga qo'shish */}
          <div className="modal-bottom-actions">
            <div className="modal-qty-price-row">
              <div className="modal-qty-container">
                <span className="modal-field-title">Miqdori</span>
                <div className="modal-qty-stepper">
                  <button
                    type="button"
                    className="modal-qty-btn"
                    onClick={() => {
                      setProductQuantity((q) => Math.max(1, q - 1));
                      haptic("light");
                    }}
                    aria-label="Kamaytirish"
                  >
                    <Minus size={13} strokeWidth={2.5} />
                  </button>
                  <span className="modal-qty-num">{productQuantity}</span>
                  <button
                    type="button"
                    className="modal-qty-btn"
                    onClick={() => {
                      setProductQuantity((q) => Math.min(10, q + 1));
                      haptic("light");
                    }}
                    aria-label="Ko'paytirish"
                  >
                    <Plus size={13} strokeWidth={2.5} />
                  </button>
                </div>
              </div>

              <div className="modal-price-container">
                <span className="modal-field-title text-right">Jami narx</span>
                <span className="modal-price-old">
                  {money(Math.round(product.price * 1.25) * productQuantity)}
                </span>
                <span className="modal-price-val">
                  {money(product.price * productQuantity)}
                </span>
              </div>
            </div>

            <div className="modal-add-cart-wrap">
              <button
                type="button"
                className="modal-add-cart-btn"
                onClick={() => onAddToCart(productQuantity)}
              >
                <ShoppingBag size={18} strokeWidth={1.8} />
                <span>SAVATGA QO'SHISH</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Sheet>
  );
}
