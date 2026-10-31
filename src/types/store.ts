export type Panel = "product" | "cart" | "profile" | "contact" | "wishlist" | "size-guide" | null;
export type View = "home" | "catalog" | "cart" | "profile" | "product";

export type CartItem = {
  id: string;
  size: string;
  quantity: number;
};

export type Profile = {
  name: string;
  phone: string;
  password?: string;
};

export type HeroSlide = {
  id?: string;
  src: string;
  alt?: string;
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  buttonText?: string;
};

export type SiteContacts = {
  phone: string;
  telegram: string;
  telegramUrl: string;
  instagram: string;
  instagramUrl: string;
  address: string;
  workHours: string;
  email: string;
  brandDesc: string;
};

