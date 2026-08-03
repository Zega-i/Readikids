import { useMemo } from 'react';

/**
 * Background starfield decoration.
 * Uses pseudo-random generation to maintain absolute positioning only for decorative elements.
 */
export function StarField({ count = 30 }: { count?: number }) {
  const stars = useMemo(() => {
    const seed = [23, 47, 71, 13, 59, 83, 31, 67, 19, 41];
    return Array.from({ length: count }, (_, i) => ({
      left: `${(seed[i % seed.length] * (i + 1) * 7) % 100}%`,
      top: `${(seed[(i + 3) % seed.length] * (i + 1) * 11) % 100}%`,
      size: (i % 3) + 1,
      opacity: [0.2, 0.4, 0.6, 0.8][i % 4],
      delay: `${(i * 0.3).toFixed(1)}s`,
    }));
  }, [count]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {stars.map((s, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white animate-pulse"
          style={{
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            opacity: s.opacity,
            animationDelay: s.delay,
            animationDuration: `${2 + (i % 3)}s`,
          }}
        />
      ))}
    </div>
  );
}
