import { useEffect, useRef, useState } from 'react'
import { generatePdf, validateForm, submitToPortal } from '../services/api.js'
import { FORM_FIELDS, DOMAIN_EXTRA_FIELDS, FIELD_LABELS_BY_LANG } from '../utils/languages.js'
import useSpeechSynthesis from '../hooks/useSpeechSynthesis.js'

// Final review: edit core & domain values, validate, read answers aloud, preview PDF, confirm, download, and dispatch portal submission.
export default function ReviewScreen({
  formData = {},
  englishFormData = {},
  language = 'en',
  onBack,
  onConfirm,
  formType = 'general',
  extraFields = {},
  englishExtraFields = {},
  formId = null,
  onFinishAndErase,
  slowVoice = false,
}) {
  const [useEnglish, setUseEnglish] = useState(language === 'en')
  const [draft, setDraft] = useState(() =>
    language === 'en' || !englishFormData ? { ...formData } : { ...englishFormData }
  )
  const [extraDraft, setExtraDraft] = useState(() =>
    language === 'en' || !englishExtraFields ? { ...extraFields } : { ...englishExtraFields }
  )
  const [errors, setErrors] = useState({})
  const [validated, setValidated] = useState(false)
  const [message, setMessage] = useState('')
  const [messageIsError, setMessageIsError] = useState(false)
  const [busy, setBusy] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submissionResult, setSubmissionResult] = useState(null)
  const [showPayload, setShowPayload] = useState(false)
  const [readingSummary, setReadingSummary] = useState(false)

  const speech = useSpeechSynthesis()
  const previewUrlRef = useRef('')

  // Free preview object URL on unmount or URL replacement
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
      speech.stop()
    }
  }, [speech])

  function showMessage(text, isError = false) {
    setMessage(text)
    setMessageIsError(isError)
  }

  function replacePreview(url) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    previewUrlRef.current = url
    setPreviewUrl(url)
  }

  function editCoreField(key, value) {
    setDraft((prev) => ({ ...prev, [key]: value.trim() ? value : null }))
    setValidated(false)
    setConfirmed(false)
    replacePreview('')
  }

  function editExtraField(key, value) {
    setExtraDraft((prev) => ({ ...prev, [key]: value.trim() ? value : null }))
    setValidated(false)
    setConfirmed(false)
    replacePreview('')
  }

  const activeLanguage = useEnglish ? 'en' : language
  const domainFields = DOMAIN_EXTRA_FIELDS[formType] || []

  // Read all filled answers aloud sequentially for visually impaired & illiterate users
  function handleReadAloudSummary() {
    if (readingSummary || speech.speaking) {
      speech.stop()
      setReadingSummary(false)
      showMessage('Stopped reading answers.')
      return
    }

    const lines = []
    const langLabels = FIELD_LABELS_BY_LANG[activeLanguage] || FIELD_LABELS_BY_LANG.en

    // Introduction line
    const introMap = {
      en: 'Reading your recorded application details.',
      kn: 'ನಿಮ್ಮ ದಾಖಲಾದ ಫಾರ್ಮ್ ವಿವರಗಳನ್ನು ಓದಲಾಗುತ್ತಿದೆ.',
      hi: 'आपके भरे हुए फॉर्म का विवरण पढ़ा जा रहा है।',
      mr: 'तुमच्या नोंदवलेल्या अर्जाचा तपशील वाचत आहे.',
      te: 'మీ దరఖాస్తు వివరాలను చదువుతున్నాము.',
      ta: 'உங்கள் பதிவு செய்யப்பட்ட விவரங்கள் வாசிக்கப்படுகின்றன.',
      ml: 'നിങ്ങളുടെ വിവരങ്ങൾ വായിക്കുന്നു.',
      bn: 'আপনার ফর্মের বিবরণ পড়া হচ্ছে।',
      gu: 'તમારી વિગતો વાંચવામાં આવી રહી છે.',
      pa: 'ਤੁਹਾਡੇ ਵੇਰਵੇ ਪੜ੍ਹੇ ਜਾ ਰਹੇ ਹਨ।',
    }
    lines.push(introMap[activeLanguage] || introMap.en)

    // Core fields
    FORM_FIELDS.forEach((f) => {
      const val = draft[f.key]
      if (val) {
        const label = langLabels[f.key] || f.label
        lines.push(`${label}: ${val}`)
      }
    })

    // Domain extra fields
    domainFields.forEach((df) => {
      const val = extraDraft[df.key]
      if (val) {
        lines.push(`${df.label}: ${val}`)
      }
    })

    if (lines.length <= 1) {
      showMessage('No answered details to read aloud yet.', true)
      return
    }

    const endMap = {
      en: 'Review complete. All details are recorded.',
      kn: 'ಪರಿಶೀಲನೆ ಪೂರ್ಣಗೊಂಡಿದೆ. ಎಲ್ಲಾ ವಿವರಗಳನ್ನು ದಾಖಲಿಸಲಾಗಿದೆ.',
      hi: 'समीक्षा पूरी हुई। सभी विवरण दर्ज हैं।',
      mr: 'तपासणी पूर्ण झाली. सर्व माहिती नोंदवली गेली आहे.',
    }
    lines.push(endMap[activeLanguage] || endMap.en)

    setReadingSummary(true)
    showMessage('Reading all answers aloud… Press stop to pause.')

    speech.speakSequence(lines, activeLanguage, {
      rate: slowVoice ? 0.75 : 1.0,
      onComplete: () => {
        setReadingSummary(false)
        showMessage('Finished reading all answers.')
      },
    })
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
        showMessage('All personal details are valid. You can preview the PDF, confirm, or dispatch to the portal.')
      } else if (Object.keys(result.validation_errors).length > 0) {
        showMessage('Some personal details need correction. Check the error markers.', true)
      } else {
        showMessage(`Please fill in remaining required fields (${result.missing_fields.length} core field(s) empty).`, true)
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
      const blob = await generatePdf(draft, activeLanguage, 'inline')
      replacePreview(URL.createObjectURL(blob))
      showMessage('PDF preview generated successfully. Verify details and confirm.')
    } catch (err) {
      showMessage(err.message, true)
    } finally {
      setBusy('')
    }
  }

  async function confirm() {
    setBusy('confirm')
    try {
      if (onConfirm) {
        await onConfirm(draft, extraDraft)
      }
      setConfirmed(true)
      showMessage('Form confirmed and saved. You can now download the official PDF or dispatch to the portal.')
    } catch (err) {
      showMessage(err.message, true)
    } finally {
      setBusy('')
    }
  }

  async function download() {
    setBusy('download')
    try {
      const blob = await generatePdf(draft, activeLanguage, 'attachment')
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = useEnglish
        ? `formease_${formType}_application_english.pdf`
        : `formease_${formType}_application_${language}.pdf`
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

  async function handlePortalSubmit() {
    setSubmitting(true)
    setMessage('')
    try {
      // Use standardized English payload for official portal dispatch
      const payload = {
        form_type: formType,
        english_form_data: useEnglish ? draft : (englishFormData || draft),
        english_extra_fields: useEnglish ? extraDraft : (englishExtraFields || extraDraft),
        form_id: formId,
      }
      const result = await submitToPortal(payload)
      setSubmissionResult(result)
      showMessage(`Successfully dispatched to ${result.target_portal}! Acknowledgement ID: ${result.acknowledgement_id}`)
    } catch (err) {
      showMessage(err.message || 'Failed to submit to government portal.', true)
    } finally {
      setSubmitting(false)
    }
  }

  const domainSectionTitles = {
    medical: '🏥 Hospital & Medical Specialized Fields',
    education: '🎓 Education & Academic Specialized Fields',
    government: '🏛️ Government Scheme Specialized Fields',
  }

  return (
    <section className="review-screen" aria-labelledby="review-title">
      <div className="review-header">
        <button type="button" className="back-button" onClick={onBack}>
          ← Back to chat
        </button>
        <h2 id="review-title">Review & Finalize Application</h2>
        <p className="review-subtitle">
          {useEnglish
            ? 'Official Form Collector View: review and export the application in standardized English.'
            : 'Check every value in your native language. Edit anything that is wrong, listen to it read aloud, then create the PDF or dispatch to portal.'}
        </p>

        {language !== 'en' && (
          <div className="review-lang-selector" role="group" aria-label="PDF language format">
            <span className="lang-toggle-label">Form Export Format:</span>
            <button
              type="button"
              className={`review-lang-btn ${!useEnglish ? 'active' : ''}`}
              onClick={() => {
                setUseEnglish(false)
                setDraft({ ...formData })
                setExtraDraft({ ...extraFields })
                setValidated(false)
                setConfirmed(false)
                replacePreview('')
              }}
            >
              👤 Citizen Native ({language.toUpperCase()})
            </button>
            <button
              type="button"
              className={`review-lang-btn ${useEnglish ? 'active' : ''}`}
              onClick={() => {
                setUseEnglish(true)
                setDraft(englishFormData && Object.keys(englishFormData).length > 0 ? { ...englishFormData } : { ...formData })
                setExtraDraft(englishExtraFields && Object.keys(englishExtraFields).length > 0 ? { ...englishExtraFields } : { ...extraFields })
                setValidated(false)
                setConfirmed(false)
                replacePreview('')
              }}
            >
              📋 Official Admin / Collector (English)
            </button>
          </div>
        )}
      </div>

      <div className="review-body">
        <div className="review-fields">
          <h3 className="review-section-heading">Personal Details (12 Canonical Fields)</h3>
          {FORM_FIELDS.map((field) => (
            <label key={field.key} className={`review-field ${errors[field.key] ? 'review-field-invalid' : ''}`}>
              <span className="review-label">
                {field.label}
                {!draft[field.key] && <em> (required)</em>}
              </span>
              <input
                className="review-input"
                value={draft[field.key] || ''}
                onChange={(event) => editCoreField(field.key, event.target.value)}
                maxLength={300}
              />
              {errors[field.key] && <span className="field-error">{errors[field.key]}</span>}
            </label>
          ))}

          {/* Domain Extra Fields */}
          {domainFields.length > 0 && (
            <div className="domain-review-block">
              <h3 className="review-section-heading domain-heading">
                {domainSectionTitles[formType] || 'Additional Domain Details'}
              </h3>
              {domainFields.map((df) => (
                <label key={df.key} className="review-field domain-review-field">
                  <span className="review-label">{df.label}</span>
                  <input
                    className="review-input"
                    value={extraDraft[df.key] || ''}
                    onChange={(event) => editExtraField(df.key, event.target.value)}
                    maxLength={300}
                  />
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="review-preview">
          <div className="review-actions">
            {/* Read All My Answers Aloud Button */}
            <button
              type="button"
              className={`small-button ${readingSummary ? 'reading-summary-active' : ''}`}
              onClick={handleReadAloudSummary}
              disabled={submitting || busy !== ''}
              title="Read all completed form answers aloud sequentially"
            >
              <span aria-hidden="true">{readingSummary ? '⏹️' : '🔊'}</span>
              <span>{readingSummary ? 'Stop Reading' : 'Read All My Answers Aloud'}</span>
            </button>

            <button
              type="button"
              className="small-button"
              onClick={checkDetails}
              disabled={busy !== '' || submitting}
            >
              {busy === 'check' ? 'Checking…' : 'Check details'}
            </button>
            <button
              type="button"
              className="small-button primary"
              onClick={previewPdf}
              disabled={!validated || busy !== '' || submitting}
            >
              {busy === 'preview' ? 'Creating preview…' : 'Preview PDF'}
            </button>
            <button
              type="button"
              className="small-button primary"
              onClick={confirm}
              disabled={!validated || confirmed || busy !== '' || submitting}
            >
              {confirmed ? 'Confirmed ✓' : busy === 'confirm' ? 'Confirming…' : 'Confirm details'}
            </button>
            <button
              type="button"
              className="small-button primary"
              onClick={download}
              disabled={!confirmed || busy !== '' || submitting}
            >
              {busy === 'download' ? 'Downloading…' : 'Download PDF'}
            </button>
            <button
              type="button"
              className="small-button portal-submit-btn"
              onClick={handlePortalSubmit}
              disabled={submitting || busy !== ''}
              title="Dispatch verified English payload to target government or healthcare intake portal"
            >
              {submitting ? 'Submitting to Portal…' : '🚀 Submit to Portal'}
            </button>
          </div>

          {message && (
            <p className={messageIsError ? 'review-message review-message-error' : 'review-message'} role="status">
              {message}
            </p>
          )}

          {/* Submission Receipt Card & Dispatched Payload Inspector */}
          {submissionResult && (
            <div className="submission-receipt-card" role="region" aria-label="Portal Submission Receipt">
              <div className="receipt-header">
                <span className="receipt-status-badge">✓ DISPATCHED</span>
                <h4 className="receipt-title">Portal Submission Receipt</h4>
              </div>
              <div className="receipt-meta-grid">
                <div className="receipt-meta-item">
                  <span className="receipt-meta-label">Acknowledgement ID</span>
                  <strong className="receipt-meta-value receipt-ack-id">{submissionResult.acknowledgement_id}</strong>
                </div>
                <div className="receipt-meta-item">
                  <span className="receipt-meta-label">Standard & Protocol</span>
                  <span className="receipt-meta-value protocol-pill">{submissionResult.protocol_standard}</span>
                </div>
                <div className="receipt-meta-item full-width">
                  <span className="receipt-meta-label">Target Portal</span>
                  <span className="receipt-meta-value">{submissionResult.target_portal}</span>
                </div>
                <div className="receipt-meta-item">
                  <span className="receipt-meta-label">Dispatched At</span>
                  <span className="receipt-meta-value">{new Date(submissionResult.submitted_at).toLocaleString()}</span>
                </div>
              </div>

              <div className="payload-inspector-container">
                <button
                  type="button"
                  className="payload-toggle-btn"
                  onClick={() => setShowPayload(!showPayload)}
                  aria-expanded={showPayload}
                >
                  {showPayload ? '▼ Hide Dispatched Payload' : '▶ View Dispatched Payload (JSON)'}
                </button>
                {showPayload && (
                  <pre className="payload-json-box">
                    <code>{JSON.stringify(submissionResult.dispatched_payload, null, 2)}</code>
                  </pre>
                )}
              </div>
            </div>
          )}

          {previewUrl ? (
            <iframe className="pdf-preview" src={previewUrl} title="PDF preview" />
          ) : (
            <div className="pdf-placeholder">The PDF preview appears here after the details are valid.</div>
          )}

          {/* Kiosk Wipe / Reset in Review Screen */}
          {onFinishAndErase && (
            <div className="review-kiosk-erase-container">
              <button
                type="button"
                className="danger-button kiosk-wipe-btn"
                onClick={onFinishAndErase}
                title="Wipe all data from memory and reset kiosk session"
              >
                🗑️ Finish & Erase My Data
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
