import { DEFAULT_FORM_TYPES } from '../utils/languages.js'

// Large, accessible form-type selection cards shown above chat before first turn.
export default function WelcomeHero({
  selectedFormType = 'general',
  onSelectFormType,
  formTypes = DEFAULT_FORM_TYPES,
}) {
  const typesToRender = formTypes && formTypes.length > 0 ? formTypes : DEFAULT_FORM_TYPES

  const fieldBadgeMap = {
    general: '12 Core Personal Fields',
    medical: '12 Core + 4 Medical Fields',
    education: '12 Core + 4 Education Fields',
    government: '12 Core + 3 Scheme Fields',
  }

  const iconMap = {
    general: '👤',
    medical: '🏥',
    education: '🎓',
    government: '🏛️',
  }

  return (
    <section className="welcome" aria-labelledby="welcome-title">
      <h1 id="welcome-title" className="welcome-title">
        Welcome to FormEase AI
      </h1>
      <p className="welcome-subtitle">
        Your voice. Your language. Your form. Made easy.
      </p>

      <div className="form-type-selector-container">
        <h2 className="form-type-header">
          Select Form Type
        </h2>
        <p className="form-type-hint">
          Choose a domain to automatically collect standard details and specialized questions.
        </p>

        <div className="form-type-grid" role="radiogroup" aria-label="Application form domain type">
          {typesToRender.map((type) => {
            const isSelected = selectedFormType === type.id
            const icon = type.icon || iconMap[type.id] || '📝'
            const badge = fieldBadgeMap[type.id] || `${type.extra_fields?.length || 0} Domain Fields`

            return (
              <div
                key={type.id}
                role="radio"
                aria-checked={isSelected}
                tabIndex={0}
                className={`form-type-card ${isSelected ? 'active' : ''}`}
                onClick={() => onSelectFormType?.(type.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelectFormType?.(type.id)
                  }
                }}
              >
                <div className="form-type-card-top">
                  <span className="form-type-card-icon" aria-hidden="true">
                    {icon}
                  </span>
                  <span className="form-type-card-badge">
                    {badge}
                  </span>
                </div>
                <h3 className="form-type-card-title">{type.title}</h3>
                <p className="form-type-card-desc">{type.description}</p>
                <div className="form-type-card-footer">
                  <span className={`form-type-select-status ${isSelected ? 'selected' : ''}`}>
                    {isSelected ? 'Selected ✓' : 'Select'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
