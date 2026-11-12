// FormEase AI logo: a blue-to-purple gradient tile with a form icon, plus the name.
export default function Logo() {
  return (
    <div className="logo" aria-label="FormEase AI logo">
      <svg className="logo-mark" viewBox="0 0 40 40" aria-hidden="true">
        <defs>
          <linearGradient id="formease-gradient" x1="0" y1="0" x2="40" y2="40">
            <stop offset="0" stopColor="#2563eb" />
            <stop offset="1" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
        <rect width="40" height="40" rx="10" fill="url(#formease-gradient)" />
        <rect x="11" y="10" width="18" height="20" rx="3" fill="none" stroke="#fff" strokeWidth="2" />
        <line x1="15" y1="16" x2="25" y2="16" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        <line x1="15" y1="21" x2="22" y2="21" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className="logo-text">
        FormEase <span className="logo-accent">AI</span>
      </span>
    </div>
  )
}
