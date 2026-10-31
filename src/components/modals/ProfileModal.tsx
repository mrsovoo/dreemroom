import React, { useState, useEffect, useRef } from "react";
import { Check, UserRound } from "lucide-react";
import Sheet from "../Sheet";
import type { Profile } from "../../types/store";
import { formatUzbekPhone, handlePhoneKeyDown, handlePhoneFocus } from "../../utils/phone";

type ProfileModalProps = {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile | null;
  onSaveProfile: (profile: Profile) => void;
  onClearProfile: () => void;
};

export default function ProfileModal({
  isOpen,
  onClose,
  profile,
  onSaveProfile,
  onClearProfile,
}: ProfileModalProps) {
  if (!isOpen) return null;

  const [name, setName] = useState(profile?.name || "");
  const [phone, setPhone] = useState(profile?.phone || "+998 ");
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setPhone(profile.phone);
    }
  }, [profile]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSaveProfile({ name: name.trim(), phone: phone.trim() });
  };

  return (
    <Sheet key="profile" title="Profil" onClose={onClose}>
      <div className="profile-sheet">
        <div className="profile-intro">
          <span className="profile-avatar" aria-hidden="true">
            {name ? (
              name.charAt(0).toUpperCase()
            ) : (
              <UserRound size={24} strokeWidth={1.5} />
            )}
          </span>
          <div>
            <h3>
              {profile ? "Ma'lumotlaringiz" : "Profilingizni yarating"}
            </h3>
            <p>Buyurtma berishda ma'lumotlar avtomatik to'ldiriladi.</p>
          </div>
        </div>
        <form ref={formRef} className="profile-form" onSubmit={handleSubmit}>
          <label>
            Ismingiz
            <input
              name="profile-name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ism va familiya"
              required
              data-autofocus
            />
          </label>
          <label>
            Telefon raqam
            <input
              name="profile-phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(formatUzbekPhone(e.target.value))}
              onKeyDown={handlePhoneKeyDown}
              onFocus={handlePhoneFocus}
              placeholder="+998 00 000 0000"
              required
            />
          </label>
          <button className="btn btn-full" type="submit">
            Profilni saqlash
            <Check size={17} strokeWidth={1.8} />
          </button>
        </form>
        {profile && (
          <button
            className="profile-clear"
            onClick={onClearProfile}
          >
            Saqlangan profilni o'chirish
          </button>
        )}
      </div>
    </Sheet>
  );
}

