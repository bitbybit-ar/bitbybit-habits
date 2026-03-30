import type { IconProps } from "./types";

export function NostrichIcon({ size = 24, className, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* Head */}
      <ellipse cx="12" cy="9" rx="5.5" ry="6" stroke={color} strokeWidth="1.5" />
      {/* Eye */}
      <circle cx="13.5" cy="8" r="1.2" fill={color} />
      {/* Eye shine */}
      <circle cx="14" cy="7.5" r="0.4" fill="var(--color-bg, #0f0f18)" />
      {/* Beak */}
      <path d="M17.5 9.5 L22 10.5 L17.5 11.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Body */}
      <path d="M8.5 14.5 Q12 18 15.5 14.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none" />
      {/* Legs */}
      <path d="M10 17.5 L9 21 L7.5 21 M10 17.5 L10.5 21 " stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 17.5 L13.5 21 M14 17.5 L15 21 L16.5 21" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
