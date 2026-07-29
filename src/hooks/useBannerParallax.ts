import { useEffect, useRef, useCallback } from "react";

export function useBannerParallax() {
  const bannerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const banner = bannerRef.current;
    if (!banner) return;

    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 768px)");
    if (!mq.matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const img = banner.querySelector("img");
    if (!img) return;

    let raf: number;
    let lastScrollY = 0;

    const handleScroll = () => {
      if (Math.abs(window.scrollY - lastScrollY) < 2) return;
      lastScrollY = window.scrollY;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = banner.getBoundingClientRect();
        const offset = Math.max(0, -rect.top);
        img.style.transform = `translateY(${offset * 0.3}px)`;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return bannerRef;
}
