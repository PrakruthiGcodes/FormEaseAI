import { useState } from 'react'
import Logo from './Logo.jsx'
import StatusBadge from './StatusBadge.jsx'
import { LANGUAGES } from '../utils/languages.js'

// Top bar: logo, language selector, accessibility controls (High-Contrast, Slow Voice, Hands-Free, Guided View), read-aloud toggle, text zoom, privacy shield, lock curtain, kiosk wipe, and backend status.
export default function Header({
  language,
  onLanguageChange,
  backend,
  onRetry,
  speakReplies,
  onToggleSpeak,
  speechOutputSupported,
  largeText,
  onToggleLargeText,
  privacyMask = true,
  onTogglePrivacyMask,
  onLockScreen,
  onFinishAndErase,
  activePin = null,
  highContrast = false,
  onToggleHighContrast,
  slowVoice = false,
  onToggleSlowVoice,
  handsFreeMode = false,
  onToggleHandsFree,
  guidedMode = false,
  onToggleGuidedMode,
}) {
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)

  return (
    <header className="app-header">
      <Logo />

      <div className="header-controls">
        {/* Preferred Language Selector */}
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

        {/* View Mode: Guided Voice vs Chat View */}
        <button
          type="button"
          className={`header-btn header-mode-toggle ${guidedMode ? 'header-btn-active' : ''}`}
          onClick={onToggleGuidedMode}
          title={guidedMode ? 'Switch to Standard Chat View' : 'Switch to One-Question Guided Voice View'}
          aria-pressed={guidedMode}
        >
          <span className="header-btn-icon" aria-hidden="true">{guidedMode ? '🎙️' : '💬'}</span>
          <span>{guidedMode ? 'Guided View' : 'Chat View'}</span>
        </button>

        {/* High-Contrast Mode for Visually Impaired */}
        <button
          type="button"
          className={`header-btn ${highContrast ? 'header-btn-active high-contrast-active' : ''}`}
          onClick={onToggleHighContrast}
          title="Toggle High-Contrast yellow-on-black theme for visually impaired users"
          aria-pressed={highContrast}
        >
          <span className="header-btn-icon" aria-hidden="true">👁️</span>
          <span>{highContrast ? 'Contrast ON' : 'High Contrast'}</span>
        </button>

        {/* Slow Voice (0.75x) for Rural & Elderly */}
        <button
          type="button"
          className={`header-btn ${slowVoice ? 'header-btn-active' : ''}`}
          onClick={onToggleSlowVoice}
          title="Slow down spoken speech to 0.75x speed for clearer listening"
          aria-pressed={slowVoice}
        >
          <span className="header-btn-icon" aria-hidden="true">🐢</span>
          <span>{slowVoice ? 'Slow 0.75x' : '1.0x Voice'}</span>
        </button>

        {/* Hands-Free Voice-to-Voice Loop */}
        <button
          type="button"
          className={`header-btn ${handsFreeMode ? 'header-btn-active hands-free-active' : ''}`}
          onClick={onToggleHandsFree}
          title="Hands-Free Loop: automatically opens microphone after reading assistant replies"
          aria-pressed={handsFreeMode}
        >
          <span className="header-btn-icon" aria-hidden="true">🔁</span>
          <span>{handsFreeMode ? 'Hands-Free ON' : 'Hands-Free'}</span>
        </button>

        {/* Elderly text zoom */}
        <button
          type="button"
          className={`large-text-btn ${largeText ? 'active' : ''}`}
          onClick={onToggleLargeText}
          title="Toggle larger, clearer text for elderly users"
          aria-pressed={largeText}
        >
          <span className="large-text-badge">A+</span>
          <span>{largeText ? 'Normal text' : 'Large text'}</span>
        </button>

        {/* Privacy Mask Toggle */}
        <button
          type="button"
          className={`header-btn ${privacyMask ? 'header-btn-shield-on' : 'header-btn-shield-off'}`}
          onClick={onTogglePrivacyMask}
          title={privacyMask ? 'PII masking active (names, phones, emails hidden)' : 'PII masking turned off'}
          aria-pressed={privacyMask}
        >
          <span className="header-btn-icon" aria-hidden="true">🛡️</span>
          <span>{privacyMask ? 'Masking ON' : 'Masking OFF'}</span>
        </button>

        {/* Privacy Info Modal Trigger */}
        <button
          type="button"
          className="header-btn header-btn-info"
          onClick={() => setShowPrivacyModal(true)}
          title="View Privacy Shield & Security Architecture"
        >
          <span className="header-btn-icon" aria-hidden="true">ℹ️</span>
          <span>Privacy Shield</span>
        </button>

        {/* Lock Screen Button */}
        <button
          type="button"
          className="header-btn header-btn-lock"
          onClick={onLockScreen}
          title="Lock screen curtain immediately"
        >
          <span className="header-btn-icon" aria-hidden="true">🔒</span>
          <span>Lock</span>
        </button>

        {/* Active Session PIN badge */}
        {activePin && (
          <span className="header-session-pin-badge" title="Your 4-digit PIN to unlock if the screen locks">
            🔑 PIN: <strong>{activePin}</strong>
          </span>
        )}

        {/* Read aloud toggle */}
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

        {/* Finish & Erase Kiosk Wipe */}
        <button
          type="button"
          className="header-btn header-btn-erase"
          onClick={onFinishAndErase}
          title="Finish & Erase My Data: clears active memory, rotates session token, and resets kiosk"
        >
          <span className="header-btn-icon" aria-hidden="true">🗑️</span>
          <span>Finish & Erase</span>
        </button>

        <StatusBadge
          state={backend.state}
          info={backend.info}
          error={backend.error}
          onRetry={onRetry}
        />
      </div>

      {/* Privacy Shield Info Modal */}
      {showPrivacyModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="privacy-modal-title">
          <div className="modal-dialog privacy-shield-modal">
            <div className="modal-header">
              <h2 id="privacy-modal-title">🛡️ FormEase AI Privacy Shield</h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowPrivacyModal(false)}
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>
            <div className="modal-content">
              <p className="privacy-modal-intro">
                FormEase AI is designed for public community centers and shared kiosks with strict privacy isolation:
              </p>
              <ul className="privacy-shield-list">
                <li>
                  <strong>🔒 Fernet 256-Bit AES Encryption at Rest:</strong> All citizen responses, demographic values, and domain fields are encrypted with rotating keys before writing to MongoDB.
                </li>
                <li>
                  <strong>🔑 SHA-256 Per-Session Token Isolation:</strong> Form listings strictly filter by SHA-256 hashed ephemeral session tokens. Other citizens’ records are completely invisible.
                </li>
                <li>
                  <strong>🛡️ Salted PBKDF2 PIN & Collision-Free Codes:</strong> Resuming forms across kiosk days requires a 4-digit PIN verified via PBKDF2-HMAC-SHA256 (100,000 iterations) with collision-checked <code>FE-XXXX</code> reference codes and 5-minute brute-force lockout.
                </li>
                <li>
                  <strong>🚫 Zero PII Telemetry:</strong> System logs scrub full names, dates of birth, phone numbers, and addresses to protect citizen identity.
                </li>
                <li>
                  <strong>⏱️ Automatic Lock Curtain & Kiosk Wipe:</strong> Screens automatically blur after 90 seconds of inactivity. Citizens can tap to resume or click “Finish & Erase” at any time to wipe local state and rotate session credentials.
                </li>
              </ul>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="small-button primary"
                onClick={() => setShowPrivacyModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
