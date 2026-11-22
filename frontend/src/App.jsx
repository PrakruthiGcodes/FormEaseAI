import { useCallback, useEffect, useRef, useState } from 'react'
import Header from './components/Header.jsx'
import WelcomeHero from './components/WelcomeHero.jsx'
import ChatWindow from './components/ChatWindow.jsx'
import ChatInput from './components/ChatInput.jsx'
import ModeIndicator from './components/ModeIndicator.jsx'
import FormSummary from './components/FormSummary.jsx'
import ReviewScreen from './components/ReviewScreen.jsx'
import SavedFormsPanel from './components/SavedFormsPanel.jsx'
import GuidedVoiceView from './components/GuidedVoiceView.jsx'
import useSpeechSynthesis from './hooks/useSpeechSynthesis.js'
import useSpeechRecognition from './hooks/useSpeechRecognition.js'
import {
  createSavedForm,
  fetchDatabaseStatus,
  fetchFormTypes,
  fetchHealth,
  getSavedForm,
  rotateSessionToken,
  saveForm,
  sendChatMessage,
  validateForm,
} from './services/api.js'
import {
  DEFAULT_FORM_TYPES,
  DOMAIN_EXTRA_FIELDS,
  FIELD_LABELS_BY_LANG,
  FORM_FIELDS,
  INITIAL_GREETINGS,
  detectVoiceCommand,
} from './utils/languages.js'
import { playSaved } from './utils/earcons.js'
import { VOICE_LANGUAGES, hasVoiceSupport } from './utils/speech.js'
import { clearSavedSession, loadSavedSession, saveSession } from './utils/sessionStorage.js'
import { getSpeakReplies, setSpeakReplies } from './utils/storage.js'
import './App.css'

// Must match the backend limits (backend/app/core/config.py and schemas).
const MAX_HISTORY_MESSAGES = 30
const MAX_SAVED_MESSAGES = 200
const SAVE_DELAY_MS = 800
const INACTIVITY_TIMEOUT_MS = 90_000 // 90 seconds automatic lock curtain

function emptyFormData() {
  return Object.fromEntries(FORM_FIELDS.map((field) => [field.key, null]))
}

function freshSession(language = 'en', formType = 'general') {
  return {
    messages: [
      {
        id: 1,
        role: 'assistant',
        text: INITIAL_GREETINGS[language] || INITIAL_GREETINGS.en,
      },
    ],
    formData: emptyFormData(),
    englishFormData: emptyFormData(),
    formType,
    extraFields: {},
    englishExtraFields: {},
    language,
    referenceCode: null,
    nextQuestion: null,
    conversationComplete: false,
    updatedFields: [],
    validationErrors: {},
    status: 'in_progress',
    formId: null,
    nextId: 2,
  }
}

function initialSession() {
  const saved = loadSavedSession()
  if (!saved || !Array.isArray(saved.messages)) return freshSession()
  return { ...freshSession(), ...saved }
}

// Keep the conversation history the server accepts: only real turns, newest last.
function toHistory(messages) {
  return messages
    .filter((message) => !message.isError)
    .map((message) => ({ role: message.role, content: message.text }))
}

// Build the session state from a saved form returned by the server.
function sessionFromSaved(detail, previous) {
  const values = detail.form_data || emptyFormData()
  const englishValues = detail.english_form_data || values
  const extra = detail.extra_fields || {}
  const englishExtra = detail.english_extra_fields || extra

  return {
    ...previous,
    messages: (detail.messages || []).map((turn, index) => ({
      id: index + 1,
      role: turn.role,
      text: turn.content,
    })),
    formData: values,
    englishFormData: englishValues,
    formType: detail.form_type || 'general',
    extraFields: extra,
    englishExtraFields: englishExtra,
    language: detail.language || previous.language,
    status: detail.status || 'in_progress',
    formId: detail.id,
    referenceCode: detail.reference_code || null,
    nextQuestion: null,
    conversationComplete: (detail.missing_fields || []).length === 0,
    updatedFields: [],
    validationErrors: {},
    nextId: (detail.messages ? detail.messages.length : 0) + 1,
  }
}

const SAVE_LABELS = {
  saving: 'Saving…',
  saved: 'All changes saved (encrypted).',
  error: 'Could not save this change. It is kept in this tab; try again later.',
}

function App() {
  const [session, setSession] = useState(initialSession)
  const [backend, setBackend] = useState({ state: 'checking', info: null, error: '' })
  const [database, setDatabase] = useState({ checked: false, available: false, message: '' })
  const [saveState, setSaveState] = useState({ state: 'idle', message: '' })
  const [isSending, setIsSending] = useState(false)
  const [view, setView] = useState('chat') // 'chat' | 'review' | 'saved'
  const [speakReplies, setSpeakRepliesState] = useState(getSpeakReplies)
  const [adminMode, setAdminMode] = useState(false)
  const [largeText, setLargeText] = useState(false)
  const [formTypes, setFormTypes] = useState(DEFAULT_FORM_TYPES)

  // Accessibility States
  const [highContrast, setHighContrast] = useState(false)
  const [slowVoice, setSlowVoice] = useState(false)
  const [handsFreeMode, setHandsFreeMode] = useState(false)
  const [guidedMode, setGuidedMode] = useState(false)
  const [announcement, setAnnouncement] = useState('')

  // Security, Privacy & Kiosk Isolation State
  const [privacyMask, setPrivacyMask] = useState(true)
  const [isScreenLocked, setIsScreenLocked] = useState(false)
  const [activePin, setActivePin] = useState(null)
  const [savePinModalOpen, setSavePinModalOpen] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [savingPin, setSavingPin] = useState(false)
  const [pinModalError, setPinModalError] = useState('')
  const [issuedPinData, setIssuedPinData] = useState(null)
  const [lockUnlockPin, setLockUnlockPin] = useState('')
  const [lockError, setLockError] = useState('')

  const inactivityTimerRef = useRef(null)

  const {
    messages,
    formData,
    englishFormData,
    formType = 'general',
    extraFields = {},
    englishExtraFields = {},
    language,
    nextQuestion,
    conversationComplete,
    updatedFields,
    status,
    formId,
  } = session

  const speech = useSpeechSynthesis()

  // Calculate current missing field for Guided Voice View
  const domainDefs = DOMAIN_EXTRA_FIELDS[formType] || []
  const coreMissingField = FORM_FIELDS.find((f) => !formData[f.key])
  const domainMissingField = domainDefs.find((df) => !extraFields[df.key])
  const activeMissingFieldKey = coreMissingField ? coreMissingField.key : domainMissingField ? domainMissingField.key : null

  const activeFieldLabel = activeMissingFieldKey
    ? (FIELD_LABELS_BY_LANG[language]?.[activeMissingFieldKey] ||
        coreMissingField?.label ||
        domainMissingField?.label ||
        activeMissingFieldKey)
    : ''

  const completedCoreCount = FORM_FIELDS.filter((f) => formData[f.key]).length
  const completedDomainCount = domainDefs.filter((df) => extraFields[df.key]).length
  const completedTotal = completedCoreCount + completedDomainCount
  const totalFieldsCount = FORM_FIELDS.length + domainDefs.length
  const stepNumber = Math.min(completedTotal + 1, totalFieldsCount)

  const activeQuestionText = nextQuestion || (messages.length > 0 ? messages[messages.length - 1].text : INITIAL_GREETINGS[language])

  // Creates a database record on first use
  const ensureFormId = useCallback(async (pin = activePin) => {
    if (formId || !database.available) return formId
    try {
      const created = await createSavedForm(language, pin, formType)
      const issuedPin = created.access_pin_issued || pin
      if (issuedPin) {
        setActivePin(issuedPin)
      }
      setSession((prev) => ({
        ...prev,
        formId: created.id,
        referenceCode: created.reference_code,
      }))
      return created.id
    } catch (err) {
      setSaveState({ state: 'error', message: err.message })
      return null
    }
  }, [formId, database.available, language, activePin, formType])

  // Send a message to POST /api/chat
  const handleSend = useCallback(async (text) => {
    setIsSending(true)
    const userMessage = { id: session.nextId, role: 'user', text }
    setSession((prev) => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      nextId: prev.nextId + 1,
    }))

    try {
      await ensureFormId()
      const data = await sendChatMessage({
        message: text,
        history: toHistory(session.messages).slice(-MAX_HISTORY_MESSAGES),
        form_data: session.formData,
        english_form_data: session.englishFormData,
        language: session.language,
        form_type: session.formType || 'general',
        extra_fields: session.extraFields || {},
        english_extra_fields: session.englishExtraFields || {},
      })

      playSaved()
      setAnnouncement(`Answer recorded: ${data.reply}`)

      setSession((prev) => ({
        ...prev,
        messages: [...prev.messages, { id: prev.nextId, role: 'assistant', text: data.reply }],
        formData: data.extracted_data,
        englishFormData: data.english_data || prev.englishFormData || data.extracted_data,
        extraFields: data.extra_fields || prev.extraFields || {},
        englishExtraFields: data.english_extra_fields || prev.englishExtraFields || data.extra_fields || {},
        nextQuestion: data.next_question,
        conversationComplete: data.conversation_complete,
        updatedFields: data.updated_fields || [],
        validationErrors: data.validation_errors || {},
        status: 'in_progress',
        nextId: prev.nextId + 1,
      }))

      // Speak reply aloud with optional hands-free next listen
      if (speakReplies || handsFreeMode) {
        speech.speak(data.reply, session.language, {
          rate: slowVoice ? 0.75 : 1.0,
          onEnd: () => {
            if (handsFreeMode && view !== 'review' && !data.conversation_complete) {
              setTimeout(() => {
                startMicRef.current?.()
              }, 350)
            }
          },
        })
      }
    } catch (err) {
      setAnnouncement(`Error: ${err.message}`)
      setSession((prev) => ({
        ...prev,
        messages: [...prev.messages, { id: prev.nextId, role: 'assistant', text: err.message, isError: true }],
        nextId: prev.nextId + 1,
      }))
    } finally {
      setIsSending(false)
    }
  }, [ensureFormId, session, speakReplies, handsFreeMode, slowVoice, view, speech])

  const handleSpeechCapturedRef = useRef(null)

  const recognition = useSpeechRecognition({
    languageCode: session.language,
    onFinish: (spoken) => handleSpeechCapturedRef.current?.(spoken),
  })

  const { start: startMic, stop: stopMic, listening: isListening, interim: interimTranscript } = recognition

  // Repeat current question aloud
  const handleRepeatQuestion = useCallback(() => {
    if (speech.speaking) speech.stop()
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')
    const textToSpeak = lastAssistant?.text || INITIAL_GREETINGS[session.language] || INITIAL_GREETINGS.en
    setAnnouncement(`Repeating: ${textToSpeak}`)
    speech.speak(textToSpeak, session.language, {
      rate: slowVoice ? 0.75 : 1.0,
      onEnd: () => {
        if (handsFreeMode && view !== 'review') {
          setTimeout(() => {
            startMic()
          }, 350)
        }
      },
    })
  }, [messages, session.language, slowVoice, handsFreeMode, view, speech, startMic])

  // Read summary of filled fields aloud
  const handleReadSummaryAloud = useCallback(() => {
    if (speech.speaking) speech.stop()
    const lines = []
    const langLabels = FIELD_LABELS_BY_LANG[session.language] || FIELD_LABELS_BY_LANG.en
    lines.push('Reading your recorded application details.')

    FORM_FIELDS.forEach((f) => {
      const val = formData[f.key]
      if (val) lines.push(`${langLabels[f.key] || f.label}: ${val}`)
    })

    const extraDefs = DOMAIN_EXTRA_FIELDS[formType] || []
    extraDefs.forEach((df) => {
      const val = extraFields[df.key]
      if (val) lines.push(`${df.label}: ${val}`)
    })

    if (lines.length <= 1) {
      lines.push('No answers have been recorded yet.')
    }

    setAnnouncement('Reading summary aloud')
    speech.speakSequence(lines, session.language, {
      rate: slowVoice ? 0.75 : 1.0,
      onComplete: () => {
        if (handsFreeMode && view !== 'review') {
          setTimeout(() => {
            startMic()
          }, 400)
        }
      },
    })
  }, [formData, extraFields, formType, session.language, slowVoice, handsFreeMode, view, speech, startMic])

  // Speech Recognition hook and voice command intercept
  const handleSpeechCaptured = useCallback((spoken) => {
    const trimmed = spoken.trim()
    if (!trimmed) return

    // Voice navigation commands intercept
    const cmd = detectVoiceCommand(trimmed)
    if (cmd === 'repeat') {
      handleRepeatQuestion()
      return
    }
    if (cmd === 'summary') {
      handleReadSummaryAloud()
      return
    }

    handleSend(trimmed)
  }, [handleRepeatQuestion, handleReadSummaryAloud, handleSend])

  useEffect(() => {
    handleSpeechCapturedRef.current = handleSpeechCaptured
  }, [handleSpeechCaptured])

  // One-click Start Easy Voice Guide on Welcome Hero
  function handleStartEasyVoiceGuide() {
    setGuidedMode(true)
    setHandsFreeMode(true)
    setSpeakRepliesState(true)
    setSpeakReplies(true)
    setAnnouncement('Easy Voice Guide enabled. Reading welcome question.')

    const welcomeMsg = messages.length > 0 ? messages[0].text : (INITIAL_GREETINGS[session.language] || INITIAL_GREETINGS.en)
    speech.speak(welcomeMsg, session.language, {
      rate: slowVoice ? 0.75 : 1.0,
      onEnd: () => {
        setTimeout(() => {
          startMic()
        }, 350)
      },
    })
  }

  // Keyboard Shortcuts for hands-free and accessibility
  useEffect(() => {
    function handleKeyDown(e) {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        return
      }

      if (e.code === 'Space') {
        e.preventDefault()
        if (isListening) {
          stopMic()
          setAnnouncement('Microphone stopped')
        } else {
          setAnnouncement('Microphone listening')
          startMic()
        }
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        handleRepeatQuestion()
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault()
        handleReadSummaryAloud()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        speech.stop()
        if (isListening) stopMic()
        setAnnouncement('Speech and microphone stopped')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isListening, startMic, stopMic, handleRepeatQuestion, handleReadSummaryAloud, speech])

  // Keep chat and form state synced with sessionStorage
  useEffect(() => {
    saveSession(session)
  }, [session])

  // Inactivity detection: 90 seconds locks the screen curtain
  useEffect(() => {
    function resetInactivity() {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)
      if (!isScreenLocked) {
        inactivityTimerRef.current = setTimeout(() => {
          setIsScreenLocked(true)
          setAnnouncement('Screen locked for privacy')
        }, INACTIVITY_TIMEOUT_MS)
      }
    }

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll']
    events.forEach((evt) => window.addEventListener(evt, resetInactivity, { passive: true }))
    resetInactivity()

    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)
      events.forEach((evt) => window.removeEventListener(evt, resetInactivity))
    }
  }, [isScreenLocked])

  // Startup: fetch health, database status, form types, and restore saved form if any
  useEffect(() => {
    let ignore = false

    fetchHealth()
      .then((info) => {
        if (!ignore) setBackend({ state: 'online', info, error: '' })
      })
      .catch((err) => {
        if (!ignore) setBackend({ state: 'offline', info: null, error: err.message })
      })

    fetchFormTypes()
      .then((types) => {
        if (!ignore && Array.isArray(types) && types.length > 0) {
          setFormTypes(types)
        }
      })
      .catch(() => {})

    async function loadDatabase() {
      let dbStatus = { available: false, message: 'MongoDB status unknown.' }
      try {
        dbStatus = await fetchDatabaseStatus()
      } catch {
        dbStatus = { available: false, message: 'Cannot reach the backend to check MongoDB.' }
      }
      if (ignore) return
      setDatabase({ checked: true, available: Boolean(dbStatus.available), message: dbStatus.message })

      const storedId = loadSavedSession()?.formId
      if (dbStatus.available && storedId) {
        try {
          const detail = await getSavedForm(storedId, activePin)
          if (!ignore) setSession((prev) => sessionFromSaved(detail, prev))
        } catch (err) {
          if (!ignore && err.status === 404) setSession((prev) => ({ ...prev, formId: null }))
        }
      }
    }
    loadDatabase()

    return () => {
      ignore = true
    }
  }, [activePin])

  // Autosave to MongoDB
  useEffect(() => {
    if (!database.available || !formId) return undefined
    const timer = setTimeout(async () => {
      setSaveState({ state: 'saving', message: '' })
      try {
        await saveForm(
          formId,
          {
            messages: toHistory(messages).slice(-MAX_SAVED_MESSAGES),
            form_data: formData,
            language,
            status,
            form_type: formType,
            extra_fields: extraFields,
            english_extra_fields: englishExtraFields,
          },
          activePin
        )
        setSaveState({ state: 'saved', message: '' })
      } catch (err) {
        setSaveState({ state: 'error', message: err.message })
      }
    }, SAVE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [messages, formData, language, status, formId, formType, extraFields, englishExtraFields, database.available, activePin])

  function setLanguage(code) {
    setSession((prev) => {
      let updatedMessages = prev.messages
      if (prev.messages.length <= 1 && (!prev.messages[0] || prev.messages[0].role === 'assistant')) {
        updatedMessages = [
          {
            id: 1,
            role: 'assistant',
            text: INITIAL_GREETINGS[code] || INITIAL_GREETINGS.en,
          },
        ]
      }
      return {
        ...prev,
        language: code,
        messages: updatedMessages,
      }
    })
  }

  async function retryBackend() {
    setBackend({ state: 'checking', info: null, error: '' })
    try {
      const info = await fetchHealth()
      setBackend({ state: 'online', info, error: '' })
    } catch (err) {
      setBackend({ state: 'offline', info: null, error: err.message })
    }
  }

  // Handle Form Type Selection from large cards
  function handleSelectFormType(typeId) {
    setSession((prev) => ({
      ...prev,
      formType: typeId,
      extraFields: {},
      englishExtraFields: {},
    }))
  }

  // Edit core field value from summary panel
  async function handleEditField(field, value) {
    try {
      const result = await validateForm({ ...formData, [field]: value })
      if (result.validation_errors[field]) return result.validation_errors[field]
      playSaved()
      setSession((prev) => ({
        ...prev,
        formData: result.form_data,
        conversationComplete: result.all_required_present,
        updatedFields: [field],
        validationErrors: result.validation_errors,
        status: 'in_progress',
      }))
      return null
    } catch (err) {
      return err.message
    }
  }

  // Edit domain extra field value from summary panel
  async function handleEditExtraField(key, value) {
    playSaved()
    setSession((prev) => ({
      ...prev,
      extraFields: { ...prev.extraFields, [key]: value },
      englishExtraFields: { ...prev.englishExtraFields, [key]: value },
      status: 'in_progress',
    }))
    return null
  }

  // Called by the review screen after values pass validation
  async function handleConfirm(values, extraValues) {
    setSession((prev) => ({
      ...prev,
      formData: values,
      extraFields: extraValues || prev.extraFields,
      status: 'confirmed',
    }))
    if (database.available) {
      const id = await ensureFormId()
      if (!id) throw new Error('The form could not be saved, so it was not confirmed in the database. Try again.')
      await saveForm(
        id,
        {
          messages: toHistory(messages).slice(-MAX_SAVED_MESSAGES),
          form_data: values,
          language,
          status: 'confirmed',
          form_type: session.formType,
          extra_fields: extraValues || session.extraFields,
          english_extra_fields: session.englishExtraFields,
        },
        activePin
      )
      playSaved()
      setSaveState({ state: 'saved', message: '' })
    }
  }

  async function handleResume(id, accessPin = null, unlockedForm = null) {
    try {
      if (unlockedForm) {
        setSession((prev) => sessionFromSaved(unlockedForm, prev))
        if (accessPin) setActivePin(accessPin)
        setView('chat')
        return
      }
      const detail = await getSavedForm(id, accessPin || activePin)
      setSession((prev) => sessionFromSaved(detail, prev))
      if (accessPin) setActivePin(accessPin)
      setView('chat')
    } catch (err) {
      setSaveState({ state: 'error', message: err.message })
    }
  }

  async function startNewForm() {
    if (!window.confirm('Start a new form? The current conversation will be cleared from this tab. Saved forms are kept.')) {
      return
    }
    clearSavedSession()
    setSession(freshSession(language, formType))
    setActivePin(null)
    setSaveState({ state: 'idle', message: '' })
    setView('chat')
  }

  // Kiosk Wipe: Finishes and completely erases citizen session
  function handleFinishAndErase() {
    if (
      !window.confirm(
        'Finish & Erase My Data?\n\nThis will completely clear your conversation and personal details from this kiosk and rotate session credentials.'
      )
    ) {
      return
    }

    clearSavedSession()
    rotateSessionToken()
    setSession(freshSession(language, 'general'))
    setActivePin(null)
    setIsScreenLocked(false)
    setIssuedPinData(null)
    setSavePinModalOpen(false)
    setSaveState({ state: 'idle', message: '' })
    setView('chat')

    if (speakReplies && speech.supported) {
      speech.speak('Your session has been securely erased from this kiosk.', language, {
        rate: slowVoice ? 0.75 : 1.0,
      })
    }
  }

  // Handle Save with custom or auto-generated PIN
  async function handleSaveWithPin(e) {
    e.preventDefault()
    setPinModalError('')
    const pin = pinInput.trim()
    if (!/^\d{4}$/.test(pin)) {
      setPinModalError('PIN must be exactly 4 digits.')
      return
    }

    setSavingPin(true)
    try {
      setActivePin(pin)
      if (formId && database.available) {
        const saved = await saveForm(
          formId,
          {
            messages: toHistory(messages).slice(-MAX_SAVED_MESSAGES),
            form_data: formData,
            language,
            status,
            form_type: formType,
            extra_fields: extraFields,
            english_extra_fields: englishExtraFields,
          },
          pin
        )
        setIssuedPinData({
          referenceCode: saved.reference_code || session.referenceCode,
          pin,
          formId,
        })
      } else {
        const created = await createSavedForm(language, pin, formType)
        setSession((prev) => ({
          ...prev,
          formId: created.id,
          referenceCode: created.reference_code,
        }))
        setIssuedPinData({
          referenceCode: created.reference_code,
          pin: created.access_pin_issued || pin,
          formId: created.id,
        })
      }
      playSaved()
      setSaveState({ state: 'saved', message: '' })
    } catch (err) {
      setPinModalError(err.message || 'Failed to save form with PIN.')
    } finally {
      setSavingPin(false)
    }
  }

  function handleAutoGeneratePin() {
    const randomPin = Math.floor(1000 + Math.random() * 9000).toString()
    setPinInput(randomPin)
  }

  // Zero-friction unlock from Lock Curtain
  function handleFrictionlessResume() {
    setIsScreenLocked(false)
    setLockUnlockPin('')
    setLockError('')
    playSaved()
    setAnnouncement('Session resumed successfully')
  }

  function handleUnlockScreenWithPin(e) {
    e.preventDefault()
    setLockError('')
    const pin = lockUnlockPin.trim()

    if (activePin) {
      if (pin === activePin) {
        setIsScreenLocked(false)
        setLockUnlockPin('')
        playSaved()
        setAnnouncement('Session unlocked with PIN')
      } else {
        setLockError('Incorrect PIN. Please re-enter.')
      }
    } else {
      setIsScreenLocked(false)
      setLockUnlockPin('')
      playSaved()
    }
  }

  function toggleSpeak(enabled) {
    setSpeakRepliesState(enabled)
    setSpeakReplies(enabled)
    if (!enabled) speech.stop()
  }

  // Save-state text shown in the summary panel
  let saveLabel = ''
  if (database.checked && !database.available) {
    saveLabel = 'Not saved: MongoDB is offline. Start MongoDB to save and resume forms.'
  } else if (saveState.state === 'saving') {
    saveLabel = SAVE_LABELS.saving
  } else if (saveState.state === 'saved') {
    saveLabel = session.referenceCode
      ? `Saved (encrypted) · Code: ${session.referenceCode}`
      : SAVE_LABELS.saved
  } else if (saveState.state === 'error') {
    saveLabel = SAVE_LABELS.error
  }

  const voiceLanguage = hasVoiceSupport(language) ? VOICE_LANGUAGES[language].label : null

  return (
    <div className={`app-shell ${largeText ? 'large-text-mode' : ''} ${highContrast ? 'high-contrast' : ''}`}>
      {/* Screen reader live assertive status announcer */}
      <div aria-live="assertive" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      <Header
        language={language}
        onLanguageChange={setLanguage}
        backend={backend}
        onRetry={retryBackend}
        speakReplies={speakReplies}
        onToggleSpeak={toggleSpeak}
        speechOutputSupported={speech.supported}
        largeText={largeText}
        onToggleLargeText={() => setLargeText((v) => !v)}
        privacyMask={privacyMask}
        onTogglePrivacyMask={() => setPrivacyMask((v) => !v)}
        onLockScreen={() => setIsScreenLocked(true)}
        onFinishAndErase={handleFinishAndErase}
        activePin={activePin}
        highContrast={highContrast}
        onToggleHighContrast={() => setHighContrast((v) => !v)}
        slowVoice={slowVoice}
        onToggleSlowVoice={() => setSlowVoice((v) => !v)}
        handsFreeMode={handsFreeMode}
        onToggleHandsFree={() => setHandsFreeMode((v) => !v)}
        guidedMode={guidedMode}
        onToggleGuidedMode={() => setGuidedMode((v) => !v)}
      />

      {view === 'review' ? (
        <main className="app-main">
          <ReviewScreen
            formData={formData}
            englishFormData={englishFormData || formData}
            language={language}
            onBack={() => setView('chat')}
            onConfirm={handleConfirm}
            formType={formType}
            extraFields={extraFields}
            englishExtraFields={englishExtraFields}
            formId={formId}
            privacyMask={privacyMask}
            onFinishAndErase={handleFinishAndErase}
            slowVoice={slowVoice}
          />
        </main>
      ) : (
        <main className="app-main">
          <div className="workspace">
            <div className="chat-column">
              {view === 'saved' ? (
                <SavedFormsPanel
                  onResume={handleResume}
                  onNew={startNewForm}
                  onClose={() => setView('chat')}
                />
              ) : guidedMode ? (
                /* One-Question Guided Voice View for Rural & Elderly */
                <GuidedVoiceView
                  currentQuestion={activeQuestionText}
                  currentFieldKey={activeMissingFieldKey}
                  fieldLabel={activeFieldLabel}
                  stepNumber={stepNumber}
                  totalSteps={totalFieldsCount}
                  language={language}
                  isListening={isListening}
                  interimTranscript={interimTranscript}
                  onToggleMic={() => {
                    if (isListening) stopMic()
                    else startMic()
                  }}
                  onRepeatQuestion={handleRepeatQuestion}
                  onSendText={handleSend}
                  isSending={isSending}
                  fieldError={activeMissingFieldKey ? session.validationErrors[activeMissingFieldKey] || '' : ''}
                  handsFreeMode={handsFreeMode}
                  conversationComplete={conversationComplete}
                  onReview={() => setView('review')}
                />
              ) : (
                <>
                  {messages.length === 0 || (messages.length === 1 && messages[0].role === 'assistant') ? (
                    <WelcomeHero
                      selectedFormType={formType}
                      onSelectFormType={handleSelectFormType}
                      formTypes={formTypes}
                      onStartEasyVoiceGuide={handleStartEasyVoiceGuide}
                      handsFreeMode={handsFreeMode}
                      onToggleHandsFree={(val) => setHandsFreeMode(val)}
                    />
                  ) : null}
                  <ChatWindow messages={messages} isSending={isSending} />
                  {speech.speaking && (
                    <div className="speaking-bar" role="status">
                      <span>Reading the reply aloud…</span>
                      <button type="button" className="small-button" onClick={speech.stop}>
                        Stop reading
                      </button>
                    </div>
                  )}
                  {speech.note && <p className="speech-note">{speech.note}</p>}
                </>
              )}
            </div>

            <FormSummary
              formData={formData}
              englishFormData={englishFormData || formData}
              language={language}
              adminMode={adminMode}
              onToggleAdminMode={setAdminMode}
              fieldErrors={session.validationErrors}
              updatedFields={updatedFields}
              nextQuestion={nextQuestion}
              conversationComplete={conversationComplete}
              saveLabel={saveLabel}
              onEditField={handleEditField}
              onReview={() => setView('review')}
              onSavedForms={() => setView('saved')}
              onNewForm={startNewForm}
              formType={formType}
              extraFields={extraFields}
              englishExtraFields={englishExtraFields}
              onEditExtraField={handleEditExtraField}
              privacyMask={privacyMask}
              onOpenSavePinModal={() => {
                setIssuedPinData(null)
                setPinModalError('')
                setSavePinModalOpen(true)
              }}
            />
          </div>
        </main>
      )}

      {view !== 'review' && !guidedMode && (
        <footer className="app-footer">
          <ModeIndicator speechInputSupported={speech.supported} voiceLanguage={voiceLanguage} />
          <ChatInput onSend={handleSend} disabled={isSending} languageCode={language} />
        </footer>
      )}

      {/* Lock Screen Curtain Overlay - Frictionless for Blind / Elderly / Illiterate citizens */}
      {isScreenLocked && (
        <div className="modal-backdrop lock-curtain-backdrop" role="alertdialog" aria-modal="true" aria-labelledby="lock-title">
          <div className="modal-dialog lock-curtain-dialog">
            <div className="lock-icon" aria-hidden="true">🔒</div>
            <h2 id="lock-title">Kiosk Privacy Lock</h2>
            <p className="lock-curtain-desc">
              This screen was locked after a period of inactivity to protect your personal details on this public kiosk.
            </p>

            {/* Frictionless 1-Tap Resume Button for Blind & Illiterate Citizens */}
            <div className="lock-frictionless-resume">
              <button
                type="button"
                className="lock-resume-btn primary-action"
                onClick={handleFrictionlessResume}
                autoFocus
              >
                <span>🟢 Tap to Resume My Form</span>
              </button>
            </div>

            {/* Optional PIN Unlock if citizen set a 4-digit PIN */}
            {activePin && (
              <form onSubmit={handleUnlockScreenWithPin} className="lock-unlock-form">
                <label className="lock-input-label">
                  <span>Or enter your 4-digit PIN:</span>
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]{4}"
                    placeholder="••••"
                    maxLength={4}
                    value={lockUnlockPin}
                    onChange={(e) => setLockUnlockPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  />
                </label>
                {lockError && <p className="lock-error-text" role="alert">{lockError}</p>}
                <button type="submit" className="small-button secondary-btn">
                  Unlock with PIN
                </button>
              </form>
            )}

            <div className="lock-footer-actions">
              <button
                type="button"
                className="danger-button lock-wipe-btn"
                onClick={handleFinishAndErase}
                title="Wipe current form and reset kiosk for the next citizen"
              >
                🗑️ Finish & Erase My Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save with PIN Modal */}
      {savePinModalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="save-pin-title">
          <div className="modal-dialog save-pin-modal">
            <div className="modal-header">
              <h2 id="save-pin-title">🔑 Save Form with PIN Protection</h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSavePinModalOpen(false)}
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            <div className="modal-content">
              {issuedPinData ? (
                <div className="pin-issued-success">
                  <div className="pin-success-icon">✓</div>
                  <h3>Form Saved Securely!</h3>
                  <p className="pin-instructions">
                    Please write down your Reference Code and PIN. You will need both to resume this form from any device or kiosk.
                  </p>

                  <div className="issued-credentials-box">
                    <div className="cred-item">
                      <span className="cred-label">Reference Code</span>
                      <strong className="cred-value cred-ref">{issuedPinData.referenceCode}</strong>
                    </div>
                    <div className="cred-item">
                      <span className="cred-label">4-Digit Access PIN</span>
                      <strong className="cred-value cred-pin">{issuedPinData.pin}</strong>
                    </div>
                  </div>

                  <p className="pin-security-hint">
                    🛡️ Protected by salted PBKDF2-HMAC-SHA256 (100,000 rounds). 5 failed attempts locks access for 5 minutes.
                  </p>

                  <div className="modal-actions">
                    <button
                      type="button"
                      className="small-button primary"
                      onClick={() => setSavePinModalOpen(false)}
                    >
                      Done & Continue Editing
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSaveWithPin} className="save-pin-form">
                  <p className="save-pin-desc">
                    Set a 4-digit PIN to securely protect your form. Only someone with your Reference Code and PIN can resume it.
                  </p>

                  <div className="pin-input-group">
                    <label className="pin-label">
                      <span>4-Digit PIN</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]{4}"
                        placeholder="e.g. 5821"
                        maxLength={4}
                        value={pinInput}
                        onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        autoFocus
                        required
                      />
                    </label>
                    <button
                      type="button"
                      className="small-button auto-pin-btn"
                      onClick={handleAutoGeneratePin}
                    >
                      🎲 Auto-Generate PIN
                    </button>
                  </div>

                  {pinModalError && (
                    <p className="saved-error pin-error-banner" role="alert">
                      {pinModalError}
                    </p>
                  )}

                  <div className="modal-actions">
                    <button
                      type="submit"
                      className="small-button primary"
                      disabled={savingPin || !/^\d{4}$/.test(pinInput.trim())}
                    >
                      {savingPin ? 'Saving & Hashing PIN…' : 'Save & Issue Reference Code'}
                    </button>
                    <button
                      type="button"
                      className="small-button"
                      onClick={() => setSavePinModalOpen(false)}
                      disabled={savingPin}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
