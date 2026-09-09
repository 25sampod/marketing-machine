"use client";

import { useEffect } from "react";

/**
 * Ensures the page defaults to top on fresh load while preserving
 * anchor links (e.g. #pricing, #faq) when navigated to directly.
 */
export default function ScrollReset() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (!window.location.hash) {
        if ("scrollRestoration" in history) {
          history.scrollRestoration = "manual";
        }
        window.scrollTo(0, 0);
      }

      const handleBeforeUnload = () => {
        if (!window.location.hash) {
          window.scrollTo(0, 0);
        }
      };

      window.addEventListener("beforeunload", handleBeforeUnload);
      return () => {
        window.removeEventListener("beforeunload", handleBeforeUnload);
      };
    }
  }, []);

  return null;
}
