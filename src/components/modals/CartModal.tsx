import React from "react";
import { ArrowRight, Check, Minus, Plus, Trash2, UserRound } from "lucide-react";
import Sheet from "../Sheet";
import type { CartItem, Profile } from "../../types/store";
import type { Product } from "../../data";
import { money } from "../../data";
import { formatUzbekPhone } from "../../utils/phone";
import { getBrandConfig, getBrandFallbackSvg } from "../../config/brandConfig";

type CartModalProps = {
  isOpen: boolean;
  onClose: () => void;
  ordered: boolean;
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  cartCount: number;
  total: number;
  profile: Profile | null;
  productsList: Product[];
  openProduct: (product: Product) => void;
  openCatalog: () => void;
  goProfile: () => void;
  changeQuantity: (id: string, size: string, delta: number) => void;
  placeOrder: (e: React.FormEvent) => void;
  orderFormRef: React.RefObject<HTMLFormElement | null>;
};

export default function CartModal({
  isOpen,
  onClose,
  ordered,
  cart,
  setCart,
  cartCount,
  total,
  profile,
  productsList,
  openProduct,
  openCatalog,
  goProfile,
  changeQuantity,
  placeOrder,
  orderFormRef,
}: CartModalProps) {
  if (!isOpen) return null;
  const config = getBrandConfig();
  const fallbackSvg = getBrandFallbackSvg(config.brandName);

  return (
    <Sheet
      key="cart"
      title={ordered ? "Buyurtma qabul qilindi" : `Savat (${cartCount})`}
      onClose={onClose}
    >
      {ordered ? (
        <div className="done">
          <span className="done-icon">
            <Check size={26} strokeWidth={1.7} />
          </span>
          <h3>Rahmat!</h3>
          <p>Buyurtmangiz qabul qilindi. Tez orada siz bilan bog'lanamiz.</p>
          <button className="btn btn-full" onClick={() => openCatalog()}>
            Xaridni davom ettirish
            <ArrowRight size={16} />
          </button>
        </div>
      ) : cart.length ? (
        <>
          <div className="cart-list">
            {cart.map((item) => {
              const product = productsList.find((p) => p.id === item.id);
              if (!product) return null;
              return (
                <div
                  className="cart-row"
                  key={`${item.id}-${item.size}`}
                  onClick={() => openProduct(product)}
                  role="button"
                  tabIndex={0}
                  style={{ cursor: "pointer" }}
                >
                  <img
                    src={product.images?.[0]?.src || fallbackSvg}
                    alt={product.name}
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (!target.src.startsWith("data:image/svg+xml")) {
                        target.src = fallbackSvg;
                      }
                    }}
                  />
                  <div className="cart-info">
                    <strong>{product.name}</strong>
                    <span>O'lcham {item.size}</span>
                    <b>{money(product.price)}</b>
                    <div className="qty" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        aria-label={`${product.name} sonini kamaytirish`}
                        onClick={(e) => {
                          e.stopPropagation();
                          changeQuantity(item.id, item.size, -1);
                        }}
                      >
                        <Minus size={13} />
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        type="button"
                        aria-label={`${product.name} sonini oshirish`}
                        disabled={item.quantity >= 10}
                        onClick={(e) => {
                          e.stopPropagation();
                          changeQuantity(item.id, item.size, 1);
                        }}
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="cart-remove"
                    aria-label={`${product.name} ni savatdan olib tashlash`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCart((current) =>
                        current.filter(
                          (row) => !(row.id === item.id && row.size === item.size),
                        ),
                      );
                    }}
                  >
                    <Trash2 size={15} strokeWidth={1.5} />
                  </button>
                </div>
              );
            })}
          </div>
          <div className="cart-total">
            <span>Jami</span>
            <strong>{money(total)}</strong>
          </div>
          {profile && profile.name ? (
            <form
              ref={orderFormRef}
              className="order-form"
              onSubmit={placeOrder}
            >
              <div className="cart-profile-badge">
                <div className="cart-profile-avatar">
                  {profile.name.trim().charAt(0).toUpperCase()}
                </div>
                <div className="cart-profile-details">
                  <strong className="cart-profile-name">{profile.name}</strong>
                  <span className="cart-profile-phone">{formatUzbekPhone(profile.phone)}</span>
                </div>
                <button
                  type="button"
                  className="cart-profile-switch-btn"
                  onClick={() => {
                    onClose();
                    goProfile();
                  }}
                >
                  Profil
                </button>
              </div>

              <label>
                To'lov turi
                <select
                  name="paymentMethod"
                  defaultValue="Naqd pul / Karta"
                >
                  <option value="Naqd pul / Karta">Naqd pul / Karta</option>
                  <option value="Payme / Click (oldindan to'lov)">Payme / Click (oldindan to'lov)</option>
                </select>
              </label>
              <button className="btn btn-full" type="submit">
                Buyurtmani tasdiqlash • {money(total)}
                <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            <div className="cart-guest-box">
              <div className="cart-guest-content">
                <div className="cart-guest-avatar">
                  <UserRound size={22} strokeWidth={1.8} />
                </div>
                <div className="cart-guest-text">
                  <strong>Profil kiritilmagan</strong>
                  <p>Buyurtma berish uchun avval ro'yxatdan o'ting</p>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-full cart-guest-btn"
                onClick={() => {
                  onClose();
                  goProfile();
                }}
              >
                <span>Ro'yxatdan o'tish</span>
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="empty">
          <p>Savatingiz hozircha bo'sh.</p>
          <button className="btn" onClick={() => openCatalog()}>
            Katalogni ochish
            <ArrowRight size={15} />
          </button>
        </div>
      )}
    </Sheet>
  );
}

