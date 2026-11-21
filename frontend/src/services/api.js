// All calls from the React app to the FastAPI backend live in this file.
// The backend URL comes from VITE_API_BASE_URL (see frontend/.env.example).
// No API keys are used or stored in the frontend.

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

// Ephemeral per-session token generated in memory.
// Rotated on kiosk wipe to ensure strict session isolation.
let currentSessionToken = null

export function getSessionToken() {
  if (!currentSessionToken) {
    currentSessionToken =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  }
  return currentSessionToken
}

export function rotateSessionToken() {
  currentSessionToken =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  return currentSessionToken
}

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

function getAuthHeaders() {
  return {
    ...jsonHeaders,
    'X-Session-Token': getSessionToken(),
  }
}

// ----- Health, Status, and Form Types -----

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

// GET /api/form-types
export async function fetchFormTypes() {
  const response = await request('/api/form-types')
  return response.json()
}

// ----- Chat -----

// POST /api/chat
// payload: { message, history, form_data, english_form_data, language, form_type, extra_fields, english_extra_fields }
export async function sendChatMessage(payload) {
  const response = await request('/api/chat', {
    method: 'POST',
    headers: getAuthHeaders(),
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

// ----- Saved forms (MongoDB) with session isolation and PIN protection -----

// POST /api/forms
export async function createSavedForm(language, accessPin = null, formType = 'general') {
  const body = { language, form_type: formType }
  if (accessPin) body.access_pin = accessPin
  const response = await request('/api/forms', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  })
  return response.json()
}

// POST /api/forms/unlock
export async function unlockSavedForm(referenceCode, accessPin) {
  const response = await request('/api/forms/unlock', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      reference_code: referenceCode,
      access_pin: accessPin,
    }),
  })
  return response.json()
}

// GET /api/forms
export async function listSavedForms() {
  const response = await request('/api/forms', {
    headers: getAuthHeaders(),
  })
  return response.json()
}

// GET /api/forms/{id}
export async function getSavedForm(formId, accessPin = null) {
  const headers = getAuthHeaders()
  if (accessPin) headers['X-Access-Pin'] = accessPin
  const response = await request(`/api/forms/${formId}`, { headers })
  return response.json()
}

// PUT /api/forms/{id}
// body: { messages, form_data, language, status: 'in_progress' | 'confirmed', form_type, extra_fields, english_extra_fields }
export async function saveForm(formId, body, accessPin = null) {
  const headers = getAuthHeaders()
  if (accessPin) headers['X-Access-Pin'] = accessPin
  const response = await request(`/api/forms/${formId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  })
  return response.json()
}

// DELETE /api/forms/{id}
export async function deleteSavedForm(formId, accessPin = null) {
  const headers = getAuthHeaders()
  if (accessPin) headers['X-Access-Pin'] = accessPin
  await request(`/api/forms/${formId}`, {
    method: 'DELETE',
    headers,
  })
}

// ----- Standards-based portal submission -----

// POST /api/submit
// payload: { form_type, english_form_data, english_extra_fields, form_id }
export async function submitToPortal(payload) {
  const response = await request('/api/submit', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  })
  return response.json()
}
