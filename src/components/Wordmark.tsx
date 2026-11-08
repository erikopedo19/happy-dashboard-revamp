import { cn } from "@/lib/utils";

/** Brand wordmark: the first "z" is always rose red. */
export function Wordmark({ text = "Cutzioo", className }: { text?: string; className?: string }) {
  const i = text.search(/z/i);
  if (i < 0) return <span className={cn("font-cal", className)}>{text}</span>;
  return (
    <span className={cn("font-cal whitespace-nowrap", className)}>
      {text.slice(0, i)}
      <span className="text-[#FF2D46]">{text[i]}</span>
      {text.slice(i + 1)}
    </span>
  );
}
