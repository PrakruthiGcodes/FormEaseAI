import { useState } from 'react'
import {
  FORM_FIELDS,
  FIELD_LABELS_BY_LANG,
  FIELD_EMPTY_PLACEHOLDERS,
  LANGUAGES,
  DOMAIN_EXTRA_FIELDS,
  SENSITIVE_FIELDS,
  maskFieldValue,
} from '../utils/languages.js'

// Side panel: progress, extracted details (editable), domain extra fields, PII masking, and actions.
export default function FormSummary({
  formData = {},
  englishFormData = {},
  language = 'en',
  adminMode = false,
  onToggleAdminMode,
  fieldErrors = {},
  updatedFields = [],
  nextQuestion,
  conversationComplete,
  saveLabel,
  onEditField,
  onReview,
  onSavedForms,
  onNewForm,
  formType = 'general',
  extraFields = {},
  englishExtraFields = {},
  onEditExtraField,
  privacyMask = true,
  onOpenSavePinModal,
}) {
  const [editing, setEditing] = useState(null) // { isExtra: boolean, key: string } or null
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState('')
  const [open, setOpen] = useState(false)
  const [peekedFields, setPeekedFields] = useState({})

  const currentLangObj = LANGUAGES.find((l) => l.code === language) || { label: 'English' }
  const displayData = adminMode ? (englishFormData || formData) : formData
  const displayExtra = adminMode ? (englishExtraFields || extraFields) : extraFields

  const extraFieldDefs = DOMAIN_EXTRA_FIELDS[formType] || []

  function getFieldLabel(key, englishLabel) {
    if (adminMode) return englishLabel
    return FIELD_LABELS_BY_LANG[language]?.[key] || englishLabel
  }

  // Count core fields + extra fields
  const totalCore = FORM_FIELDS.length
  const completedCore = FORM_FIELDS.filter((f) => displayData[f.key]).length

  const totalExtra = extraFieldDefs.length
  const completedExtra = extraFieldDefs.filter((f) => displayExtra[f.key]).length

  const total = totalCore + totalExtra
  const completed = completedCore + completedExtra
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0

  function triggerPeek(key) {
    setPeekedFields((prev) => ({ ...prev, [key]: true }))
    setTimeout(() => {
      setPeekedFields((prev) => ({ ...prev, [key]: false }))
    }, 5000)
  }

  function startEdit(fieldKey, isExtra = false) {
    setEditing({ isExtra, key: fieldKey })
    setDraft((isExtra ? displayExtra[fieldKey] : displayData[fieldKey]) || '')
    setLocalError('')
  }

  async function saveEdit(event) {
    event.preventDefault()
    if (!editing) return
    setBusy(true)
    const val = draft.trim() ? draft.trim() : null
    let error = null
    if (editing.isExtra) {
      if (onEditExtraField) {
        error = await onEditExtraField(editing.key, val)
      }
    } else {
      if (onEditField) {
        error = await onEditField(editing.key, val)
      }
    }
    setBusy(false)
    if (error) {
      setLocalError(error)
    } else {
      setEditing(null)
      setLocalError('')
    }
  }

  const domainCategoryTitles = {
    medical: '🏥 Medical & Clinical Details',
    education: '🎓 Education & Academic Details',
    government: '🏛️ Government Scheme Details',
  }

  return (
    <aside className={`form-summary ${open ? 'open' : ''}`} aria-label="Collected form details">
      <div className="summary-header">
        <h2 className="summary-title">
          {adminMode ? 'Collector details' : 'Form details'}
        </h2>
        <span className="summary-count">
          {completed} of {total}
        </span>
        <button
          type="button"
          className="summary-toggle"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? 'Hide' : 'Show'}
        </button>
      </div>

      <div className="summary-body">
        {/* Toggle between Citizen View and Admin / Form Collector View */}
        <div className="view-mode-bar" role="tablist" aria-label="View Mode">
          <button
            type="button"
            className={`view-mode-tab ${!adminMode ? 'active' : ''}`}
            onClick={() => onToggleAdminMode?.(false)}
            role="tab"
            aria-selected={!adminMode}
          >
            👤 Citizen View ({currentLangObj.label.split(' ')[0]})
          </button>
          <button
            type="button"
            className={`view-mode-tab ${adminMode ? 'active' : ''}`}
            onClick={() => onToggleAdminMode?.(true)}
            role="tab"
            aria-selected={adminMode}
          >
            📋 Admin / Collector
          </button>
        </div>

        {adminMode && (
          <div className="admin-mode-banner">
            <span>✓ English View: Standardized for official processing</span>
          </div>
        )}

        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
          <div className="progress-fill" style={{ width: `${percent}%` }} />
        </div>

        {saveLabel && <p className="save-label">{saveLabel}</p>}

        {conversationComplete ? (
          <p className="summary-complete">All details are collected. Review them before creating the PDF.</p>
        ) : (
          nextQuestion && (
            <div className="next-question">
              <span className="next-question-label">Next question</span>
              <p>{nextQuestion}</p>
            </div>
          )
        )}

        {/* Core Personal Fields */}
        <div className="field-group-header">
          <span>Personal Details (12 Fields)</span>
        </div>

        <ul className="field-list">
          {FORM_FIELDS.map((field) => {
            const rawValue = displayData[field.key]
            const label = getFieldLabel(field.key, field.label)
            const error = fieldErrors[field.key]
            const justUpdated = updatedFields.includes(field.key)
            const isSensitive = SENSITIVE_FIELDS.has(field.key)
            const isPeeked = Boolean(peekedFields[field.key])
            const maskedValue = privacyMask && rawValue ? maskFieldValue(field.key, rawValue, isPeeked) : rawValue

            let className = 'field-item'
            if (!rawValue) className += ' field-missing'
            if (justUpdated) className += ' field-updated'
            if (error) className += ' field-invalid'

            if (editing && !editing.isExtra && editing.key === field.key) {
              return (
                <li key={field.key} className={className}>
                  <form className="field-edit" onSubmit={saveEdit}>
                    <label className="field-label" htmlFor={`edit-${field.key}`}>
                      {label}
                    </label>
                    <input
                      id={`edit-${field.key}`}
                      className="field-input"
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      autoFocus
                      maxLength={300}
                    />
                    {localError && <p className="field-error">{localError}</p>}
                    <div className="field-edit-actions">
                      <button type="submit" className="small-button primary" disabled={busy}>
                        {busy ? 'Checking…' : 'Save'}
                      </button>
                      <button type="button" className="small-button" onClick={() => setEditing(null)} disabled={busy}>
                        Cancel
                      </button>
                    </div>
                  </form>
                </li>
              )
            }

            return (
              <li key={field.key} className={className}>
                <div className="field-row">
                  <span className="field-label">{label}</span>
                  <div className="field-actions-row">
                    {privacyMask && isSensitive && rawValue && (
                      <button
                        type="button"
                        className={`peek-button ${isPeeked ? 'peek-active' : ''}`}
                        onClick={() => triggerPeek(field.key)}
                        title="Reveal field for 5 seconds"
                        aria-label={`Peek ${label} for 5 seconds`}
                      >
                        {isPeeked ? 'Hide' : 'Peek 5s'}
                      </button>
                    )}
                    <button
                      type="button"
                      className="edit-link"
                      onClick={() => startEdit(field.key, false)}
                      aria-label={`Edit ${label}`}
                    >
                      Edit
                    </button>
                  </div>
                </div>
                <span className="field-value">
                  {maskedValue || (adminMode ? 'Not yet provided' : (FIELD_EMPTY_PLACEHOLDERS[language] || 'Not yet provided'))}
                </span>
                {error && <span className="field-error">{error}</span>}
              </li>
            )
          })}
        </ul>

        {/* Extra Domain Fields */}
        {extraFieldDefs.length > 0 && (
          <>
            <div className="field-group-header domain-group-header">
              <span>{domainCategoryTitles[formType] || 'Additional Domain Details'}</span>
            </div>

            <ul className="field-list">
              {extraFieldDefs.map((extraField) => {
                const rawValue = displayExtra[extraField.key]
                const label = extraField.label
                const isSensitive = SENSITIVE_FIELDS.has(extraField.key)
                const isPeeked = Boolean(peekedFields[extraField.key])
                const maskedValue = privacyMask && rawValue ? maskFieldValue(extraField.key, rawValue, isPeeked) : rawValue

                let className = 'field-item domain-field-item'
                if (!rawValue) className += ' field-missing'

                if (editing && editing.isExtra && editing.key === extraField.key) {
                  return (
                    <li key={extraField.key} className={className}>
                      <form className="field-edit" onSubmit={saveEdit}>
                        <label className="field-label" htmlFor={`edit-extra-${extraField.key}`}>
                          {label}
                        </label>
                        <input
                          id={`edit-extra-${extraField.key}`}
                          className="field-input"
                          value={draft}
                          onChange={(event) => setDraft(event.target.value)}
                          autoFocus
                          maxLength={300}
                        />
                        {localError && <p className="field-error">{localError}</p>}
                        <div className="field-edit-actions">
                          <button type="submit" className="small-button primary" disabled={busy}>
                            {busy ? 'Saving…' : 'Save'}
                          </button>
                          <button type="button" className="small-button" onClick={() => setEditing(null)} disabled={busy}>
                            Cancel
                          </button>
                        </div>
                      </form>
                    </li>
                  )
                }

                return (
                  <li key={extraField.key} className={className}>
                    <div className="field-row">
                      <span className="field-label">{label}</span>
                      <div className="field-actions-row">
                        {privacyMask && isSensitive && rawValue && (
                          <button
                            type="button"
                            className={`peek-button ${isPeeked ? 'peek-active' : ''}`}
                            onClick={() => triggerPeek(extraField.key)}
                            title="Reveal field for 5 seconds"
                            aria-label={`Peek ${label} for 5 seconds`}
                          >
                            {isPeeked ? 'Hide' : 'Peek 5s'}
                          </button>
                        )}
                        <button
                          type="button"
                          className="edit-link"
                          onClick={() => startEdit(extraField.key, true)}
                          aria-label={`Edit ${label}`}
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                    <span className="field-value">
                      {maskedValue || (adminMode ? 'Not yet provided' : (FIELD_EMPTY_PLACEHOLDERS[language] || 'Not yet provided'))}
                    </span>
                  </li>
                )
              })}
            </ul>
          </>
        )}

        <div className="summary-actions">
          <button type="button" className="primary-action" onClick={onReview}>
            Review & create PDF
          </button>
          <div className="summary-secondary">
            {onOpenSavePinModal && (
              <button
                type="button"
                className="reset-button pin-save-action"
                onClick={onOpenSavePinModal}
                title="Save form with custom or auto-generated 4-digit PIN"
              >
                🔑 Save & PIN
              </button>
            )}
            <button type="button" className="reset-button" onClick={onSavedForms}>
              Saved forms
            </button>
            <button type="button" className="reset-button" onClick={onNewForm}>
              New form
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
