/**
 * Lente — identidade do B3H31D. Reusada no SiteHeader (size 260) e na view
 * MeetB3 no mesmo tamanho. currentColor permite herdar --lens ou outra cor
 * de contexto.
 */
export function LensLogo({ size = 260 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 240 100"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Beheld lens logo"
      width={size}
      height={(size * 100) / 240}
      style={{ color: "var(--lens)" }}
    >
      <g stroke="currentColor" strokeWidth={1} opacity={0.35} strokeLinecap="round">
        <line x1="16" y1="50" x2="28" y2="50" />
        <line x1="212" y1="50" x2="224" y2="50" />
      </g>
      <path d="M 60 24 Q 40 50 60 76" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
      <path d="M 180 24 Q 200 50 180 76" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
      <line x1="66" y1="50" x2="174" y2="50" stroke="currentColor" strokeWidth={1} strokeDasharray="2 6" opacity={0.45} />
      <circle cx="120" cy="50" r="14" fill="none" stroke="currentColor" strokeWidth={1.5} />
      <circle cx="120" cy="50" r="4" fill="currentColor" />
    </svg>
  );
}
