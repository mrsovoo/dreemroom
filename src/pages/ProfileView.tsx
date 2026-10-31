import React from "react";
import {
  ArrowRight,
  ChevronRight,
  Phone,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Trash2,
  UserRound,
} from "lucide-react";
import type { Profile } from "../types/store";
import { formatUzbekPhone, handlePhoneKeyDown, handlePhoneFocus } from "../utils/phone";
import { getBrandConfig } from "../config/brandConfig";

type ProfileViewProps = {
  profile: Profile | null;
  profileName: string;
  setProfileName: (val: string) => void;
  profilePhone: string;
  setProfilePhone: (val: string) => void;
  onSaveProfile: () => void;
  onClearProfile: () => void;
  goCart: () => void;
  openContact: () => void;
  openSizeGuide: () => void;
  cartCount: number;
};

export default function ProfileView({
  profile,
  profileName,
  setProfileName,
  profilePhone,
  setProfilePhone,
  onSaveProfile,
  onClearProfile,
  goCart,
  openContact,
  openSizeGuide,
  cartCount,
}: ProfileViewProps) {
  const config = getBrandConfig();

  return (
    <div className="page-profile-container">
      {!profile ? (
        /* RO'YXATDAN O'TISH FORMASI */
        <div className="profile-auth-screen">
          <div className="auth-card-hero">
            <div className="auth-icon-circle">
              <UserRound size={32} strokeWidth={1.8} />
            </div>
            <h1 className="auth-heading">Profil yaratish</h1>
            <p className="auth-subheading">
              Buyurtmalarni tez va oson rasmiylashtirish uchun ma'lumotlaringizni kiriting
            </p>
          </div>

          <div className="auth-card-body">
            <form
              className="auth-input-form"
              onSubmit={(e) => {
                e.preventDefault();
                onSaveProfile();
              }}
            >
              <div className="auth-field">
                <label className="auth-label">To'liq ismingiz</label>
                <div className="auth-input-wrap">
                  <input
                    type="text"
                    className="auth-text-input"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Masalan: Dilnoza Karimova"
                    required
                    autoComplete="name"
                  />
                </div>
              </div>

              <div className="auth-field">
                <label className="auth-label">Telefon raqamingiz</label>
                <div className="auth-input-wrap">
                  <input
                    type="tel"
                    className="auth-text-input"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(formatUzbekPhone(e.target.value))}
                    onKeyDown={handlePhoneKeyDown}
                    onFocus={handlePhoneFocus}
                    placeholder="+998 90 123 45 67"
                    required
                    autoComplete="tel"
                  />
                </div>
              </div>

              <button className="auth-submit-btn" type="submit">
                <span>Ro'yxatdan o'tish</span>
                <ArrowRight size={18} strokeWidth={2.2} />
              </button>
            </form>

            <div className="auth-trust-footer">
              <ShieldCheck size={15} />
              <span>Ma'lumotlaringiz maxfiy saqlanadi va begonalarga berilmaydi</span>
            </div>
          </div>
        </div>
      ) : (
        /* PROFIL SAHIFASI (Ro'yxatdan o'tgandan keyin) */
        <div className="profile-registered-view">
          <div className="page-profile-header">
            <div>
              <h1 className="page-profile-title">Profil</h1>
              <span className="page-profile-subtitle">Shaxsiy kabinet va sozlamalar</span>
            </div>
          </div>

          {/* Foydalanuvchi qisqa kartochkasi */}
          <div className="profile-identity-card">
            <div className="profile-identity-avatar">
              {profile.name.trim().charAt(0).toUpperCase()}
            </div>
            <div className="profile-identity-meta">
              <h2 className="profile-identity-name">{profile.name}</h2>
              <span className="profile-identity-phone">{profile.phone}</span>
              <span className="profile-identity-badge">{config.brandName} a'zosi</span>
            </div>
          </div>

          {/* Foydali bo'limlar */}
          <div className="profile-menu-card">
            <h3 className="profile-section-title">Foydali bo'limlar</h3>
            <div className="profile-menu-list">
              <button
                type="button"
                className="profile-menu-item"
                onClick={goCart}
              >
                <div className="menu-item-left">
                  <span className="menu-item-icon"><ShoppingBag size={18} /></span>
                  <div className="menu-item-text">
                    <strong>Mening savatim</strong>
                    <span>{cartCount > 0 ? `${cartCount} ta mahsulot bor` : "Hozircha bo'sh"}</span>
                  </div>
                </div>
                <ChevronRight size={17} className="menu-arrow" />
              </button>

              <button
                type="button"
                className="profile-menu-item"
                onClick={openContact}
              >
                <div className="menu-item-left">
                  <span className="menu-item-icon"><Phone size={18} /></span>
                  <div className="menu-item-text">
                    <strong>Biz bilan bog'lanish</strong>
                    <span>Qo'llab-quvvatlash xizmati</span>
                  </div>
                </div>
                <ChevronRight size={17} className="menu-arrow" />
              </button>

              <button
                type="button"
                className="profile-menu-item"
                onClick={openSizeGuide}
              >
                <div className="menu-item-left">
                  <span className="menu-item-icon"><SlidersHorizontal size={18} /></span>
                  <div className="menu-item-text">
                    <strong>O'lchamlar jadvali</strong>
                    <span>Standart o'lchamlar yo'riqnomasi</span>
                  </div>
                </div>
                <ChevronRight size={17} className="menu-arrow" />
              </button>
            </div>
          </div>

          {/* Profildan chiqish */}
          <div className="profile-logout-wrap">
            <button
              type="button"
              className="profile-logout-btn"
              onClick={onClearProfile}
            >
              <Trash2 size={16} />
              <span>Profildan chiqish / O'chirish</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
