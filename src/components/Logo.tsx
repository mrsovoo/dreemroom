import React, { useState } from "react";
import { getBrandConfig } from "../config/brandConfig";

type LogoProps = {
  className?: string;
  style?: React.CSSProperties;
  showTextFallback?: boolean;
};

export default function Logo({ className = "", style, showTextFallback = true }: LogoProps) {
  const [hasError, setHasError] = useState(false);
  const config = getBrandConfig();

  // Agar rasm yuklanmasa yoki configda rasm bo'lmasa, matnli chiroyli brend nomi chiqadi
  if (hasError || !config.logo) {
    if (!showTextFallback) return null;
    return (
      <span
        className={`brand-title-fallback font-bold tracking-wider ${className}`}
        style={{
          fontFamily: "var(--font-heading, serif)",
          fontSize: "19px",
          letterSpacing: "0.08em",
          color: "currentColor",
          display: "inline-block",
          textTransform: "uppercase",
          ...style,
        }}
        aria-label={config.brandName}
      >
        {config.brandName}
      </span>
    );
  }

  return (
    <img
      src={config.logo}
      alt={config.brandName}
      className={`brand-logo-img ${className}`}
      style={{
        height: "22px",
        width: "auto",
        maxWidth: "185px",
        objectFit: "contain",
        display: "block",
        ...style,
      }}
      onError={() => setHasError(true)}
      aria-label={config.brandName}
    />
  );
}
