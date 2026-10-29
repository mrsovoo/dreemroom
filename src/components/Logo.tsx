type LogoProps = {
  className?: string;
};

export default function Logo({ className = "" }: LogoProps) {
  return (
    <div className={`velvorn-brand-mark ${className}`}>
      <span className="velvorn-symbol" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
          <rect x="2" y="2" width="16" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="2.4" />
          <polygon points="2,2 18,2 2,18" fill="currentColor" />
        </svg>
      </span>
      <span className="velvorn-wordmark">VELVORN</span>
    </div>
  );
}
