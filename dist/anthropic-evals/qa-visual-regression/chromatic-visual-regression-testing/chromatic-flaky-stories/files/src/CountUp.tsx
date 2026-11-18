import { useEffect, useState } from 'react';
// Animates a number from 0 to `value` with requestAnimationFrame over 2 seconds.
export function CountUp({ value }: { value: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let id = requestAnimationFrame(function tick(t) {
      const p = Math.min((t - start) / 2000, 1);
      setN(Math.round(value * p));
      if (p < 1) id = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(id);
  }, [value]);
  return <span className="count">{n}</span>;
}
