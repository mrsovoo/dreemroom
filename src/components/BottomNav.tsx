import React from "react";
import { Grid2X2, Home, ShoppingBag, UserRound } from "lucide-react";
import type { Profile, View, Panel } from "../types/store";

type BottomNavProps = {
  view: View;
  panel: Panel;
  cartCount: number;
  profile: Profile | null;
  goHome: () => void;
  openCatalog: () => void;
  goCart: () => void;
  goProfile: () => void;
};

export default function BottomNav({
  view,
  panel,
  cartCount,
  profile,
  goHome,
  openCatalog,
  goCart,
  goProfile,
}: BottomNavProps) {
  if (view === "product") return null;

  return (
    <nav className="tabbar" aria-label="Mobil navigatsiya">
      <button
        className={view === "home" && !panel ? "tab is-active" : "tab"}
        onClick={goHome}
        aria-label="Asosiy"
      >
        <span className="tab-icon">
          <Home size={21} strokeWidth={1.8} />
        </span>
        <span className="tab-label">Asosiy</span>
      </button>

      <button
        className={view === "catalog" && !panel ? "tab is-active" : "tab"}
        onClick={() => openCatalog()}
        aria-label="Katalog"
      >
        <span className="tab-icon">
          <Grid2X2 size={21} strokeWidth={1.8} />
        </span>
        <span className="tab-label">Katalog</span>
      </button>

      <button
        className={view === "cart" || panel === "cart" ? "tab is-active" : "tab"}
        onClick={goCart}
        aria-label="Savat"
      >
        <span className="tab-icon">
          <ShoppingBag size={21} strokeWidth={1.8} />
          {cartCount > 0 && <span className="tab-badge">{cartCount}</span>}
        </span>
        <span className="tab-label">Savat</span>
      </button>

      <button
        className={view === "profile" || panel === "profile" ? "tab is-active" : "tab"}
        onClick={goProfile}
        aria-label="Profil"
      >
        <span className="tab-icon">
          {profile && profile.name.trim() ? (
            <span className="tab-initial-badge">
              {profile.name.trim().charAt(0).toUpperCase()}
            </span>
          ) : (
            <UserRound size={21} strokeWidth={1.8} />
          )}
        </span>
        <span className="tab-label">Profil</span>
      </button>
    </nav>
  );
}

