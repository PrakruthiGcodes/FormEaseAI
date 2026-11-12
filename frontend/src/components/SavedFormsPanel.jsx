import { useEffect, useState } from 'react'
import { listSavedForms } from '../services/api.js'

// Lists saved forms so the user can resume one or start a new form.
// The list shows only status, progress, and dates. No names or other personal details.
// Props:
//   onResume(formId)  load and continue a saved form
//   onNew()           start a new form
//   onClose()         hide the panel
export default function SavedFormsPanel({ onResume, onNew, onClose }) {
  const [forms, setForms] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false
    listSavedForms()
      .then((items) => {
        if (!ignore) setForms(items)
      })
      .catch((err) => {
        if (!ignore) setError(err.message)
      })
    return () => {
      ignore = true
    }
  }, [])

  return (
    <section className="saved-panel" aria-labelledby="saved-title">
      <div className="saved-header">
        <h2 id="saved-title">Saved forms</h2>
        <button type="button" className="small-button" onClick={onClose}>
          Close
        </button>
      </div>

      {!forms && !error && <p className="saved-note">Loading saved forms…</p>}
      {error && <p className="saved-error" role="alert">{error}</p>}
      {forms && forms.length === 0 && <p className="saved-note">No saved forms yet.</p>}

      {forms && forms.length > 0 && (
        <ul className="saved-list">
          {forms.map((item) => (
            <li key={item.id} className="saved-item">
              <div>
                <strong>{item.status === 'confirmed' ? 'Confirmed form' : 'In progress'}</strong>
                <span className="saved-meta">
                  {item.completed_count} of {item.total_fields} fields · updated{' '}
                  {new Date(item.updated_at).toLocaleString()}
                </span>
              </div>
              <button type="button" className="small-button primary" onClick={() => onResume(item.id)}>
                {item.status === 'confirmed' ? 'Open' : 'Resume'}
              </button>
            </li>
          ))}
        </ul>
      )}

      <button type="button" className="primary-action" onClick={onNew}>
        Start a new form
      </button>
    </section>
  )
}
