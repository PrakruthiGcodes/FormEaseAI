import Logo from './Logo.jsx'
import StatusBadge from './StatusBadge.jsx'
import { LANGUAGES } from '../utils/languages.js'

// Top bar: logo, language selector, read-aloud toggle, and backend status.
export default function Header({
  language,
  onLanguageChange,
  backend,
  onRetry,
  speakReplies,
  onToggleSpeak,
  speechOutputSupported,
}) {
  return (
    <header className="app-header">
      <Logo />
      <div className="header-controls">
        <label className="language-select">
          <span className="visually-hidden">Preferred language</span>
          <select value={language} onChange={(event) => onLanguageChange(event.target.value)}>
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </label>

        <label className={`speak-toggle ${speechOutputSupported ? '' : 'speak-toggle-disabled'}`}>
          <input
            type="checkbox"
            checked={speakReplies && speechOutputSupported}
            disabled={!speechOutputSupported}
            onChange={(event) => onToggleSpeak(event.target.checked)}
          />
          <span>
            {speechOutputSupported ? 'Read replies aloud' : 'Read aloud not supported'}
          </span>
        </label>

        <StatusBadge
          state={backend.state}
          info={backend.info}
          error={backend.error}
          onRetry={onRetry}
        />
      </div>
    </header>
  )
}
