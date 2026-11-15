type Ornament = 'star' | 'moon' | 'music';

/** Original UI ornaments. Decorative only: never market indicators or controls. */
export default function Celestial({ kind = 'star', className = '' }: {
  kind?: Ornament;
  className?: string;
}) {
  const star = <path d="M24 4 Q26 21 44 24 Q26 27 24 44 Q22 27 4 24 Q22 21 24 4Z" />;
  return (
    <svg className={`celestial celestial-${kind} ${className}`} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      {kind === 'star' && <g fill="currentColor">{star}<circle cx="39" cy="9" r="1" /></g>}
      {kind === 'moon' && <>
        <path fill="currentColor" d="M32 5a20 20 0 1 0 9 31A18 18 0 0 1 32 5Z" />
        <path d="M13 15Q4 29 18 39" fill="none" stroke="#fff8ff" strokeWidth=".6" />
        <path fill="currentColor" d="M37 9q1 5 6 6-5 1-6 6-1-5-6-6 5-1 6-6" />
      </>}
      {kind === 'music' && <>
        <g stroke="currentColor" fill="none" strokeWidth=".8"><circle cx="24" cy="24" r="20" /><circle cx="24" cy="24" r="16" strokeDasharray="1 4" />
        <path d="M20 30V15l13-3v15M20 19l13-3" /></g>
        <g fill="currentColor"><ellipse cx="16.5" cy="30" rx="4" ry="3" transform="rotate(-20 16.5 30)" /><ellipse cx="29.5" cy="27" rx="4" ry="3" transform="rotate(-20 29.5 27)" /></g>
      </>}
    </svg>
  );
}
