import React from "react";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import Sheet from "../Sheet";
import type { SiteContacts } from "../../types/store";
import { getBrandConfig } from "../../config/brandConfig";

type ContactModalProps = {
  isOpen: boolean;
  onClose: () => void;
  siteContacts: SiteContacts;
};

export default function ContactModal({ isOpen, onClose, siteContacts }: ContactModalProps) {
  if (!isOpen) return null;
  const config = getBrandConfig();

  return (
    <Sheet key="contact" title="Biz bilan bog'lanish" onClose={onClose}>
      <div className="contact-sheet">
        <div className="contact-card">
          <h3>{config.brandName}</h3>
          <p className="contact-desc">
            Savollaringiz, takliflaringiz yoki buyurtma bo'yicha yordam kerak bo'lsa, biz bilan bog'laning.
          </p>
          <div className="contact-list">
            {siteContacts.phone && (
              <a href={`tel:${siteContacts.phone.replace(/[^0-9+]/g, "")}`} className="contact-item">
                <span className="contact-icon"><Phone size={18} /></span>
                <div>
                  <strong>Telefon</strong>
                  <span>{siteContacts.phone}</span>
                </div>
              </a>
            )}
            {siteContacts.telegramUrl && (
              <a href={siteContacts.telegramUrl} target="_blank" rel="noreferrer" className="contact-item">
                <span className="contact-icon"><MessageCircle size={18} /></span>
                <div>
                  <strong>Telegram (Qo'llab-quvvatlash)</strong>
                  <span>{siteContacts.telegram}</span>
                </div>
              </a>
            )}
            {siteContacts.email && (
              <a href={`mailto:${siteContacts.email}`} className="contact-item">
                <span className="contact-icon"><Mail size={18} /></span>
                <div>
                  <strong>Elektron pochta</strong>
                  <span>{siteContacts.email}</span>
                </div>
              </a>
            )}
            {siteContacts.address && (
              <div className="contact-item">
                <span className="contact-icon"><MapPin size={18} /></span>
                <div>
                  <strong>Manzil</strong>
                  <span>{siteContacts.address}</span>
                </div>
              </div>
            )}
          </div>
          {siteContacts.phone && (
            <div className="contact-actions">
              <a href={`tel:${siteContacts.phone.replace(/[^0-9+]/g, "")}`} className="btn btn-full">
                Qo'ng'iroq qilish
                <Phone size={16} />
              </a>
            </div>
          )}
        </div>
      </div>
    </Sheet>
  );
}

