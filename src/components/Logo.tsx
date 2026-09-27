/** A radical sign drawn over a 2×2 chequer: maths on a chessboard. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect x="4" y="4" width="12" height="12" fill="var(--sq-light)" />
      <rect x="16" y="4" width="12" height="12" fill="var(--sq-dark)" />
      <rect x="4" y="16" width="12" height="12" fill="var(--sq-dark)" />
      <rect x="16" y="16" width="12" height="12" fill="var(--sq-light)" />
      <path
        d="M2 19 L7 17 L12 28 L19 3 L31 3"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
