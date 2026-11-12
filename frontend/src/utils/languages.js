// Languages shown in the header selector. These must match SUPPORTED_LANGUAGES
// in backend/app/schemas/chat.py.
export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी (Hindi)' },
  { code: 'kn', label: 'ಕನ್ನಡ (Kannada)' },
  { code: 'ta', label: 'தமிழ் (Tamil)' },
  { code: 'te', label: 'తెలుగు (Telugu)' },
  { code: 'ml', label: 'മലയാളം (Malayalam)' },
  { code: 'bn', label: 'বাংলা (Bengali)' },
  { code: 'mr', label: 'मराठी (Marathi)' },
  { code: 'gu', label: 'ગુજરાતી (Gujarati)' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ (Punjabi)' },
]

// Field keys and labels, in the order the assistant asks for them.
// Must match FORM_FIELDS and FIELD_LABELS in the backend schemas.
export const FORM_FIELDS = [
  { key: 'full_name', label: 'Full name' },
  { key: 'age', label: 'Age' },
  { key: 'date_of_birth', label: 'Date of birth' },
  { key: 'gender', label: 'Gender' },
  { key: 'mobile_number', label: 'Mobile number' },
  { key: 'email', label: 'Email' },
  { key: 'address', label: 'Address' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'pin_code', label: 'PIN code' },
  { key: 'occupation', label: 'Occupation' },
  { key: 'education', label: 'Education' },
]
