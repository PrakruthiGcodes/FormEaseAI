// Shows whether the FastAPI backend answered GET /api/health.
// Props:
//   state:   'checking' | 'online' | 'offline'
//   info:    the health response when online, e.g. { version: '1.0.0' }
//   error:   error text when offline
//   onRetry: function to check the backend again
export default function StatusBadge({ state, info, error, onRetry }) {
  if (state === 'checking') {
    return (
      <div className="status-badge status-checking" role="status">
        <span className="status-dot" />
        Checking backend…
      </div>
    )
  }

  if (state === 'online') {
    return (
      <div className="status-badge status-online" role="status">
        <span className="status-dot" />
        Backend connected · v{info?.version}
      </div>
    )
  }

  return (
    <div className="status-badge status-offline" role="alert" title={error}>
      <span className="status-dot" />
      Backend offline
      <button type="button" className="status-retry" onClick={onRetry}>
        Retry
      </button>
    </div>
  )
}
