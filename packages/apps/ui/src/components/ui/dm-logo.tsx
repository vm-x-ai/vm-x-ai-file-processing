import React from 'react';

interface DMLogoProps {
  className?: string;
  size?: number;
}

export function DMLogo({ className = '', size = 32 }: DMLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer rounded rectangle with light border */}
      <rect
        x="2"
        y="2"
        width="96"
        height="96"
        rx="16"
        ry="16"
        fill="#f8f9fa"
        stroke="#e9ecef"
        strokeWidth="1"
      />

      {/* Blue D shape - elliptical right half */}
      <path
        d="M 15 15 
           L 45 15 
           Q 85 15 85 50
           Q 85 85 45 85
           L 15 85
           Z"
        fill="#1e40af"
      />

      {/* White M letter */}
      <text
        x="47"
        y="65"
        textAnchor="middle"
        fill="white"
        fontSize="42"
        fontWeight="900"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        M
      </text>
    </svg>
  );
}
