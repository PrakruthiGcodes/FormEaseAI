# FormEase AI

**Your voice. Your language. Your form. Made easy.**

FormEase AI is a conversational assistant that helps people fill in an application form by talking or typing in English, Hindi, Kannada or Telugu. An AI model (Google Gemini) reads each answer, fills in the form fields, asks for what is still missing, and lets the user review, correct, save, and download the finished form as a PDF.

> **Status: MVP.** Core features are implemented and tested offline (114 backend tests, frontend lint and build; all re-run in the final release audit on 2026-11-05). **The live Gemini conversation is not currently verified:** the live test suite is **BLOCKED BY QUOTA** (the daily free-tier limit on the configured key is exhausted). Kannada, Telugu and Hindi live conversations have **not** been tested. See [Test status](#test-status) and [Limitations](#limitations).

## Test status

| Area | Status | Notes |
|---|---|---|
| Offline backend tests (114) | **Passing** (re-run 2026-11-05: 114 passed, 0 skipped) | No network or API key needed. Gemini is blocked in these tests by design. Includes 12 tests added in this release for PDF rendering and MongoDB failures. |
| Frontend lint and production build | **Passing** (re-run 2026-11-05) | `npm run lint` exits 0; `npm run build` produces 35 modules. |
| Browser workflow: save, resume, reload, edit, correct, confirm, download (18 checks) | **Passing** (last run before this release) | Against a live MongoDB 4.4 server. Seeded with an API-created partial form because Gemini is quota-blocked. Not re-run after the PDF and MongoDB changes. |
| Validation and missing-field detection | **Passing** | Rule tests plus browser checks. Names in Hindi, Kannada and Telugu are accepted (fixed in this release). |
| PDF in English, Hindi, Kannada, Telugu | **Fixed and verified** (Windows, Microsoft Edge, Nirmala UI) | Telugu shaping fixed by rendering with Chromium. Telugu words ("స్త్రీ", "కర్ణాటక") checked by pixel comparison against an approved image and by text search. Hindi, Kannada and English rendered and inspected. Re-checked 2026-11-05 through the live server: HTTP 200 and a valid PDF for all four languages, with every typed value (including Indic values) present in the text layer, and Hindi, Kannada and Telugu page 1 inspected visually. Not tested on Linux or macOS. |
| Document upload and OCR | **Not implemented** | No code exists for uploading documents or reading them with OCR. |
| Live Gemini: model availability | **BLOCKED BY QUOTA** | Key accepted and `gemini-3.5-flash` is listed as supporting text generation. The generation check hit the daily limit. |
| Live Gemini: Tests 1–6 (English conversations) | **BLOCKED BY QUOTA** | Not run. The last complete passing run predates later changes to validation and the model check. Re-checked 2026-11-05: still BLOCKED BY QUOTA (7 skipped, no conversation run). |
| Live Kannada, Telugu, Hindi conversations | **NOT VERIFIED** | Never run against the live API. |
| Speech input and read-aloud | **Partly verified** | Browser UI states and error messages tested; transcription accuracy and non-English voices not tested. |
| PDF generation (English, Hindi, Kannada, Telugu) | **Passing** | Automated tests plus visual inspection of each language. See the PDF row above. |
| MongoDB failure handling | **Fixed and verified** (offline tests and a live uvicorn server with an unreachable MongoDB) | Failures return a structured 503 JSON error (`code: database_unavailable`). No credentials, hosts or stack traces are returned. **Not verified:** MongoDB stopping in the middle of a live browser session. |
| MongoDB save and resume | **Passing** | Tested against a live MongoDB 4.4.31 server. Re-run 2026-11-05 on a live uvicorn server: create, partial save, resume, confirm (incomplete refused, complete accepted), list and delete all behaved as specified. |
| Secrets not in source files | **Checked by file scan** (2026-11-05) | No key or encryption value appears outside `backend/.env`, including `frontend/dist`. The project is not its own git repository, so `git ls-files` could not be used (see Limitations). |
| Frontend UI unchanged | **NOT VERIFIED** | No baseline or git history to diff against. |

---

## Features

| Area | What it does |
|---|---|
| Conversation | One question at a time. Understands incomplete and conversational answers. Remembers earlier answers in the same conversation and does not ask again for known fields. |
| Languages | English, Hindi, Kannada and Telugu are the target languages for conversation, voice input and PDFs. **Live AI conversations in Hindi, Kannada and Telugu have not been verified** (see Test status). Malayalam, Bengali, Marathi, Gujarati, Punjabi and Tamil are selectable and passed to the AI, but are **not tested**. |
| Voice input | Browser speech recognition (Web Speech API) for English, Hindi, Kannada and Telugu. Editable transcript before sending. Stop button and clear error messages. |
| Voice output | Browser text-to-speech for replies, with a toggle and a Stop button. |
| Field extraction | 12 fields: full name, age, date of birth, gender, mobile number, email, address, city, state, PIN code, occupation, education. The AI never invents a value; values not stated stay empty. |
| Validation | Every value is checked and normalised (for example, mobile numbers, PIN codes, dates, email). Invalid values are rejected with a message. |
| Editing | Edit any field in the summary panel, or on the review screen. Each edit is validated. |
| Review and confirm | Review screen with preview, confirmation (blocked until every field is valid), and PDF download. |
| PDF | Generated by Chromium (through Playwright), so Indian scripts are shaped correctly. ReportLab is used only if no browser is available. Includes every confirmed field. Refuses to generate while a field is missing or invalid. |
| Save and resume | Forms are saved to MongoDB as the user works. Saved forms can be resumed, opened, or a new form started. Personal data is encrypted before it is stored. |
| Resilience | Clear messages when Gemini quota is used up, the key is rejected, the network is down, or MongoDB is offline. No fake AI replies are ever shown. |

---

## Architecture

```
┌──────────────────────────── Browser (React + Vite) ────────────────────────────┐
│  Chat · Voice (Web Speech API) · Form summary · Review · Saved forms           │
│  services/api.js  ──HTTP JSON──┐                                               │
└────────────────────────────────┼───────────────────────────────────────────────┘
                                 ▼
┌──────────────────────── Backend (FastAPI, Python 3.13) ────────────────────────┐
│  api/routes/      thin HTTP layer: health, chat, form, pdf, forms, gemini      │
│  services/        chat_service (merge + completion logic)                      │
│                   gemini_service (the only module that calls Google Gemini)    │
│                   validation (field rules)  ·  pdf_service (Chromium)          │
│                   form_store (save/resume in MongoDB)                          │
│  core/            config (.env) · crypto (Fernet) · database (MongoDB client)  │
│  schemas/         Pydantic request/response and Gemini output models           │
└──────┬──────────────────────────────┬───────────────────────────────┬──────────┘
       ▼                              ▼                               ▼
 Google Gemini API            MongoDB (forms collection)       Chromium (PDF bytes)
 (structured JSON output)     encrypted messages + values       in memory, not stored
```

**Key design points**

- **The AI proposes, the code decides.** Gemini returns extracted values as structured JSON. The backend validates them, merges them into the form, and works out missing and completed fields itself.
- **Nothing is invented.** The prompt forbids guessing, and invalid values are rejected rather than changed.
- **Secrets stay on the server.** The Gemini key is read from `backend/.env` and is never sent to the browser or written to logs.
- **MongoDB is optional.** Without it the chat and PDF still work; saving and resuming show a clear "not saved" message.

### Project structure

```
FormEaseAI/
├── README.md
├── .gitignore                     # keeps .env, .venv, node_modules out of git
├── backend/
│   ├── .env.example               # template for secrets and settings
│   ├── requirements.txt           # runtime dependencies (pinned)
│   ├── requirements-dev.txt       # test-only dependencies (pinned)
│   ├── app/
│   │   ├── main.py                # app, CORS, error handlers, routers
│   │   ├── core/                  # config.py, crypto.py, database.py
│   │   ├── api/routes/            # health.py, chat.py, form.py, forms.py, gemini.py
│   │   ├── services/              # chat_service, gemini_service, validation,
│   │   │                          # pdf_service, form_store
│   │   └── schemas/chat.py        # all Pydantic models and field definitions
│   └── tests/                     # offline tests (incl. PDF visual regression), live Gemini tests
│       └── fixtures/pdf/          # approved PDF rendering used by the regression test
└── frontend/
    ├── .env.example               # VITE_API_BASE_URL (non-secret)
    ├── package.json
    └── src/
        ├── App.jsx                # state, autosave, review/saved views
        ├── components/            # chat, input, summary, review, saved forms, header
        ├── hooks/                 # useSpeechRecognition, useSpeechSynthesis
        ├── services/api.js        # every call to the backend
        └── utils/                 # languages, speech, storage helpers
```

---

## Requirements

| Software | Version used | Notes |
|---|---|---|
| Windows 10/11 | Windows 11 | Steps below are for PowerShell. The Nirmala UI font (used for Indian scripts in PDFs) is a Windows font. |
| Python | 3.13.x | Use the `py -3.13` launcher on Windows. |
| Node.js | 24.x | Vite 8 needs Node 20.19+ or 22.12+. |
| MongoDB Server | 4.4+ (tested with 4.4.31) | Optional. Required only to save and resume forms. A current MongoDB or MongoDB Atlas is recommended; 4.4 is end-of-life. |
| Google Gemini API key | — | From Google AI Studio. Required for AI replies. |
| Microsoft Edge or Google Chrome | current | Required for voice input (speech recognition). Also used to draw PDFs, if installed. |
| Chromium for PDFs | Playwright 1.56 | PDFs are printed by an installed Edge or Chrome, or by Playwright's own Chromium (`python -m playwright install chromium`). Without one, the app falls back to ReportLab, which cannot shape Indic scripts. |

---

## Setup

### 1. Backend

```powershell
cd FormEaseAI\backend
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

Create `backend\.env` (copy `backend\.env.example` and fill in the values):

```ini
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-3.5-flash
FORM_ENCRYPTION_KEY=generated-key-see-below
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=formease_ai
CORS_ORIGINS=http://localhost:5173
```

Generate the encryption key once and store it in `.env`:

```powershell
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

> **Keep `FORM_ENCRYPTION_KEY` safe.** Without it, saved forms cannot be read. Never commit `.env`.

### 2. Frontend

```powershell
cd FormEaseAI\frontend
npm install
```

Optional: copy `frontend\.env.example` to `frontend\.env.local` to change `VITE_API_BASE_URL` (default `http://localhost:8000`).

### 3. MongoDB (optional)

Start a MongoDB server on `localhost:27017`. Check it with:

```powershell
Get-NetTCPConnection -LocalPort 27017 -State Listen
```

---

## Running the application

Open three terminals.

```powershell
# Terminal 1: MongoDB (if not already running as a service)
# Start your MongoDB server; it must listen on localhost:27017.

# Terminal 2: backend
cd FormEaseAI\backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000

# Terminal 3: frontend
cd FormEaseAI\frontend
npm run dev
```

Open **http://localhost:5173**. The header shows "Backend connected" when the API is reachable.

---

## API endpoints

Base URL: `http://localhost:8000`. Interactive documentation: `/docs`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Backend status, application name and version. |
| GET | `/api/database/status` | Whether MongoDB is reachable. |
| GET | `/api/gemini/status` | Whether the configured Gemini model accepts requests (one small request). Never returns the key. |
| POST | `/api/chat` | Send a message with conversation history and current form data. Returns the reply, extracted values, validation errors, missing and completed fields, next question, completion flag, and detected language. |
| POST | `/api/form/validate` | Check and normalise form values (used by the summary and review screens). |
| POST | `/api/pdf` | Generate the PDF. Use `?disposition=inline` for preview or the default `attachment` for download. Returns 422 if any field is missing or invalid. |
| POST | `/api/forms` | Create a saved form (MongoDB). |
| GET | `/api/forms` | List saved forms: status, progress and dates only (no names). |
| GET | `/api/forms/{id}` | Load one saved form (decrypted) to resume it. |
| PUT | `/api/forms/{id}` | Save the form's messages, values, language and status. Confirming requires every field. |
| DELETE | `/api/forms/{id}` | Delete a saved form. |

**Error format.** Errors return JSON with a `detail` field. Gemini errors include a `code`, for example `daily_quota_exceeded`, `invalid_api_key`, `quota_exceeded`, `model_unavailable`, `network_error`, `service_unavailable`.

| HTTP status | Meaning |
|---|---|
| 400 | Empty message. |
| 422 | Invalid input, unsupported language, incomplete or invalid form data. |
| 429 | Gemini rate limit or daily quota reached. |
| 502 | Gemini rejected the key or model, or returned unusable output. |
| 503 | Gemini or MongoDB unreachable, or encryption key missing. Database errors return `{"detail": "<message>", "code": "database_unavailable"}`. Credentials, hosts, file paths and stack traces are never returned; the error is logged by type with credentials removed. |

---

## Configuration reference

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `GEMINI_API_KEY` | For AI replies | — | Gemini API key. Server-side only. |
| `GEMINI_MODEL` | No | `gemini-3.5-flash` | Model name. Check `/api/gemini/status`. |
| `FORM_ENCRYPTION_KEY` | For saving | — | Fernet key that encrypts saved forms and chat history. |
| `MONGODB_URI` | No | `mongodb://localhost:27017` | MongoDB connection. |
| `MONGODB_DB_NAME` | No | `formease_ai` | Database name. |
| `CORS_ORIGINS` | No | `http://localhost:5173,http://127.0.0.1:5173` | Browser origins allowed to call the API. |
| `PDF_BROWSER_PATH` | No | — | Full path to a Chromium-based browser (`.exe`) for PDF rendering. If not set, the app tries Playwright's Chromium, then Edge, then Chrome. |
| `VITE_API_BASE_URL` | No | `http://localhost:8000` | Frontend: backend URL. Not secret. |

---

## Testing

```powershell
cd FormEaseAI\backend
.\.venv\Scripts\python.exe -m pytest tests -v --ignore=tests/test_live_gemini.py   # offline suite
.\.venv\Scripts\python.exe -m pytest tests/test_live_gemini.py -v                   # real Gemini (needs quota)

cd ..\frontend
npm run lint
npm run build
```

- **Offline suite:** validation rules, merge logic, Gemini error mapping (Gemini is mocked), PDF content, endpoints, MongoDB save and resume (uses a separate `formease_test` database that is dropped afterwards; skipped if MongoDB is down), and behaviour when MongoDB is unreachable or fails mid-request.
- **PDF visual regression (`tests/test_pdf_regression.py`):** rasterises the Telugu name cell with PDFium and compares it with `tests/fixtures/pdf/telugu_name_value.png`, which was approved by inspection. A negative control confirms the old ReportLab output fails the same comparison. These tests are skipped with a reason if Chromium or the Nirmala UI font is missing. Only regenerate the golden image after looking at the new rendering.
- **Live suite:** calls the real Gemini API for model availability and six English conversation scenarios. Skipped automatically without a key. One quota check runs first. If the daily or per-minute quota is exhausted, every live test is reported as **BLOCKED BY QUOTA** (a skip, not a failure), and the summary explains it. Other errors, such as an invalid key or unavailable model, still fail.
- **Retry policy:** temporary rate limits and server overload are retried once after 30 seconds. Daily quota errors are never retried.
- **Blocking live calls in offline tests:** a fixture in `tests/conftest.py` refuses any real Gemini call from a test that is not marked `live`, so the offline suite cannot depend on the network or quota.

---

## Privacy and security

- **Gemini receives conversation text.** Every message is sent to Google's Gemini API to be processed. Review Google's terms for your use case before collecting real personal data.
- **Encrypted at rest.** Messages and form values are encrypted with Fernet before MongoDB stores them. Only status, counts and dates are stored in clear text.
- **No personal data in logs.** The backend logs HTTP status codes and error categories only. Database errors are logged by type. Form values and messages are never logged.
- **No secrets in the browser.** The frontend bundle contains no API keys. The Gemini key is only read by the backend.
- **Input limits.** Messages are limited to 1,000 characters, history to 30 turns, and each field to 300 characters. Saved-form IDs must be UUIDs.
- **Browser storage.** The current conversation is kept in `sessionStorage` (cleared when the tab closes). The read-aloud preference is kept in `localStorage`.
- **Local use only.** CORS allows only the local dev server. This is not configured for public deployment, and there is no user authentication.

---

## Limitations

- **Gemini quota.** The free tier allows a small number of requests per day, so the AI conversation can stop mid-session. The app shows the reason clearly; it does not fake a reply.
- **Live AI quality is not verified in this release.** Automated tests use a mocked Gemini. The live suite is currently BLOCKED BY QUOTA. It must run with a key that has quota before the conversation behaviour can be claimed.
- **Kannada, Telugu and Hindi conversations are not verified.** No live conversation in these languages has been run. The language selector and prompt support them, but they are untested.
- **Speech recognition needs the browser's speech service.** Chrome and Edge send audio to their own speech service, so it needs internet access. Transcription accuracy was not measured. Firefox and Safari do not provide this API.
- **Voices depend on the device.** Text-to-speech uses installed voices. If no Hindi, Kannada or Telugu voice is installed, the reply is read in the default voice and the app says so.
- **PDF needs a Chromium-based browser.** PDFs are printed by Edge, Chrome or Playwright's Chromium, at about one second per PDF. Without a browser the app uses ReportLab, which does not shape Indic scripts (Telugu vowel signs will look wrong); a warning is logged. Telugu rendering was verified only on Windows with Microsoft Edge 156 and Nirmala UI.
- **PDF text layer.** The page is printed by the browser. The typed values are also added as invisible text so search and copy return the exact characters (the browser's own text layer does not always extract Telugu conjuncts correctly). How each PDF viewer handles copying from this layer has not been tested.
- **Document upload and OCR are not implemented.** Users type or speak their details; they cannot upload an ID or form to be read.
- **PDF font is Windows-specific.** The browser uses Nirmala UI when present (Noto Sans fonts are listed for other systems). The ReportLab fallback uses Nirmala UI when present and Helvetica otherwise, which supports English only.
- **Field validation is rule-based.** It checks format and plausibility, not whether a value is real (for example, whether a mobile number is in use or a PIN code matches the city).
- **One conversation per form, no accounts.** Anyone who can open the app can see the saved forms list. There is no login.
- **MongoDB 4.4 is end-of-life.** It works, but a current MongoDB version is recommended.
- **Losing `FORM_ENCRYPTION_KEY` makes saved forms unreadable.** Back it up securely.
- **MongoDB failure tests are simulated.** Offline tests inject connection and socket failures. The live server check used an unreachable address. A database that stops during a live browser session has not been tested.
- **Empty saved forms accumulate.** A saved form is created when a conversation starts, so abandoned sessions remain in the list. There is no delete button in the UI yet (the API supports it).
- **No PDF preview in some browsers.** The inline preview depends on the browser's PDF viewer; headless test browsers do not show it.
- **No version control for this project.** FormEase AI is not its own git repository. Git run from the project finds a repository at the drive root `C:/`, which has no commits. Make a baseline commit inside `FormEaseAI` before relying on any diff, UI-unchanged, or `git ls-files` secrets claim.
- **Browser workflow not re-run in the final audit.** The 18-check browser workflow and the frontend UI were not re-run on 2026-11-05. Only the backend, lint, build and live API checks were re-run.

---

## Changes in this release

| Status | Item |
|---|---|
| **Fixed** | Telugu PDF vowel signs and conjuncts: PDFs are now printed by Chromium with proper Indic shaping. ReportLab remains as a logged fallback. |
| **Fixed** | MongoDB failures during a request: socket and driver errors now return a structured 503 with `code: database_unavailable` instead of a bare HTTP 500. Logs contain the error type and a credential-free message only. |
| **Verified** | Telugu words render correctly (pixel comparison with an approved image, text search, visual inspection). Hindi, Kannada and English PDFs inspected. Offline suite: 114 passed, 7 live tests skipped (quota). Frontend lint and build pass. |
| **Verified** | Live uvicorn server with an unreachable MongoDB: all database routes return the 503 JSON, and the password in the URI appears in neither the response nor the log. Re-checked 2026-11-05 with a dummy password in the URI. |
| **Verified** (2026-11-05) | PDF from `/api/pdf` in English, Hindi, Kannada and Telugu: HTTP 200, one page, all values in the text layer, Chromium rendering (no fallback). Telugu and Kannada inspected visually. |
| **Not verified** | Telugu PDFs on Linux or macOS. Copy and search behaviour in each PDF viewer. Live Gemini conversations (quota). Browser workflow not re-run after this change. |
| **Verified** (2026-11-05) | Final audit re-run: offline suite 114 passed; lint exit 0; build passes; live server PDFs (4 languages) HTTP 200; live save/resume/confirm/delete; live 503 `database_unavailable` with an unreachable MongoDB and no password in the response or log. |
| **Not verified** | Frontend UI unchanged. The project has no git history or baseline snapshot (it is not its own git repository), so no diff can confirm it. |

## Documentation

- [Demonstration checklist](docs/DEMO_CHECKLIST.md)
