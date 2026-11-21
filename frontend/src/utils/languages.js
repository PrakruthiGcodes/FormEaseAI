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
