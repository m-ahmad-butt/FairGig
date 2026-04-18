export default function FairGigLogo({
  size = 36,
  showWordmark = true,
  className = '',
  wordmarkClassName = 'text-xl font-bold tracking-tight text-zinc-900',
  ariaLabel = 'FairGig'
}) {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`} aria-label={ariaLabel}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-hidden="true"
      >
        <rect x="1" y="1" width="38" height="38" rx="9" fill="#050505" />
        <path
          d="M11 20C11 15.03 15.03 11 20 11C24.97 11 29 15.03 29 20C29 24.97 24.97 29 20 29C15.03 29 11 24.97 11 20Z"
          stroke="#F5F5F5"
          strokeWidth="2.4"
        />
        <path d="M11 20H20.5" stroke="#F5F5F5" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="20.5" cy="15.2" r="1.9" fill="#F5F5F5" />
      </svg>

      {showWordmark && <span className={wordmarkClassName}>FairGig</span>}
    </div>
  );
}
