import React from "react";
import { Bell, Heart, Search, ShoppingBag, UserRound } from "lucide-react";
import Logo from "./Logo";
import type { Profile, View, Panel } from "../types/store";
import { getBrandConfig } from "../config/brandConfig";

type HeaderProps = {
  view: View;
  panel: Panel;
  profile: Profile | null;
  wishlistCount: number;
  cartCount: number;
  hasNotifications: boolean;
  goHome: () => void;
  openCatalog: () => void;
  openContact: () => void;
  openProfile: () => void;
  openWishlist: () => void;
  openCart: () => void;
  onNotificationsClick: () => void;
};

export default function Header({
  view,
  panel,
  profile,
  wishlistCount,
  cartCount,
  hasNotifications,
  goHome,
  openCatalog,
  openContact,
  openProfile,
  openWishlist,
  openCart,
  onNotificationsClick,
}: HeaderProps) {
  const config = getBrandConfig();

  return (
    <header className={`header velvorn-header ${view === "product" ? "hide-on-mobile-product" : ""}`}>
      <div className="header-zone header-brand" aria-label="Bosh sahifa">
        <button
          className="brand brand-velvorn"
          onClick={goHome}
          aria-label={config.brandName}
        >
          <Logo />
        </button>
      </div>

      <nav className="nav velvorn-nav" aria-label="Asosiy menyu">
        <button
          className={view === "home" && !panel ? "nav-link is-active" : "nav-link"}
          onClick={goHome}
        >
          Asosiy
        </button>
        <button
          className={view === "catalog" && !panel ? "nav-link is-active" : "nav-link"}
          onClick={openCatalog}
        >
          Katalog
        </button>
        <button
          className={panel === "contact" ? "nav-link is-active" : "nav-link"}
          onClick={openContact}
        >
          Kontakt
        </button>
      </nav>

      <div className="header-zone header-actions">
        <button
          className="action-btn header-search-btn"
          onClick={openCatalog}
          aria-label="Katalogdan qidirish"
        >
          <Search size={20} strokeWidth={1.6} />
        </button>

        <button
          className={`action-btn header-profile-btn ${profile?.name ? "has-profile" : ""} ${panel === "profile" ? "is-active" : ""}`}
          onClick={openProfile}
          aria-label="Profil"
        >
          {profile && profile.name.trim() ? (
            <span className="profile-initial-badge">
              {profile.name.trim().charAt(0).toUpperCase()}
            </span>
          ) : (
            <UserRound size={20} strokeWidth={1.6} />
          )}
        </button>

        <button
          className={`action-btn header-wishlist-btn ${panel === "wishlist" ? "is-active" : ""}`}
          onClick={openWishlist}
          aria-label={`Sevimlilar, ${wishlistCount} ta mahsulot`}
          title="Sevimlilar"
        >
          <Heart
            size={19}
            strokeWidth={1.8}
            fill={wishlistCount > 0 ? "#ef4444" : "none"}
            color={wishlistCount > 0 ? "#ef4444" : "currentColor"}
          />
          {wishlistCount > 0 && <span className="action-badge">{wishlistCount}</span>}
        </button>

        <button
          className="action-btn header-notif-btn"
          onClick={onNotificationsClick}
          aria-label="Bildirishnomalar"
          title="Bildirishnomalar"
        >
          <Bell size={19} strokeWidth={1.8} />
          {hasNotifications && <span className="notif-dot" />}
        </button>

        <button
          className={`action-btn action-cart-frame ${panel === "cart" ? "is-active" : ""}`}
          onClick={openCart}
          aria-label={`Savat, ${cartCount} ta mahsulot`}
        >
          <ShoppingBag size={18} strokeWidth={1.8} />
          <span className="cart-frame-label">Savat</span>
          {cartCount > 0 && <span className="action-badge">{cartCount}</span>}
        </button>
      </div>
    </header>
  );
}
