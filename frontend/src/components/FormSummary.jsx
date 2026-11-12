import { useState } from 'react'
import { FORM_FIELDS } from '../utils/languages.js'

// Side panel: progress, extracted details (editable), missing fields, and actions.
// Props:
//   formData:             current values { full_name: 'Ananya', age: null, ... }
//   fieldErrors:          { field: message } for values that failed validation
//   updatedFields:        fields changed by the latest reply (highlighted)
//   nextQuestion:         the question the assistant is asking now
//   conversationComplete: true when every field is filled
//   saveLabel:            text describing the save state, e.g. "Saved"
//   onEditField(field, value) -> Promise<string | null>  (error message or null)
//   onReview(), onSavedForms(), onNewForm()
export default function FormSummary({
  formData,
  fieldErrors,
  updatedFields,
  nextQuestion,
  conversationComplete,
  saveLabel,
  onEditField,
  onReview,
  onSavedForms,
  onNewForm,
}) {
  const [editing, setEditing] = useState(null) // field key being edited
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState('')
  // On phones the panel starts collapsed so the conversation has room. Desktop always shows it.
  const [open, setOpen] = useState(false)

  const total = FORM_FIELDS.length
  const completed = FORM_FIELDS.filter((field) => formData[field.key]).length
  const percent = Math.round((completed / total) * 100)

  function startEdit(field) {
    setEditing(field.key)
    setDraft(formData[field.key] || '')
    setLocalError('')
  }

  async function saveEdit(event) {
    event.preventDefault()
    setBusy(true)
    const error = await onEditField(editing, draft.trim() ? draft : null)
    setBusy(false)
    if (error) {
      setLocalError(error)
    } else {
      setEditing(null)
      setLocalError('')
    }
  }

  return (
    <aside className={`form-summary ${open ? 'open' : ''}`} aria-label="Collected form details">
      <div className="summary-header">
        <h2 className="summary-title">Form details</h2>
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

      <ul className="field-list">
        {FORM_FIELDS.map((field) => {
          const value = formData[field.key]
          const error = fieldErrors[field.key]
          const justUpdated = updatedFields.includes(field.key)
          let className = 'field-item'
          if (!value) className += ' field-missing'
          if (justUpdated) className += ' field-updated'
          if (error) className += ' field-invalid'

          if (editing === field.key) {
            return (
              <li key={field.key} className={className}>
                <form className="field-edit" onSubmit={saveEdit}>
                  <label className="field-label" htmlFor={`edit-${field.key}`}>
                    {field.label}
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
                <span className="field-label">{field.label}</span>
                <button
                  type="button"
                  className="edit-link"
                  onClick={() => startEdit(field)}
                  aria-label={`Edit ${field.label}`}
                >
                  Edit
                </button>
              </div>
              <span className="field-value">{value || 'Not yet provided'}</span>
              {error && <span className="field-error">{error}</span>}
            </li>
          )
        })}
      </ul>

      <div className="summary-actions">
        <button type="button" className="primary-action" onClick={onReview}>
          Review & create PDF
        </button>
        <div className="summary-secondary">
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
