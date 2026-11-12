import { useCallback, useEffect, useRef, useState } from 'react'
import {
  SPEECH_ERROR_MESSAGES,
  VOICE_LANGUAGES,
  getSpeechRecognitionClass,
  hasVoiceSupport,
} from '../utils/speech.js'

// Speech-to-text using the browser's Web Speech API.
// Returns the state for the microphone button.
//   start()        begins listening
//   stop()         stops listening; the words are passed to onFinish
//   listening      true while the microphone is open
//   interim        words being recognised right now (not final yet)
//   error          a message to show, or ''
// onFinish(text) is called once when recording ends, with the final transcript.
export default function useSpeechRecognition({ languageCode, onFinish }) {
  const RecognitionClass = getSpeechRecognitionClass()
  const supported = Boolean(RecognitionClass) && hasVoiceSupport(languageCode)

  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState('')

  const recognitionRef = useRef(null)
  const finalTextRef = useRef('')
  const onFinishRef = useRef(onFinish)

  // Keep the latest callback without restarting recognition.
  useEffect(() => {
    onFinishRef.current = onFinish
  }, [onFinish])

  // Stop the microphone if the component goes away.
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort()
    }
  }, [])

  const start = useCallback(() => {
    if (!RecognitionClass) {
      setError('Voice input is not supported in this browser. Try Chrome or Microsoft Edge.')
      return
    }
    if (!hasVoiceSupport(languageCode)) {
      setError(SPEECH_ERROR_MESSAGES['language-not-supported'])
      return
    }

    setError('')
    setInterim('')
    finalTextRef.current = ''

    try {
      const recognition = new RecognitionClass()
      recognition.lang = VOICE_LANGUAGES[languageCode].tag
      recognition.continuous = true
      recognition.interimResults = true
      recognition.maxAlternatives = 1

      recognition.onresult = (event) => {
        let interimText = ''
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i]
          if (result.isFinal) {
            finalTextRef.current += `${result[0].transcript} `
          } else {
            interimText += result[0].transcript
          }
        }
        setInterim(interimText)
      }

      recognition.onerror = (event) => {
        // 'aborted' happens when we stop on purpose; it is not an error to show.
        if (event.error === 'aborted') return
        setError(SPEECH_ERROR_MESSAGES[event.error] || `Speech input failed (${event.error}). Try again.`)
      }

      recognition.onend = () => {
        recognitionRef.current = null
        setListening(false)
        setInterim('')
        const text = finalTextRef.current.trim()
        finalTextRef.current = ''
        if (text) onFinishRef.current?.(text)
      }

      recognitionRef.current = recognition
      recognition.start()
      setListening(true)
    } catch {
      recognitionRef.current = null
      setListening(false)
      setError('Could not start the microphone. Try again.')
    }
  }, [RecognitionClass, languageCode])

  const stop = useCallback(() => {
    // stop() lets the browser finish the last words; onend then delivers the text.
    recognitionRef.current?.stop()
  }, [])

  const clearError = useCallback(() => setError(''), [])

  return { supported, listening, interim, error, start, stop, clearError }
}
