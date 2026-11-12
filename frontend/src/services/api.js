// All calls from the React app to the FastAPI backend live in this file.
// The backend URL comes from VITE_API_BASE_URL (see frontend/.env.example).
// No API keys are used or stored in the frontend.

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

// Build an Error from a failed response.
// FastAPI sends { detail: "text" } or { detail: { message, code, ... } }.
async function errorFromResponse(response) {
  let message = `Request failed with status ${response.status}.`
  let code = null
  let details = {}
  try {
    const data = await response.json()
    if (typeof data.detail === 'string') {
      message = data.detail
    } else if (data.detail && typeof data.detail === 'object') {
      message = data.detail.message || message
      code = data.detail.code || null
      details = data.detail
    }
  } catch {
    // Not JSON: keep the generic message.
  }
  const error = new Error(message)
  error.code = code
  error.details = details
  error.status = response.status
  return error
}

// Wraps fetch so that a network failure gives a clear message.
async function request(path, options = {}) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, options)
  } catch {
    const error = new Error(`Cannot reach the backend at ${API_BASE_URL}. Check that it is running.`)
    error.code = 'backend_unreachable'
    throw error
  }
  if (!response.ok) {
    throw await errorFromResponse(response)
  }
  return response
}

const jsonHeaders = { 'Content-Type': 'application/json' }

// ----- Health and status -----

// GET /api/health
export async function fetchHealth() {
  const response = await request('/api/health')
  return response.json()
}

// GET /api/database/status
export async function fetchDatabaseStatus() {
  const response = await request('/api/database/status')
  return response.json()
}

// ----- Chat -----

// POST /api/chat
// payload: { message, history, form_data, language }
export async function sendChatMessage(payload) {
  const response = await request('/api/chat', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  })
  return response.json()
}

// ----- Form validation and PDF -----

// POST /api/form/validate
export async function validateForm(formData) {
  const response = await request('/api/form/validate', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ form_data: formData }),
  })
  return response.json()
}

// POST /api/pdf  -> Blob (PDF). disposition: 'inline' (preview) or 'attachment' (download)
export async function generatePdf(formData, language, disposition = 'attachment') {
  const response = await request(`/api/pdf?disposition=${disposition}`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ form_data: formData, language }),
  })
  return response.blob()
}

// ----- Saved forms (MongoDB) -----

// POST /api/forms
export async function createSavedForm(language) {
  const response = await request('/api/forms', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ language }),
  })
  return response.json()
}

// GET /api/forms
export async function listSavedForms() {
  const response = await request('/api/forms')
  return response.json()
}

// GET /api/forms/{id}
export async function getSavedForm(formId) {
  const response = await request(`/api/forms/${formId}`)
  return response.json()
}

// PUT /api/forms/{id}
// body: { messages, form_data, language, status: 'in_progress' | 'confirmed' }
export async function saveForm(formId, body) {
  const response = await request(`/api/forms/${formId}`, {
    method: 'PUT',
    headers: jsonHeaders,
    body: JSON.stringify(body),
  })
  return response.json()
}

// DELETE /api/forms/{id}
export async function deleteSavedForm(formId) {
  await request(`/api/forms/${formId}`, { method: 'DELETE' })
}
