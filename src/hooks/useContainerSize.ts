import { useRef, useState, useEffect, useCallback } from 'react';

interface ContainerSize {
  ref: React.RefCallback<HTMLElement>;
  width: number;
  height: number;
}

export function useContainerSize(): ContainerSize {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const observerRef = useRef<ResizeObserver | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  const ref = useCallback((node: HTMLElement | null) => {
    if (elementRef.current === node) {
      return;
    }
    observerRef.current?.disconnect();
    elementRef.current = node;

    if (!node) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        setSize((prev) => {
          if (prev.width === Math.round(width) && prev.height === Math.round(height)) {
            return prev;
          }
          return { width: Math.round(width), height: Math.round(height) };
        });
      }
    });
    observer.observe(node);
    observerRef.current = observer;
  }, []);

  return { ref, width: size.width, height: size.height };
}
