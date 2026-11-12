import { useCallback, useEffect, useState } from 'react'
import Header from './components/Header.jsx'
import WelcomeHero from './components/WelcomeHero.jsx'
import ChatWindow from './components/ChatWindow.jsx'
import ChatInput from './components/ChatInput.jsx'
import ModeIndicator from './components/ModeIndicator.jsx'
import FormSummary from './components/FormSummary.jsx'
import ReviewScreen from './components/ReviewScreen.jsx'
import SavedFormsPanel from './components/SavedFormsPanel.jsx'
import useSpeechSynthesis from './hooks/useSpeechSynthesis.js'
import {
  createSavedForm,
  fetchDatabaseStatus,
  fetchHealth,
  getSavedForm,
  saveForm,
  sendChatMessage,
  validateForm,
} from './services/api.js'
import { FORM_FIELDS } from './utils/languages.js'
import { VOICE_LANGUAGES, hasVoiceSupport } from './utils/speech.js'
import { clearSavedSession, loadSavedSession, saveSession } from './utils/sessionStorage.js'
import { getSpeakReplies, setSpeakReplies } from './utils/storage.js'
import './App.css'

// Must match the backend limits (backend/app/core/config.py and schemas).
const MAX_HISTORY_MESSAGES = 30
const MAX_SAVED_MESSAGES = 200
const SAVE_DELAY_MS = 800

function emptyFormData() {
  return Object.fromEntries(FORM_FIELDS.map((field) => [field.key, null]))
}

function freshSession(language = 'en') {
  return {
    messages: [],
    formData: emptyFormData(),
    language,
    nextQuestion: null,
    conversationComplete: false,
    updatedFields: [],
    validationErrors: {},
    status: 'in_progress',
    formId: null,
    nextId: 1,
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
  const values = detail.form_data
  return {
    ...previous,
    messages: detail.messages.map((turn, index) => ({
      id: index + 1,
      role: turn.role,
      text: turn.content,
    })),
    formData: values,
    language: detail.language,
    status: detail.status,
    formId: detail.id,
    nextQuestion: null,
    conversationComplete: detail.missing_fields.length === 0,
    updatedFields: [],
    validationErrors: {},
    nextId: detail.messages.length + 1,
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

  const { messages, formData, language, nextQuestion, conversationComplete, updatedFields, status, formId } =
    session

  const speech = useSpeechSynthesis()

  // Keep the chat and form for this browser tab.
  useEffect(() => {
    saveSession(session)
  }, [session])

  // Start-up: check the backend and the database, then restore the saved form if any.
  useEffect(() => {
    let ignore = false

    fetchHealth()
      .then((info) => {
        if (!ignore) setBackend({ state: 'online', info, error: '' })
      })
      .catch((err) => {
        if (!ignore) setBackend({ state: 'offline', info: null, error: err.message })
      })

    async function loadDatabase() {
      let status = { available: false, message: 'MongoDB status unknown.' }
      try {
        status = await fetchDatabaseStatus()
      } catch {
        status = { available: false, message: 'Cannot reach the backend to check MongoDB.' }
      }
      if (ignore) return
      setDatabase({ checked: true, available: Boolean(status.available), message: status.message })

      const storedId = loadSavedSession()?.formId
      if (status.available && storedId) {
        try {
          const detail = await getSavedForm(storedId)
          if (!ignore) setSession((prev) => sessionFromSaved(detail, prev))
        } catch (err) {
          // The saved form was removed. Start fresh; a new record is created on the first message.
          if (!ignore && err.status === 404) setSession((prev) => ({ ...prev, formId: null }))
        }
      }
    }
    loadDatabase()

    return () => {
      ignore = true
    }
  }, [])

  // Autosave the form to MongoDB shortly after each change.
  useEffect(() => {
    if (!database.available || !formId) return undefined
    const timer = setTimeout(async () => {
      setSaveState({ state: 'saving', message: '' })
      try {
        await saveForm(formId, {
          messages: toHistory(messages).slice(-MAX_SAVED_MESSAGES),
          form_data: formData,
          language,
          status,
        })
        setSaveState({ state: 'saved', message: '' })
      } catch (err) {
        setSaveState({ state: 'error', message: err.message })
      }
    }, SAVE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [messages, formData, language, status, formId, database.available])

  // Creates a database record on first use (not at page load, to avoid empty records).
  // Never throws: if saving is unavailable the conversation simply continues without it.
  const ensureFormId = useCallback(async () => {
    if (formId || !database.available) return formId
    try {
      const created = await createSavedForm(language)
      setSession((prev) => ({ ...prev, formId: created.id }))
      return created.id
    } catch (err) {
      setSaveState({ state: 'error', message: err.message })
      return null
    }
  }, [formId, database.available, language])

  function setLanguage(code) {
    setSession((prev) => ({ ...prev, language: code }))
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

  // Send a message (typed or spoken) to POST /api/chat.
  async function handleSend(text) {
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
        language: session.language,
      })
      setSession((prev) => ({
        ...prev,
        messages: [...prev.messages, { id: prev.nextId, role: 'assistant', text: data.reply }],
        formData: data.extracted_data,
        nextQuestion: data.next_question,
        conversationComplete: data.conversation_complete,
        updatedFields: data.updated_fields,
        validationErrors: data.validation_errors || {},
        status: 'in_progress',
        nextId: prev.nextId + 1,
      }))
      if (speakReplies) speech.speak(data.reply, session.language)
    } catch (err) {
      setSession((prev) => ({
        ...prev,
        messages: [...prev.messages, { id: prev.nextId, role: 'assistant', text: err.message, isError: true }],
        nextId: prev.nextId + 1,
      }))
    } finally {
      setIsSending(false)
    }
  }

  // Edit one value from the summary panel. Returns an error message, or null if saved.
  async function handleEditField(field, value) {
    try {
      const result = await validateForm({ ...formData, [field]: value })
      if (result.validation_errors[field]) return result.validation_errors[field]
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

  // Called by the review screen after the values pass validation.
  async function handleConfirm(values) {
    setSession((prev) => ({ ...prev, formData: values, status: 'confirmed' }))
    if (database.available) {
      const id = await ensureFormId()
      if (!id) throw new Error('The form could not be saved, so it was not confirmed in the database. Try again.')
      await saveForm(id, {
        messages: toHistory(messages).slice(-MAX_SAVED_MESSAGES),
        form_data: values,
        language,
        status: 'confirmed',
      })
      setSaveState({ state: 'saved', message: '' })
    }
  }

  async function handleResume(id) {
    try {
      const detail = await getSavedForm(id)
      setSession((prev) => sessionFromSaved(detail, prev))
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
    setSession(freshSession(language))
    setSaveState({ state: 'idle', message: '' })
    setView('chat')
  }

  function toggleSpeak(enabled) {
    setSpeakRepliesState(enabled)
    setSpeakReplies(enabled)
    if (!enabled) speech.stop()
  }

  // Save-state text shown in the summary panel.
  let saveLabel = ''
  if (database.checked && !database.available) {
    saveLabel = 'Not saved: MongoDB is offline. Start MongoDB to save and resume forms.'
  } else if (saveState.state === 'saving') {
    saveLabel = SAVE_LABELS.saving
  } else if (saveState.state === 'saved') {
    saveLabel = SAVE_LABELS.saved
  } else if (saveState.state === 'error') {
    saveLabel = SAVE_LABELS.error
  }

  const voiceLanguage = hasVoiceSupport(language) ? VOICE_LANGUAGES[language].label : null

  return (
    <div className="app-shell">
      <Header
        language={language}
        onLanguageChange={setLanguage}
        backend={backend}
        onRetry={retryBackend}
        speakReplies={speakReplies}
        onToggleSpeak={toggleSpeak}
        speechOutputSupported={speech.supported}
      />

      {view === 'review' ? (
        <main className="app-main">
          <ReviewScreen
            formData={formData}
            language={language}
            onBack={() => setView('chat')}
            onConfirm={handleConfirm}
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
              ) : (
                <>
                  {messages.length === 0 && <WelcomeHero />}
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
              fieldErrors={session.validationErrors}
              updatedFields={updatedFields}
              nextQuestion={nextQuestion}
              conversationComplete={conversationComplete}
              saveLabel={saveLabel}
              onEditField={handleEditField}
              onReview={() => setView('review')}
              onSavedForms={() => setView('saved')}
              onNewForm={startNewForm}
            />
          </div>
        </main>
      )}

      {view !== 'review' && (
        <footer className="app-footer">
          <ModeIndicator speechInputSupported={speech.supported} voiceLanguage={voiceLanguage} />
          <ChatInput onSend={handleSend} disabled={isSending} languageCode={language} />
        </footer>
      )}
    </div>
  )
}

export default App
