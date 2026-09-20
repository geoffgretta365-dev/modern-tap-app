import type { SVGProps } from "react";

export default function ModernTapMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" width="32" height="32" fill="none" role="img" aria-label="ModernTap phone and NFC mark" {...props}>
      <g transform="rotate(-12 21 25)">
        <rect x="10" y="6" width="23" height="37" rx="5" fill="#17324d" stroke="#dffaf8" strokeWidth="1.5" />
        <rect x="13" y="11" width="17" height="25" rx="2" fill="#16c7c0" />
        <circle cx="21.5" cy="39" r="1.5" fill="#dffaf8" />
      </g>
      <path d="M34 17c3 1 5 3 6 6M35 11c5 1 9 5 11 10" stroke="#16c7c0" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
