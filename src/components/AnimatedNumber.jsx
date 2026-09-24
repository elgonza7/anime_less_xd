import { useEffect, useRef, useState } from "react";

// cuenta desde 0 hasta `value` cuando `active` pasa a true, tipo cronometro.
export default function AnimatedNumber({ value, active, duration = 1200, decimals = 0 }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef();

  useEffect(() => {
    if (!active) {
      setDisplay(0);
      return undefined;
    }

    const start = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) * (1 - t); // ease-out
      setDisplay(value * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, value, duration]);

  return <>{display.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</>;
}
