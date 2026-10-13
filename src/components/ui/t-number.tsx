import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** transitions.dev "number pop-in": each char pops in on mount and when the value changes. */
export function TNumber({ value, className }: { value: string | number; className?: string }) {
  const text = String(value);
  const prev = useRef(text);
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (prev.current === text) return;
    prev.current = text;
    setRun((r) => r + 1);
  }, [text]);

  const chars = text.split("");
  return (
    <span key={run} className={cn("t-digit-group is-animating", className)}>
      {chars.map((ch, i) => (
        <span
          key={i}
          className="t-digit"
          data-stagger={i === chars.length - 2 ? "1" : i === chars.length - 1 ? "2" : undefined}
        >
          {ch}
        </span>
      ))}
    </span>
  );
}
