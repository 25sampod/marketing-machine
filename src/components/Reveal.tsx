"use client";

import React, { CSSProperties, ReactNode } from "react";
import { useInView } from "@/hooks/useInView";

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Extra CSS class for the animation variant: 'reveal', 'reveal-left', 'reveal-right', 'reveal-stagger' */
  variant?: "reveal" | "reveal-left" | "reveal-right" | "reveal-stagger";
  /** Transition delay in milliseconds */
  delay?: number;
  style?: CSSProperties;
  as?: React.ElementType;
}

/**
 * Wraps any content in an IntersectionObserver-driven entrance animation.
 * Server components can safely pass children to this client component.
 */
export default function Reveal({
  children,
  className = "",
  variant = "reveal",
  delay,
  style,
  as: Tag = "div",
}: RevealProps) {
  const [ref, isInView] = useInView<HTMLDivElement>();

  const combinedStyle: CSSProperties = {
    ...style,
    ...(delay !== undefined ? { transitionDelay: `${delay}ms` } : {}),
  };

  return (
    <Tag
      ref={ref}
      className={`${variant} ${isInView ? "in-view" : ""} ${className}`}
      style={combinedStyle}
    >
      {children}
    </Tag>
  );
}
