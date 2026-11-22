import { useState } from 'react'
import { getFieldExample } from '../utils/languages.js'

// Guided One-Question Voice View for Rural, Elderly, and Visually Impaired citizens.
// Focuses on one large question card, a 140px+ mic control, and spoken guidance.
export default function GuidedVoiceView({
  currentQuestion,
  currentFieldKey,
  fieldLabel,
  stepNumber = 1,
  totalSteps = 12,
  language = 'en',
  isListening = false,
  interimTranscript = '',
  onToggleMic,
  onRepeatQuestion,
  onSendText,
  isSending = false,
  fieldError = '',
  handsFreeMode = false,
  conversationComplete = false,
  onReview,
}) {
  const [showExample, setShowExample] = useState(false)
  const [showTypeInput, setShowTypeInput] = useState(false)
  const [fallbackText, setFallbackText] = useState('')

  const exampleText = currentFieldKey ? getFieldExample(currentFieldKey, language) : null
  const percent = totalSteps > 0 ? Math.round((stepNumber / totalSteps) * 100) : 0

  function handleFallbackSubmit(e) {
    e.preventDefault()
    if (!fallbackText.trim() || isSending) return
    onSendText?.(fallbackText.trim())
    setFallbackText('')
  }

  return (
    <section className="guided-voice-container" aria-label="One-Question Guided Voice Mode">
      {/* Step Progress Tracker */}
      <div className="guided-progress-header">
        <div className="guided-step-badge">
          {conversationComplete
            ? 'Completed ✓'
            : `Question ${stepNumber} of ${totalSteps}`}
        </div>
        <div className="guided-progress-track" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
          <div className="guided-progress-fill" style={{ width: `${conversationComplete ? 100 : percent}%` }} />
        </div>
      </div>

      {conversationComplete ? (
        <div className="guided-complete-card">
          <div className="guided-complete-icon" aria-hidden="true">🎉</div>
          <h2 className="guided-complete-title">All details have been collected!</h2>
          <p className="guided-complete-desc">
            You can now review your answers, listen to them read aloud, and download or submit your official application.
          </p>
          <button
            type="button"
            className="guided-review-btn primary-action"
            onClick={onReview}
          >
            Review & Create Form →
          </button>
        </div>
      ) : (
        <div className="guided-question-card">
          {fieldLabel && (
            <span className="guided-field-tag">
              {fieldLabel}
            </span>
          )}

          <h2 className="guided-question-text" id="guided-active-question">
            {currentQuestion || 'Please tell us your answer.'}
          </h2>

          {fieldError && (
            <div className="guided-error-banner" role="alert">
              <span className="guided-error-icon" aria-hidden="true">⚠️</span>
              <span>{fieldError}</span>
            </div>
          )}

          {/* Assistant Action Buttons */}
          <div className="guided-helper-actions">
            <button
              type="button"
              className="guided-helper-btn"
              onClick={onRepeatQuestion}
              title="Hear the assistant read this question aloud again"
            >
              <span aria-hidden="true">🔊</span> Hear Question Again (Key: R)
            </button>

            {exampleText && (
              <button
                type="button"
                className="guided-helper-btn"
                onClick={() => setShowExample((prev) => !prev)}
                aria-expanded={showExample}
              >
                <span aria-hidden="true">💡</span> {showExample ? 'Hide Example' : 'Explain with Example'}
              </button>
            )}
          </div>

          {showExample && exampleText && (
            <div className="guided-example-box" role="region" aria-label="Field Example">
              <span className="example-label">Example answer:</span>
              <p className="example-text">{exampleText}</p>
            </div>
          )}

          {/* Giant Accessible Mic Button (>=140px) */}
          <div className="guided-mic-section">
            <button
              type="button"
              className={`guided-giant-mic ${isListening ? 'listening' : ''} ${handsFreeMode ? 'hands-free' : ''}`}
              onClick={onToggleMic}
              disabled={isSending}
              aria-label={isListening ? 'Stop listening' : 'Start speaking'}
              aria-pressed={isListening}
            >
              <div className="guided-mic-rings" aria-hidden="true" />
              <span className="guided-mic-icon" aria-hidden="true">
                {isListening ? '⏹️' : '🎙️'}
              </span>
            </button>

            <div className="guided-mic-status">
              {isSending ? (
                <span className="guided-status-text saving">Checking & recording your answer…</span>
              ) : isListening ? (
                <span className="guided-status-text active">Listening now… Speak clearly into the microphone</span>
              ) : (
                <span className="guided-status-text idle">
                  {handsFreeMode
                    ? 'Hands-Free Loop active · Tap mic or speak when listening'
                    : 'Tap the microphone or press Space to answer'}
                </span>
              )}
            </div>

            {/* Live Interim Transcript */}
            {(interimTranscript || isListening) && (
              <div className="guided-transcript-box" role="status" aria-live="polite">
                <span className="transcript-label">Hearing:</span>
                <p className="transcript-live">
                  {interimTranscript ? `"${interimTranscript}"` : 'Waiting for your voice…'}
                </p>
              </div>
            )}
          </div>

          {/* Optional Collapsible Text Fallback */}
          <div className="guided-fallback-toggle-row">
            <button
              type="button"
              className="guided-toggle-type-btn"
              onClick={() => setShowTypeInput((v) => !v)}
              aria-expanded={showTypeInput}
            >
              {showTypeInput ? '▲ Hide typing keyboard' : '▼ Prefer to type your answer instead?'}
            </button>
          </div>

          {showTypeInput && (
            <form onSubmit={handleFallbackSubmit} className="guided-fallback-form">
              <input
                type="text"
                className="guided-fallback-input"
                placeholder="Type your answer here…"
                value={fallbackText}
                onChange={(e) => setFallbackText(e.target.value)}
                disabled={isSending}
                maxLength={300}
                autoFocus
              />
              <button
                type="submit"
                className="small-button primary"
                disabled={isSending || !fallbackText.trim()}
              >
                Send Answer
              </button>
            </form>
          )}
        </div>
      )}
    </section>
  )
}
