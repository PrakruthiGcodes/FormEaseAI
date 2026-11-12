import { useCallback, useEffect, useState } from 'react'
import { VOICE_LANGUAGES, hasVoiceSupport, isSpeechSynthesisSupported } from '../utils/speech.js'

// Text-to-speech using the browser's Speech Synthesis API.
//   speak(text, languageCode)  reads the text aloud
//   stop()                     stops reading
//   speaking                   true while reading
//   note                       a message when the voice for a language is missing
export default function useSpeechSynthesis() {
  const supported = isSpeechSynthesisSupported()
  const [speaking, setSpeaking] = useState(false)
  const [note, setNote] = useState('')

  // Stop reading when the page closes or the component is removed.
  useEffect(() => {
    return () => {
      if (supported) window.speechSynthesis.cancel()
    }
  }, [supported])

  const speak = useCallback(
    (text, languageCode) => {
      if (!supported || !text) return
      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      const tag = hasVoiceSupport(languageCode) ? VOICE_LANGUAGES[languageCode].tag : 'en-IN'
      const label = hasVoiceSupport(languageCode) ? VOICE_LANGUAGES[languageCode].label : 'English'
      utterance.lang = tag

      // Pick an installed voice for this language if there is one.
      const voices = window.speechSynthesis.getVoices()
      const voice =
        voices.find((item) => item.lang === tag) ||
        voices.find((item) => item.lang.toLowerCase().startsWith(tag.slice(0, 2).toLowerCase()))
      if (voice) {
        utterance.voice = voice
        setNote('')
      } else {
        setNote(`No ${label} voice is installed on this device, so the reply is read with the default voice.`)
      }

      utterance.onstart = () => setSpeaking(true)
      utterance.onend = () => setSpeaking(false)
      utterance.onerror = () => setSpeaking(false)
      window.speechSynthesis.speak(utterance)
    },
    [supported],
  )

  const stop = useCallback(() => {
    if (supported) window.speechSynthesis.cancel()
    setSpeaking(false)
  }, [supported])

  return { supported, speaking, note, speak, stop }
}
