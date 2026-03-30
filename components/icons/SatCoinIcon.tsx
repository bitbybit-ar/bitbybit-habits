import type { IconProps } from "./types";

export function SatCoinIcon({ size = 24, className, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="11" stroke={color} strokeWidth="1.5" />
      <text x="12" y="16.5" textAnchor="middle" fontSize="14" fontWeight="bold" fill={color}>&#x20BF;</text>
    </svg>
  );
}
