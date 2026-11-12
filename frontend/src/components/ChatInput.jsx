import { useState } from 'react'
import useSpeechRecognition from '../hooks/useSpeechRecognition.js'
import { VOICE_LANGUAGES, hasVoiceSupport } from '../utils/speech.js'

// Message box with voice input, Send, and an editable transcript.
// Speech is turned into text in the box. The user can edit it before pressing Send.
// Props:
//   onSend(text)      called with the final message
//   disabled          true while a reply is being prepared
//   languageCode      selected language, which sets the speech language
export default function ChatInput({ onSend, disabled, languageCode }) {
  const [text, setText] = useState('')
  const [transcribed, setTranscribed] = useState(false)

  const voiceAvailable = hasVoiceSupport(languageCode)
  const speech = useSpeechRecognition({
    languageCode,
    onFinish: (spoken) => {
      setText((previous) => (previous ? `${previous} ${spoken}` : spoken))
      setTranscribed(true)
    },
  })

  function submit() {
    const trimmed = text.trim()
    if (!trimmed || disabled || speech.listening) return
    onSend(trimmed)
    setText('')
    setTranscribed(false)
  }

  function handleKeyDown(event) {
    // Enter sends; Shift+Enter adds a new line.
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submit()
    }
  }

  function toggleListening() {
    if (speech.listening) {
      speech.stop()
    } else {
      speech.clearError()
      speech.start()
    }
  }

  let micTitle = `Speak your answer (${VOICE_LANGUAGES[languageCode]?.label || 'English'})`
  let micDisabled = disabled
  if (!speech.supported) {
    micTitle = voiceAvailable
      ? 'Voice input is not supported in this browser. Try Chrome or Microsoft Edge.'
      : 'Voice input is available for English, Hindi, Kannada and Telugu.'
    micDisabled = true
  }

  return (
    <form
      className="chat-input-wrapper"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      {speech.listening && (
        <div className="listening-bar" role="status" aria-live="polite">
          <span className="listening-pulse" aria-hidden="true" />
          Listening in {VOICE_LANGUAGES[languageCode]?.label}…
          {speech.interim && <span className="listening-interim"> “{speech.interim}”</span>}
        </div>
      )}

      <div className="chat-input">
        {speech.listening ? (
          <button
            type="button"
            className="icon-button stop-button"
            aria-label="Stop recording"
            title="Stop recording"
            onClick={toggleListening}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
            </svg>
          </button>
        ) : (
          <button
            type="button"
            className="icon-button mic-button"
            aria-label="Start voice input"
            title={micTitle}
            onClick={toggleListening}
            disabled={micDisabled}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="9" y="3" width="6" height="11" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        )}

        <textarea
          className="chat-textarea"
          rows={1}
          placeholder={
            speech.listening ? 'Speak now…' : 'Type or speak your answer…'
          }
          aria-label="Message"
          maxLength={1000}
          value={text}
          onChange={(event) => {
            setText(event.target.value)
            setTranscribed(false)
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />

        <button type="submit" className="send-button" disabled={disabled || speech.listening || !text.trim()}>
          Send
        </button>
      </div>

      {transcribed && !speech.listening && (
        <p className="transcript-hint" role="status">
          Check your spoken words, edit them if needed, then press Send.
        </p>
      )}
      {speech.error && (
        <div className="voice-error" role="alert">
          <span>{speech.error}</span>
          <button type="button" className="voice-error-close" onClick={speech.clearError} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}
    </form>
  )
}
