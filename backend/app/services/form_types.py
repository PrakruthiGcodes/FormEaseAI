"""Form type registry and domain extension definitions.

Layers domain-specific extensions (medical, education, government) on top of the
12 canonical personal details fields.
"""

import re
from typing import Any, Optional

FORM_TYPES: dict[str, dict[str, Any]] = {
    "general": {
        "id": "general",
        "title": "Personal Details Form",
        "description": "General citizen registration for identity, residency, and contact information.",
        "extra_fields": [],
    },
    "medical": {
        "id": "medical",
        "title": "Hospital & Medical Form",
        "description": "Hospital OPD patient intake, medical history triage, and emergency contact registration.",
        "extra_fields": [
            {
                "key": "symptoms_or_reason",
                "label": "Symptoms or Reason for Visit",
                "description": "Primary symptoms, health complaint, or reason for doctor visit.",
                "prompt_hint": "Please tell us what problems or symptoms you are experiencing, or why you are visiting the clinic today.",
                "prompt_hints_by_lang": {
                    "en": "Please describe your primary symptoms or the reason for your visit.",
                    "hi": "कृपया अपने मुख्य लक्षण या डॉक्टर के पास आने का कारण बताएं।",
                    "kn": "ದಯವಿಟ್ಟು ನಿಮ್ಮ ಮುಖ್ಯ ರೋಗಲಕ್ಷಣಗಳು ಅಥವಾ ಭೇಟಿಯ ಕಾರಣವನ್ನು ತಿಳಿಸಿ.",
                    "mr": "कृपया तुमची मुख्य लक्षणे किंवा भेट देण्याचे कारण सांगा.",
                    "te": "దయచేసి మీ ముఖ్య లక్షణాలు లేదా ఆసుపత్రికి వచ్చిన కారణాన్ని తెలియజేయండి.",
                    "ta": "தயவுசெய்து உங்கள் முக்கிய அறிகுறிகள் அல்லது மருத்துவ வருகைக்கான காரணத்தைக் கூறவும்.",
                    "ml": "ദയവായി നിങ്ങളുടെ പ്രധാന ലക്ഷണങ്ങൾ അല്ലെങ്കിൽ ഡോക്ടറെ കാണാനുള്ള കാരണം പറയുക.",
                    "bn": "অনুগ্রহ করে আপনার প্রধান লক্ষণ বা হাসপাতালে আসার কারণ বলুন।",
                    "gu": "કૃપા કરીને તમારા મુખ્ય લક્ષણો અથવા ડૉક્ટર પાસે આવવાનું કારણ જણાવો.",
                    "pa": "ਕਿਰਪਾ ਕਰਕੇ ਆਪਣੇ ਮੁੱਖ ਲੱਛਣ ਜਾਂ ਡਾਕਟਰ ਕੋਲ ਆਉਣ ਦਾ ਕਾਰਨ ਦੱਸੋ।",
                },
            },
            {
                "key": "medical_history",
                "label": "Medical History",
                "description": "Past illnesses, surgeries, allergies, or ongoing medications (say 'None' if none).",
                "prompt_hint": "Do you have any past health issues, operations, allergies, or ongoing medicines? You can also say 'None'.",
                "prompt_hints_by_lang": {
                    "en": "Do you have any past health issues, allergies, surgeries, or ongoing medicines? (Say 'None' if none).",
                    "hi": "क्या आपको कोई पुरानी बीमारी, एलर्जी, सर्जरी या नियमित दवाएं हैं? (नहीं है तो 'कोई नहीं' कहें)।",
                    "kn": "ನಿಮಗೆ ಯಾವುದೇ ಹಿಂದಿನ ಕಾಯಿಲೆ, ಅಲರ್ಜಿ, ಶಸ್ತ್ರಚಿಕಿತ್ಸೆ ಅಥವಾ ನಿಯಮಿತ ಔಷಧಗಳಿವೆಯೇ? (ಇಲ್ಲದಿದ್ದರೆ 'ಯಾವುದೂ ಇಲ್ಲ' ಎಂದು ಹೇಳಿ).",
                    "mr": "तुम्हाला काही जुने आजार, ऍलर्जी, शस्त्रक्रिया किंवा नियमित औषधे आहेत का? (नसल्यास 'काही नाही' सांगा).",
                    "te": "మీకు ఏదైనా పాత వ్యాధులు, అలెర్జీలు, శస్త్రచికిత్సలు లేదా రెగ్యులర్ మందులు ఉన్నాయా? (లేకపోతే 'ఏమీ లేదు' అని చెప్పండి).",
                    "ta": "உங்களுக்கு ஏதேனும் முந்தைய நோய்கள், ஒவ்வாமை அல்லது வழக்கமான மருந்துகள் உள்ளதா? (இல்லையெனில் 'எதுவுமில்லை' எனக் கூறலாம்).",
                    "ml": "നിങ്ങൾക്ക് മുൻകാല രോഗങ്ങളോ അലർജിയോ സർജറിയോ പതിവ് മരുന്നുകളോ ഉണ്ടോ? (ഇല്ലെങ്കിൽ 'ഒന്നുമില്ല' എന്ന് പറയാം).",
                    "bn": "আপনার কি কোনো পুরনো রোগ, অ্যালার্জি, সার্জারি বা নিয়মিত ওষুধ আছে? (না থাকলে 'কিছু নেই' বলুন)।",
                    "gu": "શું તમને કોઈ જૂની બીમારી, એલર્જી, સર્જરી કે નિયમિત દવાઓ છે? (ન હોય તો 'કંઈ નહીં' કહો).",
                    "pa": "ਕੀ ਤੁਹਾਨੂੰ ਕੋਈ ਪੁਰਾਣੀ ਬਿਮਾਰੀ, ਐਲਰਜੀ ਜਾਂ ਨਿਯਮਿਤ ਦਵਾਈਆਂ ਹਨ? (ਨਹੀਂ ਤਾਂ 'ਕੋਈ ਨਹੀਂ' ਕਹੋ)।",
                },
            },
            {
                "key": "blood_group",
                "label": "Blood Group",
                "description": "Blood group (e.g., A+, B+, AB+, O+, or Unknown).",
                "prompt_hint": "What is your blood group? If you do not know, simply say 'Unknown'.",
                "prompt_hints_by_lang": {
                    "en": "What is your blood group? (If you don't know, simply say 'Unknown').",
                    "hi": "आपका ब्लड ग्रुप (रक्त समूह) क्या है? (यदि नहीं पता, तो 'पता नहीं' कहें)।",
                    "kn": "ನಿಮ್ಮ ರಕ್ತದ ಗುಂಪು (Blood Group) ಯಾವುದು? (ಗೊತ್ತಿಲ್ಲದಿದ್ದರೆ 'ಗೊತ್ತಿಲ್ಲ' ಎಂದು ಹೇಳಿ).",
                    "mr": "तुमचा रक्तगट (Blood Group) कोणता आहे? (माहित नसल्यास 'माहित नाही' सांगा).",
                    "te": "మీ బ్లడ్ గ్రూప్ ఏమిటి? (తెలియకపోతే 'తెలియదు' అని చెప్పండి).",
                    "ta": "உங்கள் இரத்த வகை என்ன? (தெரியவில்லை என்றால் 'தெரியாது' எனக் கூறலாம்).",
                    "ml": "നിങ്ങളുടെ ബ്ലഡ് ഗ്രൂപ്പ് ഏതാണ്? (അറിയില്ലെങ്കിൽ 'അറിയില്ല' എന്ന് പറയാം).",
                    "bn": "আপনার রক্তের গ্রুপ কি? (জানা না থাকলে 'জানা নেই' বলুন)।",
                    "gu": "તમારું બ્લડ ગ્રુપ કયું છે? (ખબર ન હોય તો 'ખબર નથી' કહો).",
                    "pa": "ਤੁਹਾਡਾ ਬਲੱਡ ਗਰੁੱਪ ਕੀ ਹੈ? (ਜੇ ਪਤਾ ਨਹੀਂ ਤਾਂ 'ਪਤਾ ਨਹੀਂ' ਕਹੋ)।",
                },
            },
            {
                "key": "emergency_contact",
                "label": "Emergency Contact",
                "description": "Emergency family contact name or 10-digit mobile number.",
                "prompt_hint": "Who can we contact in an emergency? Please share a family member's name or mobile number.",
                "prompt_hints_by_lang": {
                    "en": "Who can we contact in an emergency? Please provide a family member's name or phone number.",
                    "hi": "आपातकालीन स्थिति में हम किससे संपर्क करें? कृपया परिवार के किसी सदस्य का नाम या मोबाइल नंबर दें।",
                    "kn": "ತುರ್ತು ಪರಿಸ್ಥಿತಿಯಲ್ಲಿ ಯಾರನ್ನು ಸಂಪರ್ಕಿಸಬೇಕು? ದಯವಿಟ್ಟು ಕುಟುಂಬದ ಸದಸ್ಯರ ಹೆಸರು ಅಥವಾ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ನೀಡಿ.",
                    "mr": "आणीबाणीच्या वेळी कोणाशी संपर्क साधावा? कृपया कुटुंबातील सदस्याचे नाव किंवा मोबाईल नंबर द्या.",
                    "te": "అత్యవసర సమయంలో ఎవరిని సంప్రదించాలి? కుటుంబ సభ్యుల పేరు లేదా ఫోన్ నంబర్ చెప్పండి.",
                    "ta": "அவசர காலத்தில் யாரைத் தொடர்பு கொள்ள வேண்டும்? குடும்ப உறுப்பினரின் பெயர் அல்லது அலைபேசி எண்ணைத் தரவும்.",
                    "ml": "അടിയന്തിര ഘട്ടത്തിൽ ആരെയാണ് ബന്ധപ്പെടേണ്ടത്? ദയവായി കുടുംബാംഗത്തിന്റെ പേരോ ഫോൺ നമ്പറോ നൽകുക.",
                    "bn": "জরুরি অবস্থায় কার সাথে যোগাযোগ করতে হবে? পরিবারের কারও নাম বা মোবাইল নম্বর দিন।",
                    "gu": "ઇમરજન્સીમાં કોનો સંપર્ક કરવો? કૃપા કરીને પરિવારના સભ્યનું નામ અથવા ફોન નંબર આપો.",
                    "pa": "ਐਮਰਜੈਂਸੀ ਵਿੱਚ ਕਿਸ ਨਾਲ ਸੰਪਰਕ ਕੀਤਾ ਜਾਵੇ? ਕਿਰਪਾ ਕਰਕੇ ਪਰਿਵਾਰ ਦੇ ਕਿਸੇ ਜੀਅ ਦਾ ਨਾਮ ਜਾਂ ਫ਼ੋਨ ਨੰਬਰ ਦਿਓ।",
                },
            },
        ],
    },
    "education": {
        "id": "education",
        "title": "Education & Student Form",
        "description": "Student admissions, college profiling, and scholarship applications.",
        "extra_fields": [
            {
                "key": "previous_institution",
                "label": "Previous Institution",
                "description": "Previous school, college, or university name.",
                "prompt_hint": "What is the name of your previous school or college?",
                "prompt_hints_by_lang": {
                    "en": "What is the name of your previous school or college?",
                    "hi": "आपके पिछले स्कूल या कॉलेज का नाम क्या है?",
                    "kn": "ನಿಮ್ಮ ಹಿಂದಿನ ಶಾಲೆ ಅಥವಾ ಕಾಲೇಜಿನ ಹೆಸರು ಏನು?",
                    "mr": "तुमच्या आधीच्या शाळा किंवा कॉलेजचे नाव काय आहे?",
                    "te": "మీ మునుపటి పాఠశాల లేదా కళాశాల పేరు ఏమిటి?",
                    "ta": "உங்கள் முந்தைய பள்ளி அல்லது கல்லூரியின் பெயர் என்ன?",
                    "ml": "നിങ്ങളുടെ മുൻ സ്കൂളിന്റെയോ കോളേജിന്റെയോ പേരെന്താണ്?",
                    "bn": "আপনার আগের স্কুল বা কলেজের নাম কি?",
                    "gu": "તમારી અગાઉની શાળા અથવા કોલેજનું નામ શું છે?",
                    "pa": "ਤੁਹਾਡੇ ਪਿਛਲੇ ਸਕੂਲ ਜਾਂ ਕਾਲਜ ਦਾ ਨਾਮ ਕੀ ਹੈ?",
                },
            },
            {
                "key": "course_or_degree",
                "label": "Course or Degree",
                "description": "Course, stream, or degree program name.",
                "prompt_hint": "Which course, stream, or degree are you studying or applying for?",
                "prompt_hints_by_lang": {
                    "en": "Which course, stream, or degree are you studying or applying for?",
                    "hi": "आप किस कोर्स, स्ट्रीम या डिग्री की पढ़ाई कर रहे हैं या आवेदन कर रहे हैं?",
                    "kn": "ನೀವು ಯಾವ ಕೋರ್ಸ್, ವಿಭಾಗ ಅಥವಾ ಪದವಿಯನ್ನು ಓದುತ್ತಿದ್ದೀರಿ ಅಥವಾ ಅರ್ಜಿ ಸಲ್ಲಿಸುತ್ತಿದ್ದೀರಿ?",
                    "mr": "तुम्ही कोणत्या कोर्स, स्ट्रीम किंवा पदवीचा अभ्यास करत आहात?",
                    "te": "మీరు ఏ కోర్సు, స్ట్రీమ్ లేదా డిగ్రీ చదువుతున్నారు?",
                    "ta": "நீங்கள் எந்தப் படிப்பு அல்லது பட்டத்திற்குப் படிக்கிறீர்கள்?",
                    "ml": "നിങ്ങൾ ഏത് കോഴ്‌സ് അല്ലെങ്കിൽ ബിരുദമാണ് പഠിക്കുന്നത്?",
                    "bn": "আপনি কোন কোর্স বা ডিগ্রিতে পড়াশোনা করছেন?",
                    "gu": "તમે કયા કોર્સ કે ડિગ્રીમાં અભ્યાસ કરી રહ્યા છો?",
                    "pa": "ਤੁਸੀਂ ਕਿਹੜਾ ਕੋਰਸ ਜਾਂ ਡਿਗਰੀ ਕਰ ਰਹੇ ਹੋ?",
                },
            },
            {
                "key": "passed_out_year",
                "label": "Passed Out Year",
                "description": "4-digit graduation or pass-out year (e.g., 2024).",
                "prompt_hint": "In which year did you complete or pass out from your previous course?",
                "prompt_hints_by_lang": {
                    "en": "In which year did you pass out or complete your previous studies? (e.g., 2024)",
                    "hi": "आपने अपनी पिछली पढ़ाई किस वर्ष में पूरी की? (जैसे 2024)",
                    "kn": "ನಿಮ್ಮ ಹಿಂದಿನ ವಿದ್ಯಾಭ್ಯಾಸವನ್ನು ಯಾವ ವರ್ಷದಲ್ಲಿ ಮುಗಿಸಿದಿರಿ? (ಉದಾ: 2024)",
                    "mr": "तुम्ही तुमचे आधीचे शिक्षण कोणत्या वर्षी पूर्ण केले? (उदा. 2024)",
                    "te": "మీరు ఏ సంవత్సరంలో ఉత్తీర్ణులయ్యారు? (ఉదా: 2024)",
                    "ta": "நீங்கள் எந்த ஆண்டில் தேர்ச்சி பெற்றீர்கள்? (எ.கா: 2024)",
                    "ml": "നിങ്ങൾ ഏത് വർഷത്തിലാണ് മുൻ കോഴ്സ് പാസായത്? (ഉദാ: 2024)",
                    "bn": "আপনি কোন সালে পাস করেছেন? (যেমন: 2024)",
                    "gu": "તમે કયા વર્ષમાં અભ્યાસ પૂર્ણ કર્યો? (દા.ત. 2024)",
                    "pa": "ਤੁਸੀਂ ਕਿਸ ਸਾਲ ਪਾਸ ਹੋਏ ਸੀ? (ਜਿਵੇਂ: 2024)",
                },
            },
            {
                "key": "percentage_or_grade",
                "label": "Percentage or Grade",
                "description": "Marks percentage or CGPA/grade scored.",
                "prompt_hint": "What was your final percentage or CGPA/grade?",
                "prompt_hints_by_lang": {
                    "en": "What was your final percentage or grade/CGPA?",
                    "hi": "आपका अंतिम प्रतिशत (Percentage) या ग्रेड/CGPA क्या था?",
                    "kn": "ನಿಮ್ಮ ಅಂತಿಮ ಶೇಕಡಾವಾರು (Percentage) ಅಥವಾ ಗ್ರೇಡ್/CGPA ಎಷ್ಟು?",
                    "mr": "तुमची शेवटची टक्केवारी (Percentage) किंवा ग्रेड/CGPA काय होती?",
                    "te": "మీ చివరి శాతం (Percentage) లేదా గ్రేడ్ ఎంత?",
                    "ta": "உங்கள் இறுதி மதிப்பெண் சதவீதம் அல்லது தரம் என்ன?",
                    "ml": "നിങ്ങളുടെ മാർക്ക് ശതമാനമോ ഗ്രേഡോ എത്രയായിരുന്നു?",
                    "bn": "আপনার চূড়ান্ত শতাংশ (Percentage) বা গ্রেড কত ছিল?",
                    "gu": "તમારી ટકાવારી (Percentage) અથવા ગ્રેડ કેટલી હતી?",
                    "pa": "ਤੁਹਾਡੇ ਅੰਤਿਮ ਅੰਕਾਂ ਦੀ ਪ੍ਰਤੀਸ਼ਤਤਾ ਜਾਂ ਗ੍ਰੇਡ ਕੀ ਸੀ?",
                },
            },
        ],
    },
    "government": {
        "id": "government",
        "title": "Government Scheme Form",
        "description": "Citizen welfare benefits, subsidy programs, and e-governance schemes.",
        "extra_fields": [
            {
                "key": "scheme_name",
                "label": "Scheme Name",
                "description": "Name of government scheme or benefit applying for.",
                "prompt_hint": "Which government scheme or benefit are you applying for?",
                "prompt_hints_by_lang": {
                    "en": "Which government scheme or welfare benefit are you applying for?",
                    "hi": "आप किस सरकारी योजना या कल्याणकारी लाभ के लिए आवेदन कर रहे हैं?",
                    "kn": "ನೀವು ಯಾವ ಸರ್ಕಾರಿ ಯೋಜನೆ ಅಥವಾ ಸೌಲಭ್ಯಕ್ಕೆ ಅರ್ಜಿ ಸಲ್ಲಿಸುತ್ತಿದ್ದೀರಿ?",
                    "mr": "तुम्ही कोणत्या सरकारी योजनेसाठी किंवा लाभासाठी अर्ज करत आहात?",
                    "te": "మీరు ఏ ప్రభుత్వ పథకానికి దరఖాస్తు చేస్తున్నారు?",
                    "ta": "நீங்கள் எந்த அரசுத் திட்டத்திற்கு விண்ணப்பிக்கிறீர்கள்?",
                    "ml": "ഏത് സർക്കാർ ക്ഷേമപദ്ധതിക്കാണ് നിങ്ങൾ അപേക്ഷിക്കുന്നത്?",
                    "bn": "আপনি কোন সরকারি প্রকল্পের জন্য আবেদন করছেন?",
                    "gu": "તમે કઈ સરકારી યોજના માટે અરજી કરી રહ્યા છો?",
                    "pa": "ਤੁਸੀਂ ਕਿਸ ਸਰਕਾਰੀ ਸਕੀਮ ਲਈ ਅਰਜ਼ੀ ਦੇ ਰਹੇ ਹੋ?",
                },
            },
            {
                "key": "annual_family_income",
                "label": "Annual Family Income",
                "description": "Approximate annual household/family income in INR.",
                "prompt_hint": "What is your approximate total family income in a year?",
                "prompt_hints_by_lang": {
                    "en": "What is your approximate total family income per year?",
                    "hi": "आपकी वार्षिक पारिवारिक आय (साल की कुल कमाई) लगभग कितनी है?",
                    "kn": "ನಿಮ್ಮ ಕುಟುಂಬದ ವಾರ್ಷಿಕ ಆದಾಯ ಅಂದಾಜು ಎಷ್ಟು?",
                    "mr": "तुमचे वार्षिक कौटुंबिक उत्पन्न अंदाजे किती आहे?",
                    "te": "మీ కుటుంబ వార్షిక ఆదాయం సుమారు ఎంత?",
                    "ta": "உங்கள் குடும்பத்தின் ஆண்டு வருமானம் தோராயமாக எவ்வளவு?",
                    "ml": "നിങ്ങളുടെ കുടുംബത്തിന്റെ വാർഷിക വരുമാനം എത്രയാണ്?",
                    "bn": "আপনার পারিবারিক বার্ষিক আয় আনুমানিক কত?",
                    "gu": "તમારી વાર્ષિક પારિવારિક આવક અંદાજે કેટલી છે?",
                    "pa": "ਤੁਹਾਡੀ ਸਾਲਾਨਾ ਪਰਿਵਾਰਕ ਆਮਦਨ ਲਗਭਗ ਕਿੰਨੀ ਹੈ?",
                },
            },
            {
                "key": "ration_or_id_type",
                "label": "Ration Card or ID Type",
                "description": "Available card or document type (e.g., BPL Card, APL Card, Senior Citizen ID).",
                "prompt_hint": "What type of ration card or government ID do you have (like BPL, APL, or None)?",
                "prompt_hints_by_lang": {
                    "en": "What type of ration card or government ID do you hold? (e.g., BPL Card, APL Card, or None).",
                    "hi": "आपके पास किस प्रकार का राशन कार्ड या सरकारी आईडी है? (जैसे BPL, APL, या कोई नहीं)।",
                    "kn": "ನಿಮ್ಮ ಬಳಿ ಯಾವ ರೀತಿಯ ರೇಷನ್ ಕಾರ್ಡ್ ಅಥವಾ ಗುರುತಿನ ಚೀಟಿ ಇದೆ? (ಉದಾ: BPL, APL, ಅಥವಾ ಯಾವುದೂ ಇಲ್ಲ).",
                    "mr": "तुमच्याकडे कोणत्या प्रकारचे रेशन कार्ड किंवा सरकारी ओळखपत्र आहे? (उदा. BPL, APL, किंवा काही नाही).",
                    "te": "మీ దగ్గర ఏ రకమైన రేషన్ కార్డు లేదా ప్రభుత్వ గుర్తింపు కార్డు ఉంది? (ఉదా: BPL, APL).",
                    "ta": "உங்களிடம் எந்த வகையான குடும்ப அட்டை (ரேஷன் கார்டு) உள்ளது? (எ.கா: BPL, APL).",
                    "ml": "നിങ്ങളുടെ പക്കൽ ഏത് തരത്തിലുള്ള റേഷൻ കാർഡാണ് ഉള്ളത്? (ഉദാ: BPL, APL).",
                    "bn": "আপনার কাছে কী ধরনের রেশন কার্ড আছে? (যেমন: BPL, APL, বা কোনোটিই নয়)।",
                    "gu": "તમારી પાસે કેવા પ્રકારનું રેશન કાર્ડ છે? (જેમ કે BPL, APL, કે કંઈ નહીં).",
                    "pa": "ਤੁਹਾਡੇ ਕੋਲ ਕਿਸ ਤਰ੍ਹਾਂ ਦਾ ਰਾਸ਼ਨ ਕਾਰਡ ਹੈ? (ਜਿਵੇਂ BPL, APL, ਜਾਂ ਕੋਈ ਨਹੀਂ)।",
                },
            },
        ],
    },
}

SKIP_PATTERNS = re.compile(
    r"^(none|nil|no|nope|nothing|not applicable|na|n/a|skip|don'?t have|don'?t know|unknown)$",
    re.IGNORECASE,
)


def get_form_type_info(form_type: str) -> Optional[dict[str, Any]]:
    """Retrieve metadata for a specific form type, defaulting to general."""
    return FORM_TYPES.get(form_type)


def get_all_form_types() -> list[dict[str, Any]]:
    """Return all available form types for UI display."""
    return list(FORM_TYPES.values())


def get_extra_field_keys(form_type: str) -> list[str]:
    """Return the list of extra field keys for a given form type."""
    type_info = FORM_TYPES.get(form_type)
    if not type_info:
        return []
    return [field["key"] for field in type_info["extra_fields"]]


def get_extra_field_prompt(field_key: str, form_type: str, language_code: str = "en") -> str:
    """Return the localized prompt hint for an extra field."""
    type_info = FORM_TYPES.get(form_type)
    if not type_info:
        return f"Please provide {field_key}."
    for field in type_info["extra_fields"]:
        if field["key"] == field_key:
            return field["prompt_hints_by_lang"].get(language_code, field["prompt_hint"])
    return f"Please provide {field_key}."


def validate_extra_field(field_key: str, value: Any) -> tuple[Optional[str], Optional[str]]:
    """Validate and normalize a single extra domain field.

    Returns (normalized_value, error_message).
    """
    if value is None:
        return None, None

    text = str(value).strip()
    if not text:
        return None, None

    # Handle skip / none gracefully
    if SKIP_PATTERNS.match(text):
        if field_key == "medical_history":
            return "None", None
        if field_key == "blood_group":
            return "Unknown", None
        return "Not Applicable", None

    # Field specific validations
    if field_key == "passed_out_year":
        # Match 4-digit year
        match = re.search(r"\b(19\d{2}|20\d{2})\b", text)
        if match:
            year = int(match.group(1))
            if 1950 <= year <= 2035:
                return str(year), None
            return None, "Please enter a valid graduation year between 1950 and 2035."
        return None, "Please provide a valid 4-digit pass-out year (e.g., 2023)."

    if field_key == "blood_group":
        cleaned = re.sub(r"\s+", "", text).upper()
        # Common blood groups
        match = re.search(r"\b(A|B|AB|O)[+-]\b", cleaned)
        if match:
            return match.group(0), None
        if "UNKNOWN" in cleaned or "NOT" in cleaned:
            return "Unknown", None
        return text[:10], None

    if len(text) > 200:
        return text[:200], None

    return text, None
