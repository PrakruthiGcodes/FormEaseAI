# FormEase AI: demonstration checklist

Status key:
- **Fixed**: changed in this release to correct a known defect.
- **Verified**: tested (automated, pixel comparison, live server, or in a browser).
- **BLOCKED BY QUOTA**: needs a live Gemini call, and the configured key's daily quota is exhausted. Not an application failure. Retry after the quota resets or enable billing.
- **NOT VERIFIED**: not tested yet.
- **Needs mic**: requires a real microphone and speech service.

**Changes in this release:** Telugu PDF shaping is **Fixed**, and MongoDB failures return a structured 503 (**Fixed**). Both are **Verified** offline (114 backend tests passing) and in the cases listed below. Not re-run after this change: the browser workflow (18 checks). Not verified: Telugu PDFs outside Windows with Edge and Nirmala UI.

**Current live status (latest run):** the Gemini model is listed and supports text generation, but the live suite is **BLOCKED BY QUOTA** (daily free-tier limit). No live AI conversation has been verified in this release, in any language.

## Release audit (2026-11-05)

Final release audit, re-run on this machine (Windows 11, Python 3.13.15, Node 24.14.0 with Vite 8.3.6, MongoDB 4.4.31 on `localhost:27017`). Every result below comes from a command or a live request made during this audit:

| Check | Result |
|---|---|
| Offline backend suite (`pytest tests --ignore=tests/test_live_gemini.py`) | **114 passed**, 0 failed, 0 skipped. Includes 20 MongoDB and 503 tests (`test_forms_db.py`, `test_database_offline.py`), run against the live MongoDB. |
| Live Gemini suite (`tests/test_live_gemini.py`) | **7 skipped: BLOCKED BY QUOTA.** The suite ran one quota check and stopped. Not verified. |
| Frontend `npm run lint` | **Passed**, exit code 0 (oxlint 1.91.0, no warnings or errors) |
| Frontend `npm run build` | **Passed** (35 modules; `dist/` rebuilt, main bundle 246.50 kB, 76.91 kB gzipped) |
| PDF via live `POST /api/pdf` (uvicorn), English, Hindi, Kannada, Telugu | **HTTP 200**, a valid one-page PDF for each language (59–72 kB). Every typed value (name, gender, address, city, state, occupation, education) is in the text layer, checked by exact string match. |
| PDF shaping, Hindi, Kannada and Telugu | **Checked visually** from rendered page 1: vowel signs and conjuncts display correctly. English was checked by text extraction only. |
| Save and resume against live MongoDB | **Passed** (`test_forms_db.py`, 9 tests: create, save, resume, encryption at rest, confirm, delete). |
| Structured 503 on a live server with an unreachable MongoDB | **Verified**: `POST /api/forms` returned HTTP 503 `{"detail": ..., "code": "database_unavailable"}`; `/api/database/status` reported unavailable; `/api/health` still returned 200. A dummy password in the URI appeared in neither the response nor the server log. The log does show the host and port from the driver's error text (`127.0.0.1:1`), but not the username or password. |
| Save, resume, list, confirm, delete against the live server | **Passed**: create 201; partial save 200; resume returns the saved values; confirming an incomplete form 422; confirming a complete form 200; list includes the form; delete 204. |
| Frontend UI unchanged | **Not verified.** There is no baseline to compare with. FormEaseAI is not its own git repository (see below), so no diff is possible. |
| Secrets in source control | **Checked by file scan, not git.** The values of `GEMINI_API_KEY`, `FORM_ENCRYPTION_KEY` and `MONGODB_URI`, and any `AIza…` key pattern, appear in no file except `backend/.env`, including the built `frontend/dist`. `MONGODB_URI` appears in docs and `config.py` only as its default (`mongodb://localhost:27017`). Root `.gitignore` covers `.env` and `.env.*` (except `.env.example`). |

**Git status (blocks the source-control and UI-diff checks):** `git` run from `FormEaseAI` finds a repository at the drive root `C:/`, not in the project. That repository has no commits, and its status lists unrelated system folders as untracked. The project itself has never been committed. Do not run `git add -A` from `C:/`: it would stage the whole drive. Initialise git inside `FormEaseAI`, make a baseline commit, and then re-check the UI and secrets with `git ls-files`. This audit did not change that repository.

**Not verified in this audit:** live Gemini conversations in any language (the live suite is still quota-blocked); speech input and read-aloud; MongoDB stopping during a live browser session; Telugu PDFs outside Windows with Edge and Nirmala UI; the browser workflow (18 checks, not re-run); the frontend UI against a baseline.

## Before the demo

- [ ] MongoDB is running on `localhost:27017` (`Get-NetTCPConnection -LocalPort 27017 -State Listen`)
- [ ] `backend\.env` contains a valid `GEMINI_API_KEY` and `FORM_ENCRYPTION_KEY`
- [ ] Gemini quota is available (`GET http://localhost:8000/api/gemini/status` returns `"available": true`)
- [ ] Backend running: `uvicorn app.main:app --port 8000` (from `backend`, venv active)
- [ ] Frontend running: `npm run dev` (from `frontend`)
- [ ] Browser: Microsoft Edge or Google Chrome, internet connected, microphone allowed for `localhost`

## 1. Start-up and status

| Step | Expected result | Status |
|---|---|---|
| Open http://localhost:5173 | Welcome message and subtitle; header shows **Backend connected · v1.0.0** | Verified |
| Stop the backend, reload | Header shows **Backend offline** with a Retry button | Verified |
| Restart the backend, press Retry | Status returns to connected | Verified |
| Database offline | Summary shows "Not saved: MongoDB is offline…"; chat still works | Verified (API); UI wording by code |

## 2. Conversation (text)

| Step | Expected result | Status |
|---|---|---|
| Type "My name is Ananya." | Reply labelled **FormEase AI reply**; Full name appears in the summary | BLOCKED BY QUOTA (live Test 1) |
| Type "I live in Bengaluru." | City is filled in | BLOCKED BY QUOTA (live Test 2) |
| Type "I am 21 years old." | Age is 21 | BLOCKED BY QUOTA (live Test 3) |
| Type an answer in Kannada with the language set to Kannada | Reply in Kannada | **NOT VERIFIED** (live Test 4 is blocked by quota and only checks English-language scenarios; no Kannada conversation has been run) |
| Give only part of the information | The next question asks for a missing field | BLOCKED BY QUOTA (live Test 5) |
| Correct a name ("Sorry, it is Ananya") | Name is replaced, field highlighted | BLOCKED BY QUOTA (live Test 6) |
| Telugu or Hindi conversation | Reply in the selected language | **NOT VERIFIED** |
| Gemini quota used up | Red message labelled **Service error · no AI reply was generated**: daily limit message | Verified (browser, daily limit) |
| Daily quota reached: live suite | Each live test reported as BLOCKED BY QUOTA, one quota check only, no retries | Verified (live suite run) |
| Invalid API key | Red service-error message: "Google Gemini rejected the API key…"; key not shown | Verified (browser, real Google 401) |

## 3. Voice

| Step | Expected result | Status |
|---|---|---|
| Mic button shows **Voice mode · English** (or the chosen language) | Mode indicator matches the language | Verified |
| Press the mic | Listening bar appears; button becomes a red Stop button | Verified (headless browser) |
| Speak, then press Stop | Words appear in the text box for editing; Send is then enabled | Needs mic |
| Deny microphone permission | Message: "Microphone permission was denied…"; page still usable | Verified |
| Read replies aloud (toggle on) | Reply is read aloud; **Stop reading** button appears | BLOCKED BY QUOTA (AI reply); voices not verified |
| Hindi, Kannada, Telugu speech input | Recognition in the selected language | Needs mic (Edge/Chrome accept the language tags; the transcript itself is untested) |
| Hindi, Kannada, Telugu read-aloud | Read with a native voice | **Not verified**: no Hindi, Kannada or Telugu voices on the test machine. The app falls back to the default voice and shows a note. |

## 4. Form details and editing

| Step | Expected result | Status |
|---|---|---|
| Open a complete saved form | Summary shows **12 of 12** | Verified |
| Click **Edit** on Mobile number, enter `12345`, Save | Error: "Mobile number should be 10 digits…"; value unchanged | Verified |
| Edit Email to `ananya.rao@example.org`, Save | Email updated and highlighted | Verified |
| Start a new form | Summary resets to 0 of 12; all fields "Not yet provided" | Verified |
| Name in Hindi, Kannada or Telugu script | Accepted (fixed in this release: combining vowel signs were rejected before) | Verified (automated and browser) |
| Name with digits or symbols (e.g. `Ananya 2`) | Rejected with a message | Verified (automated test) |
| Mobile `+91 98765 43210`, PIN `560 001` | Stored as `9876543210` and `560001` | Verified (browser and automated) |
| Missing fields on review | "Please fill in…" message; Preview disabled | Verified (browser workflow test) |

## 5. Review, PDF, confirmation

| Step | Expected result | Status |
|---|---|---|
| **Review & create PDF** | Review screen with every field editable | Verified |
| **Check details** | "All details are valid"; Preview and Confirm enabled | Verified |
| **Preview PDF** | PDF preview appears (may not show in headless browsers) | Verified (blob created); visual depends on browser |
| **Download PDF** is disabled before confirming | Button disabled | Verified |
| **Confirm details** | Button shows "Confirmed ✓"; database status becomes confirmed | Verified |
| **Download PDF** | `formease_form.pdf` with all 12 values, footer, title | Verified (text extracted and checked) |
| Incomplete form via API `/api/pdf` | HTTP 422 listing missing fields | Verified |
| Kannada PDF | Kannada text renders and extracts correctly | Verified (visual check + automated text test) |
| Hindi PDF | Hindi text renders and extracts correctly | Verified (visual check + automated text test) |
| Telugu PDF: shaping | **Fixed.** Vowel signs and conjuncts are correct, e.g. "స్త్రీ" and "కర్ణాటక" | Verified (visual inspection; pixel comparison with an approved image in `tests/fixtures/pdf`; the old ReportLab output fails that comparison) |
| Telugu PDF: text | Typed Telugu is searchable and extracts exactly | Verified (automated, invisible text layer). Copy behaviour in each PDF viewer: NOT VERIFIED |
| Telugu PDF: platform | Renders on Windows with Microsoft Edge and Nirmala UI | Verified on Windows 11 / Edge 156 only. **NOT VERIFIED** on Linux or macOS. |
| PDF without a browser | Falls back to ReportLab with a logged warning (English only; Telugu shaping not correct) | Verified (automated test) |
| PDF speed | About one second per PDF with Chromium | Verified (timed locally) |
| English, Kannada, Hindi and Telugu PDF from the API (`/api/pdf`) | HTTP 200 and matching text | Verified (automated and live uvicorn server) |
| Document upload / OCR | Not part of this release | **Not implemented** |

## 6. Save and resume

| Step | Expected result | Status |
|---|---|---|
| Form progress saves automatically | Summary shows "All changes saved (encrypted)." | Verified |
| Reload the page | Conversation and values return from the server | Verified |
| Open **Saved forms** | Each item shows status, progress and date; no names | Verified |
| Resume a form | Values and conversation restored | Verified |
| Stored data check | Names and mobile numbers do not appear in the database in clear text | Verified (automated test) |
| Edit an existing value (correction) | New value is stored in MongoDB | Verified (browser workflow test) |
| Invalid correction | Rejected with a message; the stored value is unchanged | Verified (browser workflow test) |
| Complete the form through edits, confirm | Status `confirmed` stored in MongoDB | Verified (browser workflow test) |
| Kannada name entered through edit | Accepted, stored, and present in the downloaded PDF | Verified (browser workflow test) |
| MongoDB unreachable | Save returns 503 with a clear message; chat and PDF still work | Verified (automated test; live uvicorn server with an unreachable URI) |
| MongoDB fails during a request | **Fixed.** Structured 503 JSON (`code: database_unavailable`), not a bare 500 | Verified (automated: connection, socket, write and insert failures) |
| Error response content | No credentials, hosts, file paths or stack traces in the response; the password in the URI is not in the log | Verified (automated test and live server check) |
| MongoDB stops during a live browser session | 503 message shown in the app | NOT VERIFIED (only simulated failures tested) |

## 7. Mobile

| Step | Expected result | Status |
|---|---|---|
| Phone width (390px) | No horizontal scrolling; form details collapsed with **Show** button | Verified |
| Tablet (768px) and desktop (1280px) | No horizontal scrolling; details shown beside the chat on wide screens | Verified |
| Review screen on a phone | Fields stack; buttons wrap | Verified (screenshot) |

## Final commands to show

```powershell
# Tests (114 offline tests; 7 live Gemini tests are skipped when quota is exhausted)
cd FormEaseAI\backend
.\.venv\Scripts\python.exe -m pytest tests -v --ignore=tests/test_live_gemini.py

# Live Gemini suite (one quota check; reports BLOCKED BY QUOTA when the daily limit is used up)
.\.venv\Scripts\python.exe -m pytest tests/test_live_gemini.py -v

# Frontend quality checks
cd FormEaseAI\frontend
npm run lint
npm run build
```

## Known gaps to mention during the demo

- The AI conversation depends on Gemini quota. If the key is rejected or the daily limit is reached, the app says so instead of replying.
- Speech transcription accuracy and Hindi, Kannada and Telugu read-aloud voices depend on the browser and device.
- Saved forms are not protected by a login. This is a local MVP.
- PDFs are drawn by Microsoft Edge, Google Chrome or Playwright's Chromium. About one second per PDF. Without a browser the app uses a fallback that cannot shape Telugu correctly.
- Telugu PDFs were checked only on Windows with Microsoft Edge and Nirmala UI.
- No git history or baseline snapshot exists, so "frontend UI unchanged" cannot be proved by diff. Initialise git and commit before relying on that claim.
- Live Gemini conversations (all languages) remain unverified until the key has quota.
