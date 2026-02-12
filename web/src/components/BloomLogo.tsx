interface BloomLogoProps {
  size?: number;
  className?: string;
  color?: string;
}

export default function BloomLogo({
  size = 24,
  className = '',
  color = 'currentColor',
}: BloomLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Center dot */}
      <circle cx="32" cy="34" r="4" />
      {/* Top-left petal */}
      <ellipse cx="23" cy="25" rx="9" ry="11" transform="rotate(-30 23 25)" />
      {/* Top-right petal */}
      <ellipse cx="41" cy="25" rx="9" ry="11" transform="rotate(30 41 25)" />
      {/* Bottom-left petal */}
      <ellipse cx="21" cy="45" rx="9" ry="11" transform="rotate(30 21 45)" />
      {/* Bottom-right petal */}
      <ellipse cx="43" cy="45" rx="9" ry="11" transform="rotate(-30 43 45)" />
      {/* Checkmark on top */}
      <path
        d="M22 18 L30 28 L44 10"
        stroke={color}
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
