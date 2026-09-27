import { KING, labelFor } from "@/lib/game/pieces";

/** Writes √n with a real radical bar over n, a plain number for perfect squares, and 1 with a crown for the king. */
export function PieceLabel({ n }: { n: number }) {
  if (n === KING) {
    return (
      <span className="relative inline-flex flex-col items-center leading-none">
        <Crown className="mb-[0.05em] h-[0.55em] w-[0.8em]" />
        <span>1</span>
      </span>
    );
  }
  const label = labelFor(n);
  if (!label.startsWith("√")) return <span>{label}</span>;
  return (
    <span className="inline-flex items-start leading-none">
      <span className="text-[0.9em]">√</span>
      <span className="radical-bar pt-[0.06em]">{label.slice(1)}</span>
    </span>
  );
}

export function Crown({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 16" className={className} aria-hidden fill="currentColor">
      <path d="M2 14 L1 3 L7 8 L12 1 L17 8 L23 3 L22 14 Z" />
    </svg>
  );
}
