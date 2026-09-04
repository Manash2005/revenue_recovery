import React, { useEffect, useState, useRef } from "react";

/**
 * useCountUp — animates a number from 0 → target over `duration` ms.
 * Pure React, no external deps.
 */
export function useCountUp(target, duration = 1800) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
    if (target === 0) return;
    startRef.current = null;

    const step = (timestamp) => {
      if (!startRef.current) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}

/**
 * useBarWidth — animates bar width from 0 → target% on mount.
 */
export function useBarWidth(target, delay = 300, duration = 1800) {
  const [width, setWidth] = useState(0);
  const rafRef = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      startRef.current = null;
      const step = (ts) => {
        if (!startRef.current) startRef.current = ts;
        const progress = Math.min((ts - startRef.current) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setWidth(eased * target);
        if (progress < 1) rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    }, delay);

    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(rafRef.current);
    };
  }, [target, delay, duration]);

  return width;
}
