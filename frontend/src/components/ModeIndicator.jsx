// Shows the input modes and whether voice works in this browser.
// Props:
//   speechInputSupported: true if the browser has speech recognition
//   voiceLanguage:        label of the current voice language, or null
export default function ModeIndicator({ speechInputSupported, voiceLanguage }) {
  let voiceText = 'Voice mode · not supported in this browser'
  let voiceClass = 'mode-pill mode-disabled'
  if (speechInputSupported && voiceLanguage) {
    voiceText = `Voice mode · ${voiceLanguage}`
    voiceClass = 'mode-pill mode-active-voice'
  } else if (speechInputSupported) {
    voiceText = 'Voice mode · not available for this language'
    voiceClass = 'mode-pill mode-disabled'
  }

  return (
    <div className="mode-indicator" aria-label="Input modes">
      <span className="mode-pill mode-active">Text mode</span>
      <span className={voiceClass}>{voiceText}</span>
    </div>
  )
}
