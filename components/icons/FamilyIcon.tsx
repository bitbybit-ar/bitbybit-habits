import type { IconProps } from "./types";

export function FamilyIcon({ size = 24, className, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 10.5L12 3l9 7.5" />
      <path d="M5 9.5V19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
      <path d="M12 13.5c-1.1 0-2-.6-2-1.5s.9-1.5 2-1.5 2 .6 2 1.5c0 1.5-2 2.5-2 2.5" fill={color} stroke="none" />
      <path d="M12 11a2.5 2.5 0 0 1 2.5 2c0 1.5-2.5 3-2.5 3s-2.5-1.5-2.5-3A2.5 2.5 0 0 1 12 11z" />
    </svg>
  );
}
