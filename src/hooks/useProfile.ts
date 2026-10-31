import { useState, useEffect } from "react";
import type { Profile } from "../types/store";

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(() => {
    try {
      const stored = localStorage.getItem("store-profile") || localStorage.getItem("dreemroom-profile");
      return stored ? (JSON.parse(stored) as Profile) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (profile) {
        localStorage.setItem("store-profile", JSON.stringify(profile));
      } else {
        localStorage.removeItem("store-profile");
        localStorage.removeItem("dreemroom-profile");
      }
    } catch {
      /* Profil saqlanmasa ham xarid oqimi ishlayveradi */
    }
  }, [profile]);

  return [profile, setProfile] as const;
}
