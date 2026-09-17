import { useState } from "react";

type Props = {
  className?: string;
  alt?: string;
};

/** App mark: user-provided JPG in /public when present, else inline Taxfix-style fallback. */
export function AppLogo({ className = "h-10 w-10", alt = "Spend" }: Props) {
  const [useFallback, setUseFallback] = useState(false);

  if (useFallback) {
    return (
      <svg
        className={className}
        viewBox="0 0 64 64"
        xmlns="http://www.w3.org/2000/svg"
        aria-label={alt}
        role="img"
      >
        <rect width="64" height="64" rx="14" fill="#36893B" />
        <text
          x="32"
          y="40"
          textAnchor="middle"
          fontFamily="system-ui, sans-serif"
          fontSize="28"
          fontWeight="700"
          fill="#ECFFC7"
        >
          %
        </text>
      </svg>
    );
  }

  return (
    <img
      src="/logo.jpg"
      alt={alt}
      className={`object-cover ${className}`}
      onError={() => setUseFallback(true)}
    />
  );
}
