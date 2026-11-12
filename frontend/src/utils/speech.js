// Browser speech settings for the four voice languages.
// Speech recognition and speech synthesis depend on the browser and the
// voices installed on the device, so the app checks support before using them.

export const VOICE_LANGUAGES = {
  en: { tag: 'en-IN', label: 'English' },
  hi: { tag: 'hi-IN', label: 'Hindi' },
  kn: { tag: 'kn-IN', label: 'Kannada' },
  te: { tag: 'te-IN', label: 'Telugu' },
}

export function hasVoiceSupport(languageCode) {
  return Object.prototype.hasOwnProperty.call(VOICE_LANGUAGES, languageCode)
}

export function getSpeechRecognitionClass() {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

export function isSpeechSynthesisSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
}

// Messages for the recognition errors the browser can report.
export const SPEECH_ERROR_MESSAGES = {
  'not-allowed':
    'Microphone permission was denied. Allow microphone access for this site in your browser settings, then try again.',
  'service-not-allowed':
    'The browser blocked speech recognition. Try Chrome or Microsoft Edge on a secure page (localhost or https).',
  'no-speech': 'No speech was detected. Press the microphone and speak clearly.',
  'audio-capture': 'No microphone was found. Connect a microphone and try again.',
  network:
    'Speech recognition needs an internet connection (the browser sends audio to its speech service). Check your connection.',
  'language-not-supported': 'Your browser does not support speech input for this language. Type your answer instead.',
}
