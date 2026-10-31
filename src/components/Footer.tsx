import React from "react";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import Logo from "./Logo";
import type { SiteContacts } from "../types/store";
import { getBrandConfig } from "../config/brandConfig";

type FooterProps = {
  siteContacts: SiteContacts;
  goHome: () => void;
  openCatalog: () => void;
  openCart: () => void;
  openContact: () => void;
  openProfile: () => void;
  openWishlist: () => void;
  openSizeGuide: () => void;
};

export default function Footer({
  siteContacts,
  goHome,
  openCatalog,
  openCart,
  openContact,
  openProfile,
  openWishlist,
  openSizeGuide,
}: FooterProps) {
  const config = getBrandConfig();

  return (
    <footer className="footer velvorn-footer" id="contact">
      <div className="velvorn-footer-grid">
        <div className="footer-col col-brand">
          <Logo style={{ height: "26px", marginBottom: "14px" }} />
          <p className="footer-tagline">
            {siteContacts.brandDesc || config.footer?.description || config.tagline}
          </p>
          <div className="footer-social-icons">
            {siteContacts.telegramUrl && (
              <a href={siteContacts.telegramUrl} target="_blank" rel="noopener noreferrer" aria-label="Telegram">
                <MessageCircle size={17} />
              </a>
            )}
            {siteContacts.instagramUrl && (
              <a href={siteContacts.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <span className="footer-ig-text">IG</span>
              </a>
            )}
            {siteContacts.email && (
              <a href={`mailto:${siteContacts.email}`} aria-label="Email">
                <Mail size={17} />
              </a>
            )}
          </div>
        </div>

        <div className="footer-col">
          <h3 className="footer-col-title">Bo'limlar</h3>
          <ul className="footer-links">
            <li><button onClick={goHome}>Asosiy sahifa</button></li>
            <li><button onClick={() => openCatalog()}>Katalog</button></li>
            <li>
              <button
                onClick={() => {
                  const el = document.getElementById("ommabop-toplamlar");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                  else openCatalog();
                }}
              >
                Ommabop to'plamlar
              </button>
            </li>
            <li><button onClick={openWishlist}>Sevimlilar</button></li>
            <li><button onClick={openCart}>Savat</button></li>
          </ul>
        </div>

        <div className="footer-col">
          <h3 className="footer-col-title">Mijozlarga yordam</h3>
          <ul className="footer-links">
            <li><button onClick={openContact}>Biz bilan bog'lanish</button></li>
            <li><button onClick={openProfile}>Mening profilim</button></li>
            <li><button onClick={openContact}>To'lov va xarid shartlari</button></li>
            <li><button onClick={openSizeGuide}>O'lchamlar jadvali</button></li>
          </ul>
        </div>

        <div className="footer-col col-contact-info">
          <h3 className="footer-col-title">Aloqa</h3>
          <div className="footer-contact-items">
            {siteContacts.phone && (
              <a href={`tel:${siteContacts.phone.replace(/[^0-9+]/g, "")}`} className="footer-contact-link">
                <Phone size={15} />
                <span>{siteContacts.phone}</span>
              </a>
            )}
            {siteContacts.telegramUrl && (
              <a href={siteContacts.telegramUrl} target="_blank" rel="noopener noreferrer" className="footer-contact-link">
                <MessageCircle size={15} />
                <span>Telegram: {siteContacts.telegram}</span>
              </a>
            )}
            {siteContacts.address && (
              <div className="footer-contact-link">
                <MapPin size={15} />
                <span>{siteContacts.address}</span>
              </div>
            )}
            {siteContacts.workHours && (
              <p className="footer-work-hours">Ish vaqti: {siteContacts.workHours}</p>
            )}
          </div>
        </div>
      </div>

      <div className="velvorn-footer-bottom">
        <p>© {new Date().getFullYear()} {config.brandName} — {config.footer?.copyright || "Barcha huquqlar himoyalangan."}</p>
      </div>
    </footer>
  );
}

