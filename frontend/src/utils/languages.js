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

// Native field labels for Citizen View across all 10 supported languages
export const FIELD_LABELS_BY_LANG = {
  en: {
    full_name: 'Full name', age: 'Age', date_of_birth: 'Date of birth', gender: 'Gender',
    mobile_number: 'Mobile number', email: 'Email', address: 'Address', city: 'City',
    state: 'State', pin_code: 'PIN code', occupation: 'Occupation', education: 'Education',
  },
  hi: {
    full_name: 'पूरा नाम', age: 'आयु', date_of_birth: 'जन्म तिथि', gender: 'लिंग',
    mobile_number: 'मोबाइल नंबर', email: 'ईमेल', address: 'पता', city: 'शहर / गाँव',
    state: 'राज्य', pin_code: 'पिन कोड', occupation: 'व्यवसाय', education: 'शिक्षा',
  },
  kn: {
    full_name: 'ಪೂರ್ಣ ಹೆಸರು', age: 'ವಯಸ್ಸು', date_of_birth: 'ಹುಟ್ಟಿದ ದಿನಾಂಕ', gender: 'ಲಿಂಗ',
    mobile_number: 'ಮೊಬೈಲ್ ಸಂಖ್ಯೆ', email: 'ಇಮೇಲ್', address: 'ವಿಳಾಸ', city: 'ಊರು / ನಗರ',
    state: 'ರಾಜ್ಯ', pin_code: 'ಪಿನ್ ಕೋಡ್', occupation: 'ವೃತ್ತಿ', education: 'ಶಿಕ್ಷಣ',
  },
  mr: {
    full_name: 'पूर्ण नाव', age: 'वय', date_of_birth: 'जन्मतारीख', gender: 'लिंग',
    mobile_number: 'मोबाईल नंबर', email: 'ईमेल', address: 'पत्ता', city: 'गाव / शहर',
    state: 'राज्य', pin_code: 'पिन कोड', occupation: 'व्यवसाय', education: 'शिक्षण',
  },
  te: {
    full_name: 'పూర్తి పేరు', age: 'వయస్సు', date_of_birth: 'పుట్టిన తేదీ', gender: 'లింగం',
    mobile_number: 'మొబైల్ నంబర్', email: 'ఈమెయిల్', address: 'చిరునామా', city: 'గ్రామం / నగరం',
    state: 'రాష్ట్రం', pin_code: 'పిన్ కోడ్', occupation: 'వృత్తి', education: 'విద్య',
  },
  ta: {
    full_name: 'முழுப் பெயர்', age: 'வயது', date_of_birth: 'பிறந்த தேதி', gender: 'பாலினம்',
    mobile_number: 'கைபேசி எண்', email: 'மின்னஞ்சல்', address: 'முகவரி', city: 'ஊர் / நகரம்',
    state: 'மாநிலம்', pin_code: 'அஞ்சல் குறியீடு', occupation: 'தொழில்', education: 'கல்வி',
  },
  ml: {
    full_name: 'പൂർണ്ണ പേര്', age: 'പ്രായം', date_of_birth: 'ജനനത്തീയതി', gender: 'ലിംഗഭേദം',
    mobile_number: 'മൊബൈൽ നമ്പർ', email: 'ഇമെയിൽ', address: 'വിലാസം', city: 'ഗ്രാമം / നഗരം',
    state: 'സംസ്ഥാനം', pin_code: 'പിൻ കോഡ്', occupation: 'തൊഴിൽ', education: 'വിദ്യാഭ്യാസം',
  },
  bn: {
    full_name: 'পুরো নাম', age: 'বয়স', date_of_birth: 'জন্ম তারিখ', gender: 'লিঙ্গ',
    mobile_number: 'মোবাইল নম্বর', email: 'ইমেল', address: 'ঠিকানা', city: 'গ্রাম / শহর',
    state: 'রাজ্য', pin_code: 'পিন কোড', occupation: 'পেশা', education: 'শিক্ষা',
  },
  gu: {
    full_name: 'પૂરું નામ', age: 'ઉંમર', date_of_birth: 'જન્મ તારીખ', gender: 'જાતિ',
    mobile_number: 'મોબાઇલ નંબર', email: 'ઇમેઇલ', address: 'સરનામું', city: 'ગામ / શહેર',
    state: 'રાજ્ય', pin_code: 'પિન કોડ', occupation: 'વ્યવસાય', education: 'શિક્ષણ',
  },
  pa: {
    full_name: 'ਪੂਰਾ ਨਾਮ', age: 'ਉਮਰ', date_of_birth: 'ਜਨਮ ਮਿਤੀ', gender: 'ਲਿੰਗ',
    mobile_number: 'ਮੋਬਾਈਲ ਨੰਬਰ', email: 'ਈਮੇਲ', address: 'ਪਤਾ', city: 'ਪਿੰਡ / ਸ਼ਹਿਰ',
    state: 'ਰਾਜ', pin_code: 'ਪਿੰਨ ਕੋਡ', occupation: 'ਕਿੱਤਾ', education: 'ਸਿੱਖਿਆ',
  },
}

// Initial welcoming question shown to rural citizens in their chosen language
export const INITIAL_GREETINGS = {
  en: "Hello! Welcome to FormEase AI. I'm here to help you easily fill out your application form through conversation. To get started, please tell me your full name.",
  hi: 'नमस्ते! मैं फॉर्मईज़ एआई हूँ। फॉर्म भरने में आपकी सहायता के लिए तैयार हूँ। शुरू करने के लिए, कृपया अपना पूरा नाम बताएं।',
  kn: 'ನಮಸ್ಕಾರ! ನಾನು ಫಾರ್ಮ್‌ಈಸ್ ಎಐ. ಸುಲಭವಾಗಿ ಫಾರ್ಮ್ ತುಂಬಲು ನಾನು ನಿಮಗೆ ಸಹಾಯ ಮಾಡುತ್ತೇನೆ. ಪ್ರಾರಂಭಿಸಲು, ದಯವಿಟ್ಟು ನಿಮ್ಮ ಪೂರ್ಣ ಹೆಸರನ್ನು ತಿಳಿಸಿ.',
  mr: 'नमस्कार! मी फॉर्मईज एआय आहे. फॉर्म भरण्यास मदत करण्यासाठी मी येथे आहे. सुरू करण्यासाठी, कृपया तुमचे पूर्ण नाव सांगा.',
  te: 'నమస్కారం! నేను ఫార్మ్‌ఈజ్ ఏఐ. ఫారమ్ సులభంగా నింపడానికి మీకు సహాయం చేస్తాను. ప్రారంభించడానికి, దయచేసి మీ పూర్తి పేరు చెప్పండి.',
  ta: 'வணக்கம்! நான் ஃபார்ம்ஈஸ் ஏஐ. படிவத்தை எளிதாக நிரப்ப உங்களுக்கு உதவுவேன். தொடங்க, தயவுசெய்து உங்கள் முழுப் பெயரைச் சொல்லுங்கள்.',
  ml: 'നമസ്കാരം! ഞാൻ ഫോംഈസ് എഐ ആണ്. ഫോം എളുപ്പത്തിൽ പൂരിപ്പിക്കാൻ ഞാൻ സഹായിക്കാം. ആരംഭിക്കാൻ, ദയവായി നിങ്ങളുടെ പൂർണ്ണ പേര് പറയുക.',
  bn: 'নমস্কার! আমি ফর্মইজ এআই। ফর্মটি সহজে পূরণ করতে আপনাকে সাহায্য করব। শুরু করতে, দয়া করে আপনার পুরো নাম বলুন।',
  gu: 'નમસ્તે! હું ફોર્મઇઝ એઆઈ છું. ફોર્મ ભરવામાં તમને સરળતાથી મદદ કરીશ. શરૂ કરવા માટે, કૃપા કરીને તમારું પૂરું નામ જણાવો.',
  pa: 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ ਫਾਰਮਈਜ਼ ਏਆਈ ਹਾਂ। ਫਾਰਮ ਆਸਾਨੀ ਨਾਲ ਭਰਨ ਵਿੱਚ ਮੈਂ ਤੁਹਾਡੀ ਮਦਦ ਕਰਾਂਗਾ। ਸ਼ੁਰੂ ਕਰਨ ਲਈ, ਕਿਰਪਾ ਕਰਕੇ ਆਪਣਾ ਪੂਰਾ ਨਾਮ ਦੱਸੋ।',
}

// Localized empty field indicators for Citizen View in each language
export const FIELD_EMPTY_PLACEHOLDERS = {
  en: 'Not yet provided',
  kn: 'ಇನ್ನೂ ಒದಗಿಸಲಾಗಿಲ್ಲ',
  mr: 'अद्याप दिलेले नाही',
  hi: 'अभी तक नहीं दिया गया',
  te: 'ఇంಕಾ నమోదు చేయలేదు',
  ta: 'இன்னும் பதிவு செய்யப்படவில்லை',
  ml: 'ഇതുവരെ നൽകിയിട്ടില്ല',
  bn: 'এখনও দেওয়া হয়নি',
  gu: 'હજુ સુધી નોંધાયેલ નથી',
  pa: 'ਅਜੇ ਤੱਕ ਦਰਜ ਨਹੀਂ ਕੀਤਾ ਗਿਆ',
}

// Localized input placeholders
export const INPUT_PLACEHOLDERS = {
  en: 'Type or speak your answer…',
  hi: 'यहाँ उत्तर लिखें या बोलें…',
  kn: 'ಇಲ್ಲಿ ಉತ್ತರಿಸಿ ಅಥವಾ ಮಾತನಾಡಿ…',
  mr: 'येथे उत्तर लिहा किंवा बोला…',
  te: 'ఇక్కడ టైప్ చేయండి లేదా మాట్లాడండి…',
  ta: 'இங்கு தட்டச்சு செய்யவும் அல்லது பேசவும்…',
  ml: 'ഇവിടെ ടൈപ്പ് ചെയ്യുക അല്ലെങ്കിൽ സംസാരിക്കുക…',
  bn: 'এখানে লিখুন অথবা মুখে বলুন…',
  gu: 'અહીં લખો અથવા બોલો…',
  pa: 'ਇੱਥੇ ਲਿਖੋ ਜਾਂ ਬੋਲੋ…',
}

// Default form types fallback if backend /api/form-types is unreachable
export const DEFAULT_FORM_TYPES = [
  {
    id: 'general',
    title: 'Personal Details Form',
    category: 'General Citizen',
    icon: '👤',
    description: '12 core personal, demographic, and contact fields for any general government or local service.',
    extra_fields: [],
  },
  {
    id: 'medical',
    title: 'Hospital & Medical Form',
    category: 'Healthcare & Clinical',
    icon: '🏥',
    description: 'General personal details plus primary symptoms, medical history, blood group, and emergency contact.',
    extra_fields: [
      { key: 'symptoms_or_reason', label: 'Symptoms / Visit Reason' },
      { key: 'medical_history', label: 'Medical History' },
      { key: 'blood_group', label: 'Blood Group' },
      { key: 'emergency_contact', label: 'Emergency Contact' },
    ],
  },
  {
    id: 'education',
    title: 'Education & Student Form',
    category: 'Schools & Universities',
    icon: '🎓',
    description: 'General personal details plus previous institution, course/degree, graduation year, and percentage/grade.',
    extra_fields: [
      { key: 'previous_institution', label: 'Previous Institution' },
      { key: 'course_or_degree', label: 'Course / Degree' },
      { key: 'passed_out_year', label: 'Passed Out Year' },
      { key: 'percentage_or_grade', label: 'Percentage / Grade' },
    ],
  },
  {
    id: 'government',
    title: 'Government Scheme Form',
    category: 'Direct Benefit Transfer (DBT)',
    icon: '🏛️',
    description: 'General personal details plus scheme name, approximate annual family income, and ration/ID card type.',
    extra_fields: [
      { key: 'scheme_name', label: 'Scheme Name' },
      { key: 'annual_family_income', label: 'Annual Family Income' },
      { key: 'ration_or_id_type', label: 'Ration / ID Type' },
    ],
  },
]

// Domain extra fields metadata
export const DOMAIN_EXTRA_FIELDS = {
  general: [],
  medical: [
    { key: 'symptoms_or_reason', label: 'Symptoms / Visit Reason' },
    { key: 'medical_history', label: 'Medical History' },
    { key: 'blood_group', label: 'Blood Group' },
    { key: 'emergency_contact', label: 'Emergency Contact' },
  ],
  education: [
    { key: 'previous_institution', label: 'Previous Institution' },
    { key: 'course_or_degree', label: 'Course / Degree' },
    { key: 'passed_out_year', label: 'Passed Out Year' },
    { key: 'percentage_or_grade', label: 'Percentage / Grade' },
  ],
  government: [
    { key: 'scheme_name', label: 'Scheme Name' },
    { key: 'annual_family_income', label: 'Annual Family Income' },
    { key: 'ration_or_id_type', label: 'Ration / ID Type' },
  ],
}

// Sensitive PII fields requiring masking when Privacy Shield is enabled
export const SENSITIVE_FIELDS = new Set([
  'full_name',
  'date_of_birth',
  'mobile_number',
  'email',
  'address',
  'emergency_contact',
])

/**
 * Visually mask sensitive PII fields unless peek is active.
 * - mobile_number: ••••••8210
 * - email: r****l@gmail.com
 * - full_name: R***** K****
 * - date_of_birth: ••/••/••••
 * - address: 123••••••••••
 * - emergency_contact: ••••••9912 or N**** S****
 */
export function maskFieldValue(fieldKey, value, isPeeked = false) {
  if (!value || isPeeked) return value
  if (!SENSITIVE_FIELDS.has(fieldKey)) return value

  const str = String(value).trim()
  if (!str) return value

  if (fieldKey === 'mobile_number') {
    if (str.length <= 4) return '••••'
    return '•'.repeat(Math.max(str.length - 4, 4)) + str.slice(-4)
  }

  if (fieldKey === 'email') {
    const parts = str.split('@')
    if (parts.length === 2 && parts[0].length > 1) {
      const user = parts[0]
      const domain = parts[1]
      const maskedUser = user[0] + '*'.repeat(Math.max(user.length - 2, 2)) + (user.length > 2 ? user.slice(-1) : '')
      return `${maskedUser}@${domain}`
    }
    return '••••••••'
  }

  if (fieldKey === 'full_name') {
    return str
      .split(/\s+/)
      .map((word) => (word.length <= 1 ? word : word[0] + '*'.repeat(Math.max(word.length - 1, 3))))
      .join(' ')
  }

  if (fieldKey === 'date_of_birth') {
    return '••/••/••••'
  }

  if (fieldKey === 'emergency_contact') {
    if (/^\d+$/.test(str.replace(/[\s+-]/g, ''))) {
      if (str.length <= 4) return '••••'
      return '•'.repeat(Math.max(str.length - 4, 4)) + str.slice(-4)
    }
    return str
      .split(/\s+/)
      .map((word) => (word.length <= 1 ? word : word[0] + '*'.repeat(Math.max(word.length - 1, 3))))
      .join(' ')
  }

  // address / default sensitive
  if (str.length <= 6) return '••••••'
  return str.slice(0, 3) + '••••••••••'
}


// Voice navigation command detection across supported Indian languages
export function detectVoiceCommand(rawTranscript) {
  if (!rawTranscript) return null
  const text = rawTranscript.trim().toLowerCase()

  // Repeat question commands
  const repeatKeywords = [
    'repeat', 'say again', 'say that again', 'once more', 'one more time', 'pardon',
    'ಮತ್ತೆ ಹೇಳಿ', 'ಇನ್ನೊಮ್ಮೆ ಹೇಳಿ', 'ಪುನಃ ಹೇಳಿ', 'ಹೇಳಿ ಮತ್ತೆ',
    'फिर से बोलो', 'दोबारा बोलो', 'फिर से बताइए', 'एक बार फिर', 'दोबारा कहिए',
    'पुन्हा सांगा', 'परत सांगा', 'पुन्हा बोला',
    'మళ్ళీ చెప్పండి', 'మరోసారి చెప్పండి', 'ఇంకోసారి చెప్పండి',
    'மீண்டும் சொல்லுங்கள்', 'மறுபடியும் சொல்லுங்கள்',
    'വീണ്ടും പറയൂ', 'ഒരിക്കൽ കൂടി പറയൂ',
    'আবার বলুন', 'পুনরায় বলুন',
    'ફરીથી બોલો', 'ફરી કહો',
    'ਦੁਬਾਰਾ ਦੱਸੋ', 'ਫਿਰ ਦੱਸੋ',
  ]

  for (const kw of repeatKeywords) {
    if (text.includes(kw.toLowerCase())) return 'repeat'
  }

  // Read summary commands
  const summaryKeywords = [
    'read summary', 'summary', 'read form', 'read details', 'check summary', 'read all',
    'ಸಾರಾಂಶ ಓದಿ', 'ಸಾರಾಂಶ ಹೇಳಿ', 'ವಿವರ ಓದಿ',
    'सारांश पढ़ो', 'फॉर्म पढ़ो', 'विवरण पढ़ो', 'सारांश सुनाओ',
    'सारांश वाचा', 'माहिती वाचा', 'तपशील वाचा',
    'సారాంశం చదవండి', 'వివరాలు చదవండి',
    'சுருக்கம் படிக்கவும்', 'படிவத்தை வாசியுங்கள்',
    'സംഗ്രഹം വായിക്കൂ',
    'সারাংশ পড়ুন',
    'સારાંશ વાંચો',
    'ਸੰਖੇਪ ਪੜ੍ਹੋ',
  ]

  for (const kw of summaryKeywords) {
    if (text.includes(kw.toLowerCase())) return 'summary'
  }

  return null
}

// Simple, relatable examples for each field in citizen native languages
export const FIELD_EXAMPLES = {
  full_name: {
    en: 'Ramesh Patil',
    kn: 'ರಮೇಶ್ ಪಾಟೀಲ್ (ಉದಾ: ರಮೇಶ್ ಕುಮಾರ್)',
    hi: 'रमेश पाटिल (जैसे: रमेश कुमार)',
    mr: 'रमेश पाटील (उदा: रमेश कुमार)',
    te: 'రమేష్ పాటిల్',
    ta: 'ரமேஷ் பாட்டீல்',
    ml: 'രമേഷ് പാട്ടീൽ',
    bn: 'রমেশ পাটিল',
    gu: 'રમેશ પાટીલ',
    pa: 'ਰਮੇਸ਼ ਪਾਟਿਲ',
  },
  age: {
    en: '45 years old',
    kn: '45 ವರ್ಷ (ಅಥವಾ ಕೇವಲ ಸಂಖ್ಯೆ 45)',
    hi: '45 वर्ष (या केवल 45)',
    mr: '45 वर्षे (किंवा फक्त 45)',
    te: '45 సంవత్సరాలు',
    ta: '45 வயது',
    ml: '45 വയസ്സ്',
    bn: '৪৫ বছর',
    gu: '45 વર્ષ',
    pa: '45 ਸਾਲ',
  },
  date_of_birth: {
    en: '15 August 1980 (or 15-08-1980)',
    kn: '15 ಆಗಸ್ಟ್ 1980 (ಅಥವಾ 15-08-1980)',
    hi: '15 अगस्त 1980 (या 15-08-1980)',
    mr: '15 ऑगस्ट 1980 (किंवा 15-08-1980)',
    te: '15 ఆగస్టు 1980',
    ta: '15 ஆகஸ்ட் 1980',
    ml: '15 ആഗസ്റ്റ് 1980',
    bn: '১৫ আগস্ট ১৯৮০',
    gu: '15 ઓગસ્ટ 1980',
    pa: '15 ਅਗਸਤ 1980',
  },
  gender: {
    en: 'Male, Female, or Other',
    kn: 'ಪುರುಷ (Male) ಅಥವಾ ಮಹಿಳೆ (Female)',
    hi: 'पुरुष (Male) या महिला (Female)',
    mr: 'पुरुष (Male) किंवा स्त्री (Female)',
    te: 'పురుషుడు లేదా స్త్రీ',
    ta: 'ஆண் அல்லது பெண்',
    ml: 'പുരുഷൻ അല്ലെങ്കിൽ സ്ത്രീ',
    bn: 'পুরুষ বা মহিলা',
    gu: 'પુરુષ અથવા સ્ત્રી',
    pa: 'ਪੁਰਸ਼ ਜਾਂ ਔਰਤ',
  },
  mobile_number: {
    en: '9876543210 (10-digit number)',
    kn: '9876543210 (10 ಅಂಕಿಯ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ)',
    hi: '9876543210 (10 अंकों का मोबाइल नंबर)',
    mr: '9876543210 (10 अंकी मोबाईल नंबर)',
    te: '9876543210 (10 అంకెల నంబర్)',
    ta: '9876543210 (10 இலக்க எண்)',
    ml: '9876543210 (10 അക്ക നമ്പർ)',
    bn: '9876543210 (১০ সংখ্যার নম্বর)',
    gu: '9876543210 (10 અંકનો નંબર)',
    pa: '9876543210 (10 ਅੰਕਾਂ ਦਾ ਨੰਬਰ)',
  },
  email: {
    en: 'name@gmail.com (or say "None")',
    kn: 'ramesh@gmail.com (ಇಲ್ಲದಿದ್ದರೆ "ಇಲ್ಲ" ಎಂದು ಹೇಳಿ)',
    hi: 'ramesh@gmail.com (नहीं है तो "कोई नहीं" बोलें)',
    mr: 'ramesh@gmail.com (नसल्यास "नाही" म्हणा)',
    te: 'name@gmail.com (లేకపోతే "లేదు" అని చెప్పండి)',
    ta: 'name@gmail.com (இல்லையெனில் "இல்லை" எனக் கூறலாம்)',
    ml: 'name@gmail.com (ഇല്ലെങ്കിൽ "ഇല്ല" എന്ന് പറയാം)',
    bn: 'name@gmail.com (না থাকলে "নেই" বলুন)',
    gu: 'name@gmail.com (ન હોય તો "નથી" કહો)',
    pa: 'name@gmail.com (ਨਹੀਂ ਤਾਂ "ਕੋਈ ਨਹੀਂ" ਕਹੋ)',
  },
  address: {
    en: 'House No. 12, Main Road, Near Temple',
    kn: 'ಮನೆ ನಂಬರ್ 12, ಮುಖ್ಯ ರಸ್ತೆ, ದೇವಸ್ಥಾನದ ಹತ್ತಿರ',
    hi: 'मकान नंबर 12, मेन रोड, मंदिर के पास',
    mr: 'घर नंबर 12, मेन रोड, मंदिरा जवळ',
    te: 'ఇంటి నెంబర్ 12, మెయిన్ రోడ్డు',
    ta: 'வீட்டு எண் 12, மெயின் ரோடு',
    ml: 'വീട്ടു നമ്പർ 12, മെയിൻ റോഡ്',
    bn: 'বাড়ি নং ১২, মেইন রোড',
    gu: 'મકાન નંબર 12, મુખ્ય રસ્તો',
    pa: 'ਮਕਾਨ ਨੰਬਰ 12, ਮੇਨ ਰੋਡ',
  },
  city: {
    en: 'Bengaluru (or your village name)',
    kn: 'ಬೆಂಗಳೂರು, ಮೈಸೂರು (ಅಥವಾ ನಿಮ್ಮ ಊರಿನ ಹೆಸರು)',
    hi: 'लखनऊ, वाराणसी (या अपने गाँव का नाम)',
    mr: 'पुणे, सातारा (किंवा आपल्या गावाचे नाव)',
    te: 'విజయవాడ, గుంటూరు',
    ta: 'மதுரை, திருச்சி',
    ml: 'കോഴിക്കോട്, കൊച്ചി',
    bn: 'কলকাতা, বর্ধমান',
    gu: 'અમદાવાદ, રાજકોટ',
    pa: 'ਅੰਮ੍ਰਿਤਸਰ, ਜਲੰਧਰ',
  },
  state: {
    en: 'Karnataka (or your state name)',
    kn: 'ಕರ್ನಾಟಕ',
    hi: 'उत्तर प्रदेश, बिहार, मध्य प्रदेश',
    mr: 'महाराष्ट्र',
    te: 'ఆంధ్రప్రదేశ్, తెలంగాణ',
    ta: 'தமிழ்நாடு',
    ml: 'കേരളം',
    bn: 'পশ্চিমবঙ্গ',
    gu: 'ગુજરાત',
    pa: 'ਪੰਜਾਬ',
  },
  pin_code: {
    en: '560001 (6-digit postal code)',
    kn: '560001 (6 ಅಂಕಿಯ ಪಿನ್ ಕೋಡ್)',
    hi: '560001 (6 अंकों का पिन कोड)',
    mr: '411001 (6 अंकी पिन कोड)',
    te: '500001 (6 అంకెల పిన్ కోడ్)',
    ta: '600001 (6 இலக்க அஞ்சல் குறியீடு)',
    ml: '695001 (6 അക്ക പിൻ കോഡ്)',
    bn: '700001 (৬ সংখ্যার পিন কোড)',
    gu: '380001 (6 અંકનો પિન કોડ)',
    pa: '143001 (6 ਅੰਕਾਂ ਦਾ ਪਿੰਨ ਕੋਡ)',
  },
  occupation: {
    en: 'Farmer, Teacher, Shopkeeper, Homemaker, Student',
    kn: 'ರೈತ, ವ್ಯಾಪಾರಿ, ಶಿಕ್ಷಕ, ಗೃಹಿಣಿ, ವಿದ್ಯಾರ್ಥಿ',
    hi: 'किसान, दुकानदार, शिक्षक, गृहिणी, छात्र',
    mr: 'शेतकरी, दुकानदार, शिक्षक, गृहिणी, विद्यार्थी',
    te: 'రైతు, వ్యాపారి, ఉపాధ్యాయుడు, విద్యార్థి',
    ta: 'விவசாயி, வியாபாரி, ஆசிரியர், மாணவர்',
    ml: 'കർഷകൻ, വ്യാപാരി, അധ്യാപകൻ, വിദ്യാർത്ഥി',
    bn: 'কৃষক, ব্যবসায়ী, শিক্ষক, ছাত্র',
    gu: 'ખેડૂત, વેપારી, શિક્ષક, વિદ્યાર્થી',
    pa: 'ਕਿਸਾਨ, ਦੁਕਾਨਦਾਰ, ਅਧਿਆਪਕ, ਵਿਦਿਆਰਥੀ',
  },
  education: {
    en: '10th Pass, 12th Pass, Graduate, Primary School',
    kn: 'ಹತ್ತನೇ ತರಗತಿ (10th), ಪಿಯುಸಿ, ಪದವಿ (Degree), ಪ್ರಾಥಮಿಕ',
    hi: '10वीं पास, 12वीं पास, स्नातक (Graduate), साक्षर',
    mr: 'दहावी पास, बारावी पास, पदवीधर (Graduate)',
    te: '10వ తరగతి, ఇంటర్, డిగ్రీ',
    ta: '10ஆம் வகுப்பு, 12ஆம் வகுப்பு, பட்டதாரி',
    ml: 'പത്താം ക്ലാസ്സ്, പ്ലസ് ടു, ബിരുദം',
    bn: 'মাধ্যমিক, উচ্চ মাধ্যমিক, স্নাতক',
    gu: '10 પાસ, 12 પાસ, સ્નાતક',
    pa: '10ਵੀਂ ਪਾਸ, 12ਵੀਂ ਪਾਸ, ਗ੍ਰੈਜੂਏਟ',
  },
  // Medical
  symptoms_or_reason: {
    en: 'Fever and cough for 3 days',
    kn: 'ಕಳೆದ 3 ದಿನಗಳಿಂದ ಜ್ವರ ಮತ್ತು ಕೆಮ್ಮು',
    hi: '3 दिनों से बुखार और खांसी',
    mr: '3 दिवसांपासून ताप आणि खोकला',
  },
  medical_history: {
    en: 'Diabetes (or say "None")',
    kn: 'ಸಕ್ಕರೆ ಕಾಯಿಲೆ (ಇಲ್ಲದಿದ್ದರೆ "ಯಾವುದೂ ಇಲ್ಲ")',
    hi: 'शुगर / बीपी (या "कोई नहीं")',
    mr: 'मधुमेह / बीपी (नसल्यास "काही नाही")',
  },
  blood_group: {
    en: 'O+ or B+ (or say "Unknown")',
    kn: 'O+ ಅಥವಾ B+ (ಗೊತ್ತಿಲ್ಲದಿದ್ದರೆ "ಗೊತ್ತಿಲ್ಲ")',
    hi: 'O+ या B+ (नहीं पता तो "पता नहीं")',
    mr: 'O+ किंवा B+ (माहित नसल्यास "माहित नाही")',
  },
  emergency_contact: {
    en: 'Suresh Patil (Brother) - 9845012345',
    kn: 'ಸುರೇಶ್ ಪಾಟೀಲ್ (ಸಹೋದರ) - 9845012345',
    hi: 'सुरेश पाटिल (भाई) - 9845012345',
    mr: 'सुरेश पाटील (भाऊ) - 9845012345',
  },
  // Education
  previous_institution: {
    en: 'Government High School, Mandya',
    kn: 'ಸರ್ಕಾರಿ ಪ್ರೌಢಶಾಲೆ, ಮಂಡ್ಯ',
    hi: 'राजकीय इंटर कॉलेज, लखनऊ',
    mr: 'शासकीय विद्यालय, पुणे',
  },
  course_or_degree: {
    en: 'B.Sc Computer Science',
    kn: 'ಬಿ.ಕಾಂ ಅಥವಾ ಬಿ.ಎಸ್ಸಿ',
    hi: 'बी.ए. या बी.एससी.',
    mr: 'बी.कॉम किंवा बी.ए.',
  },
  passed_out_year: {
    en: '2024',
    kn: '2024',
    hi: '2024',
    mr: '2024',
  },
  percentage_or_grade: {
    en: '78% (or 8.2 CGPA)',
    kn: '78% (ಅಥವಾ 8.2 CGPA)',
    hi: '78% (या 8.2 CGPA)',
    mr: '78% (किंवा 8.2 CGPA)',
  },
  // Government
  scheme_name: {
    en: 'Kisan Samman Nidhi / Gruha Lakshmi',
    kn: 'ಗೃಹಲಕ್ಷ್ಮಿ ಯೋಜನೆ / ಕಿಸಾನ್ ಸಮ್ಮಾನ್',
    hi: 'किसान सम्मान निधि / लाडली बहना योजना',
    mr: 'लाडकी बहीण योजना / शेतकरी सन्मान',
  },
  annual_family_income: {
    en: '80,000 INR per year',
    kn: 'ವರ್ಷಕ್ಕೆ 80,000 ರೂಪಾಯಿ',
    hi: '80,000 रुपये प्रति वर्ष',
    mr: 'वार्षिक 80,000 रुपये',
  },
  ration_or_id_type: {
    en: 'BPL Card (or Senior Citizen Card)',
    kn: 'ಬಿಪಿಎಲ್ ರೇಷನ್ ಕಾರ್ಡ್ (BPL Card)',
    hi: 'बीपीएल राशन कार्ड (BPL Card)',
    mr: 'पिवळे रेशन कार्ड / बीपीएल कार्ड',
  },
}

export function getFieldExample(fieldKey, languageCode = 'en') {
  const fieldObj = FIELD_EXAMPLES[fieldKey]
  if (!fieldObj) return null
  return fieldObj[languageCode] || fieldObj.en || null
}
