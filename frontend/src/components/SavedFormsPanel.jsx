import { useEffect, useState } from 'react'
import { listSavedForms, unlockSavedForm } from '../services/api.js'

// Lists saved forms created in current session with frictionless 1-tap resumption,
// plus an optional secondary section for resuming past forms via Reference Code & PIN.
export default function SavedFormsPanel({ onResume, onNew, onClose }) {
  const [forms, setForms] = useState(null)
  const [error, setError] = useState('')
  const [refCode, setRefCode] = useState('')
  const [pin, setPin] = useState('')
  const [unlocking, setUnlocking] = useState(false)
  const [unlockError, setUnlockError] = useState('')
  const [showPinUnlock, setShowPinUnlock] = useState(false)

  useEffect(() => {
    let ignore = false
    listSavedForms()
      .then((items) => {
        if (!ignore) setForms(items)
      })
      .catch((err) => {
        if (!ignore) setError(err.message)
      })
    return () => {
      ignore = true
    }
  }, [])

  async function handleUnlock(e) {
    e.preventDefault()
    const cleanRef = refCode.trim().toUpperCase()
    const cleanPin = pin.trim()

    if (!cleanRef) {
      setUnlockError('Please enter a Reference Code (e.g. FE-A1B2).')
      return
    }
    if (!/^\d{4}$/.test(cleanPin)) {
      setUnlockError('PIN must be exactly 4 digits.')
      return
    }

    setUnlocking(true)
    setUnlockError('')

    try {
      const unlocked = await unlockSavedForm(cleanRef, cleanPin)
      if (onResume) {
        onResume(unlocked.id, cleanPin, unlocked)
      }
    } catch (err) {
      if (err.status === 403) {
        setUnlockError('Invalid reference code or PIN.')
      } else if (err.status === 429) {
        setUnlockError('Too many incorrect attempts. Please try again in 5 minutes.')
      } else {
        setUnlockError(err.message || 'Could not unlock form.')
      }
    } finally {
      setUnlocking(false)
    }
  }

  return (
    <section className="saved-panel" aria-labelledby="saved-title">
      <div className="saved-header">
        <h2 id="saved-title">Saved Forms</h2>
        <button type="button" className="small-button" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="saved-privacy-notice">
        <span>🛡️ Session Isolation: Forms you created in this active session appear right here for instant, 1-tap resumption without any PIN requirement.</span>
      </div>

      {/* Primary: Current Session Forms (1-tap frictionless resume) */}
      <div className="saved-list-section">
        <h3 className="saved-section-title">Your Active Session Forms</h3>

        {!forms && !error && <p className="saved-note">Loading your session forms…</p>}
        {error && <p className="saved-error" role="alert">{error}</p>}
        {forms && forms.length === 0 && (
          <p className="saved-note">No other saved forms in your active session.</p>
        )}

        {forms && forms.length > 0 && (
          <ul className="saved-list">
            {forms.map((item) => (
              <li key={item.id} className="saved-item">
                <div>
                  <strong>{item.status === 'confirmed' ? 'Confirmed form' : 'In progress'}</strong>
                  {item.reference_code && (
                    <span className="saved-ref-badge">Code: {item.reference_code}</span>
                  )}
                  <span className="saved-meta">
                    {item.completed_count} of {item.total_fields} fields · updated{' '}
                    {new Date(item.updated_at).toLocaleString()}
                  </span>
                </div>
                <button
                  type="button"
                  className="small-button primary"
                  onClick={() => onResume(item.id)}
                >
                  {item.status === 'confirmed' ? 'Open' : 'Resume'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Secondary Optional: Resume past form from previous day or kiosk */}
      <div className="unlock-collapsible-wrapper">
        <button
          type="button"
          className="unlock-collapsible-toggle"
          onClick={() => setShowPinUnlock((v) => !v)}
          aria-expanded={showPinUnlock}
        >
          {showPinUnlock
            ? '▲ Hide Past Form Unlock'
            : '▼ Have a previous Reference Code & PIN? Resume past form'}
        </button>

        {showPinUnlock && (
          <div className="unlock-card">
            <h3 className="unlock-card-title">🔑 Resume with Reference Code & PIN</h3>
            <p className="unlock-card-desc">
              Only needed if continuing a form from an earlier session or another kiosk.
            </p>

            <form onSubmit={handleUnlock} className="unlock-form">
              <div className="unlock-fields-row">
                <label className="unlock-label">
                  <span>Reference Code</span>
                  <input
                    className="unlock-input"
                    type="text"
                    placeholder="FE-XXXX"
                    value={refCode}
                    onChange={(e) => setRefCode(e.target.value.toUpperCase())}
                    maxLength={10}
                    required
                  />
                </label>
                <label className="unlock-label">
                  <span>4-Digit PIN</span>
                  <input
                    className="unlock-input"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]{4}"
                    placeholder="••••"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    maxLength={4}
                    required
                  />
                </label>
              </div>

              {unlockError && (
                <p className="saved-error unlock-error-banner" role="alert">
                  {unlockError}
                </p>
              )}

              <button
                type="submit"
                className="small-button primary unlock-submit-btn"
                disabled={unlocking}
              >
                {unlocking ? 'Verifying PIN…' : 'Unlock & Continue Form'}
              </button>
            </form>
          </div>
        )}
      </div>

      <button type="button" className="primary-action" onClick={onNew}>
        Start a new form
      </button>
    </section>
  )
}
