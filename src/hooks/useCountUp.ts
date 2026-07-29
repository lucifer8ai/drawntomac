import { useEffect, useState, useRef } from "react";

export function useCountUp(target: number, duration = 800) {
  const [count, setCount] = useState(0);
  const previousTarget = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reducedMotion || target === previousTarget.current) {
      setCount(target);
      previousTarget.current = target;
      return;
    }
    previousTarget.current = target;

    if (target === 0) {
      setCount(0);
      return;
    }

    let start: number | null = null;
    let raf: number;

    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      setCount(Math.round((1 - Math.pow(1 - progress, 3)) * target));
      if (progress < 1) raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return count;
}
