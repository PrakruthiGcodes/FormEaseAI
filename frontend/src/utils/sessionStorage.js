// Keeps the chat and form data for the current browser tab (sessionStorage).
// Storage can be blocked (private mode, disabled site data), so every call
// is wrapped in try/catch. If storage fails, the app still works; the
// conversation is just not kept after a page reload.

const STORAGE_KEY = 'formease.session.v1'

export function loadSavedSession() {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveSession(session) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } catch {
    // Ignore: saving is a convenience, not required.
  }
}

export function clearSavedSession() {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore.
  }
}
