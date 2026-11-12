import { useEffect, useRef, useState } from 'react'
import { generatePdf, validateForm } from '../services/api.js'
import { FORM_FIELDS } from '../utils/languages.js'

// Final review: edit values, validate, preview the PDF, confirm, download.
// The PDF is only created from validated values, and the backend checks again.
// Props:
//   formData:     values to review (from the chat/summary)
//   language:     language code for the PDF
//   onBack()      return to the chat
//   onConfirm(values) -> Promise<void>  store the confirmed values
export default function ReviewScreen({ formData, language, onBack, onConfirm }) {
  const [draft, setDraft] = useState(() => ({ ...formData }))
  const [errors, setErrors] = useState({})
  const [validated, setValidated] = useState(false)
  const [message, setMessage] = useState('')
  const [messageIsError, setMessageIsError] = useState(false)
  const [busy, setBusy] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')
  const previewUrlRef = useRef('')

  // Free the preview's object URL when it changes or the screen closes.
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    }
  }, [])

  function showMessage(text, isError = false) {
    setMessage(text)
    setMessageIsError(isError)
  }

  function replacePreview(url) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    previewUrlRef.current = url
    setPreviewUrl(url)
  }

  function editField(key, value) {
    setDraft((prev) => ({ ...prev, [key]: value.trim() ? value : null }))
    setValidated(false)
    setConfirmed(false)
    replacePreview('')
  }

  async function checkDetails() {
    setBusy('check')
    try {
      const result = await validateForm(draft)
      setDraft(result.form_data)
      setErrors(result.validation_errors)
      const ok = result.all_required_present
      setValidated(ok)
      if (ok) {
        showMessage('All details are valid. You can preview the PDF and confirm.')
      } else if (Object.keys(result.validation_errors).length > 0) {
        showMessage('Some values need correction. See the messages under each field.', true)
      } else {
        showMessage(`Please fill in: ${result.missing_fields.length} field(s) are still empty.`, true)
      }
    } catch (err) {
      showMessage(err.message, true)
    } finally {
      setBusy('')
    }
  }

  async function previewPdf() {
    setBusy('preview')
    try {
      const blob = await generatePdf(draft, language, 'inline')
      replacePreview(URL.createObjectURL(blob))
      showMessage('Preview ready. Check it, then confirm.')
    } catch (err) {
      showMessage(err.message, true)
    } finally {
      setBusy('')
    }
  }

  async function confirm() {
    setBusy('confirm')
    try {
      await onConfirm(draft)
      setConfirmed(true)
      showMessage('Form confirmed. You can now download the PDF.')
    } catch (err) {
      showMessage(err.message, true)
    } finally {
      setBusy('')
    }
  }

  async function download() {
    setBusy('download')
    try {
      const blob = await generatePdf(draft, language, 'attachment')
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'formease_form.pdf'
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err) {
      showMessage(err.message, true)
    } finally {
      setBusy('')
    }
  }

  return (
    <section className="review-screen" aria-labelledby="review-title">
      <div className="review-header">
        <button type="button" className="back-button" onClick={onBack}>
          ← Back to chat
        </button>
        <h2 id="review-title">Review your form</h2>
        <p className="review-subtitle">Check every value. Edit anything that is wrong, then create the PDF.</p>
      </div>

      <div className="review-body">
        <div className="review-fields">
          {FORM_FIELDS.map((field) => (
            <label key={field.key} className={`review-field ${errors[field.key] ? 'review-field-invalid' : ''}`}>
              <span className="review-label">{field.label}{!draft[field.key] && <em> (required)</em>}</span>
              <input
                className="review-input"
                value={draft[field.key] || ''}
                onChange={(event) => editField(field.key, event.target.value)}
                maxLength={300}
              />
              {errors[field.key] && <span className="field-error">{errors[field.key]}</span>}
            </label>
          ))}
        </div>

        <div className="review-preview">
          <div className="review-actions">
            <button type="button" className="small-button" onClick={checkDetails} disabled={busy !== ''}>
              {busy === 'check' ? 'Checking…' : 'Check details'}
            </button>
            <button type="button" className="small-button primary" onClick={previewPdf} disabled={!validated || busy !== ''}>
              {busy === 'preview' ? 'Creating preview…' : 'Preview PDF'}
            </button>
            <button type="button" className="small-button primary" onClick={confirm} disabled={!validated || confirmed || busy !== ''}>
              {confirmed ? 'Confirmed ✓' : busy === 'confirm' ? 'Confirming…' : 'Confirm details'}
            </button>
            <button type="button" className="small-button primary" onClick={download} disabled={!confirmed || busy !== ''}>
              {busy === 'download' ? 'Downloading…' : 'Download PDF'}
            </button>
          </div>

          {message && (
            <p className={messageIsError ? 'review-message review-message-error' : 'review-message'} role="status">
              {message}
            </p>
          )}

          {previewUrl ? (
            <iframe className="pdf-preview" src={previewUrl} title="PDF preview" />
          ) : (
            <div className="pdf-placeholder">The PDF preview appears here after the details are valid.</div>
          )}
        </div>
      </div>
    </section>
  )
}
