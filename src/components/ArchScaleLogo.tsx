import React from "react";

interface ArchScaleLogoProps {
  className?: string;
  size?: number;
  alt?: string;
}

export default function ArchScaleLogo({
  className = "w-6 h-6",
  size = 24,
  alt = "ArchScale Logo",
}: ArchScaleLogoProps) {
  return (
    <img
      src="/icon.png"
      alt={alt}
      width={size}
      height={size}
      className={`rounded-md shadow-2xs shrink-0 object-cover select-none ${className}`}
      loading="eager"
    />
  );
}
