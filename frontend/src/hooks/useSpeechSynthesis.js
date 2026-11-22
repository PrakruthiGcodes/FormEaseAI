import { useCallback, useEffect, useRef, useState } from 'react'
import { VOICE_LANGUAGES, hasVoiceSupport, isSpeechSynthesisSupported } from '../utils/speech.js'

// Text-to-speech using the browser's Speech Synthesis API with Slow Voice (0.75x)
// and sequential readout support for rural and visually impaired citizens.
export default function useSpeechSynthesis() {
  const supported = isSpeechSynthesisSupported()
  const [speaking, setSpeaking] = useState(false)
  const [note, setNote] = useState('')

  const sequenceActiveRef = useRef(false)
  const fallbackTimerRef = useRef(null)

  // Clear timers and stop speech when component unmounts
  useEffect(() => {
    return () => {
      if (supported) window.speechSynthesis.cancel()
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current)
    }
  }, [supported])

  const stop = useCallback(() => {
    sequenceActiveRef.current = false
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current)
      fallbackTimerRef.current = null
    }
    if (supported) {
      window.speechSynthesis.cancel()
    }
    setSpeaking(false)
  }, [supported])

  const speak = useCallback(
    (text, languageCode, options = {}) => {
      if (!supported || !text) {
        if (typeof options === 'function') options()
        else if (options?.onEnd) options.onEnd()
        return
      }

      // Cancel previous speech and timers
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current)
        fallbackTimerRef.current = null
      }
      window.speechSynthesis.cancel()

      const onEndCallback = typeof options === 'function' ? options : options?.onEnd
      const rate = typeof options === 'object' && options?.rate ? options.rate : 1.0

      const utterance = new SpeechSynthesisUtterance(text)
      const tag = hasVoiceSupport(languageCode) ? VOICE_LANGUAGES[languageCode].tag : 'en-IN'
      const label = hasVoiceSupport(languageCode) ? VOICE_LANGUAGES[languageCode].label : 'English'
      utterance.lang = tag
      utterance.rate = Math.max(0.5, Math.min(rate, 2.0))

      // Pick an installed voice for this language if available
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

      let finished = false
      const finish = () => {
        if (finished) return
        finished = true
        if (fallbackTimerRef.current) {
          clearTimeout(fallbackTimerRef.current)
          fallbackTimerRef.current = null
        }
        setSpeaking(false)
        onEndCallback?.()
      }

      utterance.onstart = () => {
        setSpeaking(true)
      }
      utterance.onend = finish
      utterance.onerror = finish

      // Safe fallback timer: ensures onEnd is called even if browser halts speech events
      const estimatedSec = Math.max(2.5, (text.length / (10 * rate)) + 3)
      fallbackTimerRef.current = setTimeout(() => {
        if (!finished && window.speechSynthesis.speaking) {
          finish()
        }
      }, estimatedSec * 1000)

      window.speechSynthesis.speak(utterance)
    },
    [supported],
  )

  /**
   * Sequentially reads an array of strings aloud with natural pauses between items.
   */
  const speakSequence = useCallback(
    (texts, languageCode, options = {}) => {
      if (!supported || !texts || texts.length === 0) {
        options?.onComplete?.()
        return
      }

      sequenceActiveRef.current = true
      let index = 0

      function readNext() {
        if (!sequenceActiveRef.current || index >= texts.length) {
          sequenceActiveRef.current = false
          setSpeaking(false)
          options?.onComplete?.()
          return
        }

        const currentText = texts[index]
        index += 1

        speak(currentText, languageCode, {
          rate: options?.rate || 1.0,
          onEnd: () => {
            if (sequenceActiveRef.current) {
              setTimeout(readNext, 350)
            }
          },
        })
      }

      readNext()
    },
    [speak, supported],
  )

  return { supported, speaking, note, speak, stop, speakSequence }
}
