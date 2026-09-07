import re
import difflib

# Comprehensive Multilingual & Phonetic Agricultural Commodity Dictionary
CROP_SYNONYMS = {
    # FRUITS
    "Pomegranate": [
        "pomegranate", "pomogranate", "promoganate", "promegranate", "pomegranat", "pomegrante",
        "anar", "anaar", "anaari", "अनार", "अणार", "dalimb", "dalimbe", "ದಾಳಿಂಬೆ", "dalimba",
        "dhalimb", "madhulai", "mathulai", "மாதுளை", "danimma", "దానిమ్మ", "దానిమ్మకాయ", "dhanimma", "danimmakaya"
    ],
    "Apple": [
        "apple", "aple", "appal", "seb", "saeb", "सेब", "sebu", "ಸೇಬು", "kashmiri apple",
        "shimla apple", "royal delicious", "kullu apple", "aappil", "ஆப்பிள்", "aapple", "ఆపిల్", "యాపిల్"
    ],
    "Mango": [
        "mango", "mengo", "aam", "आम", "alphonso", "kesar", "badami", "totapuri", "dasheri",
        "banganapalli", "manga", "maavinahannu", "ಮಾವಿನಹಣ್ಣು", "maavina", "mambazham", "மாம்பழம்", "மாங்காய்", "மாம்பழ",
        "mamidi", "మామిడి", "మామిడిపండు", "mamidikaya", "mamidipandu", "rasalu"
    ],
    "Banana": [
        "banana", "banna", "kela", "केला", "robusta", "g9", "yelakki", "balehannu", "ಬಾಳೆಹಣ್ಣು",
        "baale", "vaazhaipazham", "வாழைப்பழம்", "வாழை", "வாழைக்காய்", "arati", "aratikaya", "aratipandu", "అరటి", "అరటికాయ", "అరటిపండు"
    ],
    "Grapes": [
        "grapes", "grape", "angoor", "angur", "अंगूर", "drakshi", "ದ್ರಾಕ್ಷಿ", "draksha",
        "thomson seedless", "sonaka", "sharad seedless", "thiratchai", "திராட்சை", "drakshalu", "ద్రాక్ష", "ద్రాక్షపండ్లు"
    ],
    "Orange": [
        "orange", "santra", "santre", "संतरा", "nagpur orange", "kinnow", "kinnu", "mandarin",
        "kittale", "ಕಿತ್ತಳೆ", "aaranchu", "நாரத்தை", "kamala", "narangi", "నారింజ", "కమలాపండు"
    ],
    "Papaya": [
        "papaya", "papeeta", "papita", "पपीता", "red lady", "parangi", "ಪರಂಗಿ", "parangihannu",
        "pappali", "பப்பாளி", "boppayi", "బొప్పాయి", "బొప్పాయికాయ", "boppayikaya"
    ],
    "Guava": [
        "guava", "guawa", "amrood", "amrud", "अमरूद", "sebe", "sebehannu", "ಸೀಬೆಹಣ್ಣು", "sebe",
        "koyya", "கொய்யா", "jama", "jamakaya", "జామకాయ", "జామపండు", "l-49", "safeda"
    ],
    "Watermelon": [
        "watermelon", "tarbooz", "tarbuz", "तरबूज", "kallangadi", "ಕಲ್ಲಂಗಡಿ", "kallangadihannu",
        "tharpoos", "தர்பூசணி", "puchakaya", "పుచ్చకాయ", "పుచ్చపండు"
    ],
    "Pineapple": [
        "pineapple", "ananas", "अनानास", "ananasina", "ಅನಾನಸ್", "annasi", "அன்னாசி", "అనాస", "అనాసపండు"
    ],
    "Lemon": [
        "lemon", "nimbu", "neembu", "नींबू", "nimbe", "ನಿಂಬೆಹಣ್ಣು", "nimbehannu", "elumichai", "எலுமிச்சை", "nimma", "నిమ్మకాయ", "నిమ్మ"
    ],
    "Sweet Lime (Mosambi)": [
        "mosambi", "mousambi", "sweet lime", "मौसम", "ಮೋಸಂಬಿ", "sathukudi", "சாத்துக்குடி", "battayi", "బత్తాయి", "బత్తాయిపండు"
    ],

    # VEGETABLES
    "Tomato": [
        "tomato", "tomoto", "tamatar", "टमाटर", "tamata", "tamataru", "tamato",
        "thakkali", "தக்காಳಿ", "ಟೊಮೆಟೊ", "tamata", "టమోటా", "టమాట", "టమాటో"
    ],
    "Onion": [
        "onion", "onoin", "pyaz", "pyaaz", "kanda", "प्याज", "कांदा",
        "eerulli", "irulli", "ಈರುಳ್ಳಿ", "vengayam", "வெங்காயம்", "ullipayalu", "ullipaya", "ఉల్లిపాయ", "ఉల్లిగడ్డ", "dungri"
    ],
    "Potato": [
        "potato", "aloo", "alu", "आलू", "batata", "ಬಟಾಟೆ", "alugadde", "ಆಲೂಗಡ್ಡೆ",
        "urulaikizhangu", "உருளைக்கிழங்கு", "bangaladumpa", "బంగాళాదుంప", "ఆలుగడ్డ"
    ],
    "Green Chilli": [
        "green chilli", "green chili", "chilli", "chili", "mirchi", "hari mirch", "हरी मिर्च",
        "menasinakayi", "hasiru menasinakayi", "ಹಸಿರು ಮೆಣಸಿನಕಾಯಿ", "pachai milagai", "பச்சை மிளகாய்",
        "pachi mirapa", "mirapakaya", "మిరపకాయ", "మిర్చి", "పచ్చిమిర్చి", "పచ్చి మిరపకాయలు"
    ],
    "Capsicum": [
        "capsicum", "shimla mirch", "shimla mirchi", "शिमला मिर्च", "bell pepper",
        "dodda menasinakayi", "ದೊಡ್ಡ ಮೆಣಸಿನಕಾಯಿ", "kuda milagai", "గుజ్జు మిరప", "క్యాప్సికం"
    ],
    "Cauliflower": [
        "cauliflower", "gobhi", "phool gobhi", "phoolgobhi", "फूलगोभी",
        "huvakosu", "ಹೂಕೋಸು", "kaaliflavar", "koolappu", "కాలీఫ్లవర్", "పువ్వుకోసు"
    ],
    "Cabbage": [
        "cabbage", "patta gobhi", "band gobhi", "पत्तागोभी", "yelekosu", "ಎಲೆಕೋಸು", "muttakose", "క్యాబేజీ", "ఆకుకూరకోసు"
    ],
    "Brinjal": [
        "brinjal", "eggplant", "aubergine", "baingan", "बैंगन", "badane", "badanekayi", "ಬದನೆಕಾಯಿ",
        "kathirikai", "கத்தரிக்காய்", "vankaya", "వంకాయ", "గుత్తి వంకాయ"
    ],
    "Ginger": [
        "ginger", "adrak", "adrakh", "अदरक", "shunti", "ಶುಂಠಿ", "inji", "இஞ்சி", "allam", "అల్లం"
    ],
    "Garlic": [
        "garlic", "lahsun", "lehsun", "लहसुन", "bellulli", "ಬೆಳ್ಳುಳ್ಳಿ", "poondu", "பூண்டு", "vellulli", "వెల్లుల్లి", "చిన్న ఉల్లిపాయ"
    ],
    "Okra (Bhindi)": [
        "okra", "bhindi", "bhendi", "भिंडी", "ladies finger", "lady finger",
        "bende", "bendekayi", "ಬೆಂಡೆಕಾಯಿ", "vendakkai", "వెண்டைக்காய்", "bendakaya", "బెండకాయ"
    ],
    "Green Peas": [
        "green peas", "peas", "matar", "mutter", "मटर", "batani", "ಬಟಾಣಿ", "pattani", "బఠానీ", "పచ్చి బఠానీలు"
    ],
    "Carrot": [
        "carrot", "gajar", "गाजर", "carot", "క్యారెట్", "క్యారెట్", "கேரட்"
    ],
    "Cucumber": [
        "cucumber", "kheera", "kakdi", "खीरा", "southekayi", "ಸೌತೆಕಾಯಿ", "vellarikka", "dosakaya", "దోసకాయ", "కీరదోస"
    ],

    # GRAINS, OILSEEDS & CASH CROPS
    "Wheat": [
        "wheat", "gehu", "gehun", "गेहूं", "godhi", "ಗೋಧಿ", "godhumai", "கோதுமை", "godhumalu", "గోధుమలు", "గోధుమ"
    ],
    "Paddy(Dhan)": [
        "paddy", "rice", "dhan", "dhaan", "धान", "chawal", "bhatta", "ಭತ್ತ", "nellu", "நெல்", "vari", "వరి", "బియ్యం", "వరి ధాన్యం"
    ],
    "Cotton": [
        "cotton", "kapas", "kapaas", "कपास", "rui", "hathi", "ಹತ್ತಿ", "paruthi", "பருத்தி", "prathi", "పత్తి", "దూది"
    ],
    "Soyabean": [
        "soyabean", "soybean", "soya", "सोयाबीन", "soya bean", "సోయాబీన్"
    ],
    "Mustard": [
        "mustard", "sarson", "sarsho", "सरसों", "sasive", "ಸಾಸಿವೆ", "kadugu", "aavalu", "ఆవాలు"
    ],
    "Chana (Gram)": [
        "chana", "gram", "bengal gram", "chickpea", "चना", "kadale", "ಕಡಲೆ", "kadalai", "senagalu", "శనగలు"
    ],
    "Tur (Arhar)": [
        "tur", "arhar", "red gram", "pigeon pea", "तूर", "अरहर", "togari", "ತೊಗರಿ", "thuvarai", "kandulu", "కందులు"
    ],
    "Maize": [
        "maize", "corn", "makka", "bhutta", "मक्का", "musukina jola", "ಮುಸುಕಿನ ಜೋಳ", "makka jonna", "మొక్కజొన్న"
    ],
    "Groundnut": [
        "groundnut", "peanut", "moongfali", "mungfali", "मूंगफली", "shenga", "ಶೇಂಗಾ", "kadalaikkay", "kadalai", "verusanaga", "వేరుశెనగ", "వేరుశనగ", "పల్లీలు"
    ],
    "Turmeric": [
        "turmeric", "haldi", "हल्दी", "arishina", "ಅರಿಶಿನ", "manjal", "மஞ்சள்", "மஞ்சள் பயிர்", "pasupu", "పసుపు"
    ],
    "Cumin (Jeera)": [
        "jeera", "cumin", "zeera", "जीरा", "jeerige", "ಜೀರಿಗೆ", "seeragam", "jeelakarra", "జీలకర్ర"
    ],
    "Coriander": [
        "coriander", "dhania", "dhaniya", "धनिया", "kothambari", "ಕೊತ್ತಂಬರಿ", "kothamalli", "dhaniyalu", "ధనియాలు", "కొత్తిమీర"
    ],
    "Coconut": [
        "coconut", "nariyal", "नारियल", "tenginakayi", "ತೆಂಗಿನಕಾಯಿ", "tenga", "தேங்காய்", "கொப்பரை", "kobari", "కొబ్బరి", "కొబ్బరికాయ"
    ]
}

# State synonyms and spellings
STATE_SYNONYMS = {
    "Maharashtra": ["maharashtra", "mh", "maha", "महाराष्ट्र", "ಮಹಾರಾಷ್ಟ್ರ", "మహారాష్ట్ర"],
    "Karnataka": ["karnataka", "ka", "kar", "कर्नाटक", "ಕರ್ನಾಟಕ", "ಕರ್ನಾಟಕ", "కర్ణాటక"],
    "Madhya Pradesh": ["madhya pradesh", "mp", "मध्य प्रदेश", "ಮಧ್ಯ ಪ್ರದೇಶ", "మధ్యప్రదేశ్"],
    "Uttar Pradesh": ["uttar pradesh", "up", "उत्तर प्रदेश", "ಉತ್ತರ ಪ್ರದೇಶ", "ఉత్తరప్రదేశ్"],
    "Punjab": ["punjab", "pb", "पंजाब", "ಪಂಜಾಬ್", "పంజాబ్"],
    "Gujarat": ["gujarat", "gj", "गुजरात", "ಗುಜರಾತ್", "గుజరాత్"],
    "Rajasthan": ["rajasthan", "rj", "राजस्थान", "ರಾಜಸ್ಥಾನ", "రాజస్థాన్"],
    "Andhra Pradesh": ["andhra pradesh", "andhrapradesh", "ap", "andhra", "andhra pradesh state", "आंध्र प्रदेश", "ಆಂಧ್ರ ಪ್ರದೇಶ", "ఆంధ్రప్రదేశ్", "ఆంధ్ర", "ஆந்திரா", "ஆந்திர பிரதேசம்"],
    "Telangana": ["telangana", "tg", "ts", "telengana", "telangana state", "तेलंगाना", "ತೆಲಂಗಾಣ", "తెలంగాణ", "தெலுங்கானா"],
    "Tamil Nadu": ["tamil nadu", "tamilnadu", "tn", "tamil nadu state", "தமிழ்நாடு", "तमिलनाडु", "ತಮಿಳುನಾಡು", "తమిళనాడు", "தமிழ்"],
    "Kerala": ["kerala", "kl", "केरल", "ಕೇರಳ", "కేరళ"],
    "West Bengal": ["west bengal", "bengal", "wb", "पश्चिम बंगाल", "ಪಶ್ಚಿಮ ಬಂಗಾಳ", "పశ్చిమ బెంగాల్"],
    "Bihar": ["bihar", "br", "बिहार", "ಬಿಹಾರ", "బీహార్"],
    "Himachal Pradesh": ["himachal pradesh", "himachal", "hp", "हिमाचल प्रदेश", "ಹಿಮಾಚಲ ಪ್ರದೇಶ", "హిమాచల్ ప్రదేశ్"],
    "Haryana": ["haryana", "hr", "हरियाणा", "ಹರಿಯಾಣ", "హర్యానా"],
    "Delhi": ["delhi", "new delhi", "nct", "दिल्ली", "ದೆಹಲಿ", "ఢిల్లీ"],
    "Odisha": ["odisha", "orissa", "ओडिशा", "ಒಡಿಶಾ", "ఒడిశా"],
    "Assam": ["assam", "as", "असम", "ಅಸ್ಸಾಂ", "అస్సాం"]
}

class AgriculturalEntityMatcher:
    @staticmethod
    def match_crop(query_text: str) -> str:
        """Phonetically and semantically extracts standardized crop from query text."""
        q_lower = query_text.lower().strip()
        words = re.findall(r'[\w]+', q_lower)
        
        # 1. Longest-match first across all crop synonyms with word boundary protection
        candidates = []
        for standard_crop, synonyms in CROP_SYNONYMS.items():
            for syn in synonyms:
                candidates.append((len(syn), syn.lower(), standard_crop))
        candidates.sort(key=lambda x: x[0], reverse=True)
        
        for syn_len, syn, standard_crop in candidates:
            # Check non-ascii or multi-word
            if not syn.isascii() or ' ' in syn:
                if syn in q_lower:
                    return standard_crop
            else:
                # Word boundary check for ascii short words (e.g. 'tur' vs 'turmeric')
                if re.search(r'\b' + re.escape(syn) + r'\b', q_lower) or any(syn == w for w in words):
                    return standard_crop
                    
        # 2. Fuzzy Levenshtein / SequenceMatcher for typos
        best_match = None
        best_ratio = 0.0
        
        for w in words:
            if len(w) < 4:
                continue
            for standard_crop, synonyms in CROP_SYNONYMS.items():
                close_matches = difflib.get_close_matches(w, synonyms, n=1, cutoff=0.68)
                if close_matches:
                    sim = difflib.SequenceMatcher(None, w, close_matches[0]).ratio()
                    if sim > best_ratio:
                        best_ratio = sim
                        best_match = standard_crop
                        
        if best_match and best_ratio >= 0.68:
            return best_match
            
        return "General"

    @staticmethod
    def match_state(query_text: str) -> str:
        """Extracts standard State name from query text avoiding short abbreviation collisions."""
        q_lower = query_text.lower().strip()
        words = re.findall(r'[\w]+', q_lower)
        
        # 1. Multi-word state names first
        for standard_state, synonyms in STATE_SYNONYMS.items():
            for syn in synonyms:
                if ' ' in syn and syn.lower() in q_lower:
                    return standard_state
                    
        # 2. Single word / standalone word matching
        for standard_state, synonyms in STATE_SYNONYMS.items():
            for syn in synonyms:
                if len(syn) <= 3:
                    if any(syn.lower() == w for w in words):
                        return standard_state
                else:
                    if syn.lower() in q_lower or any(syn.lower() == w for w in words):
                        return standard_state
                    
        # 3. Comprehensive Market to State inference
        market_to_state = {
            "nashik": "Maharashtra", "lasalgaon": "Maharashtra", "pune": "Maharashtra", "solapur": "Maharashtra", "nagpur": "Maharashtra", "vashi": "Maharashtra", "ratnagiri": "Maharashtra", "sangli": "Maharashtra", "latur": "Maharashtra", "jalgaon": "Maharashtra", "ahmednagar": "Maharashtra", "akola": "Maharashtra",
            "bangalore": "Karnataka", "bengaluru": "Karnataka", "kolar": "Karnataka", "hubli": "Karnataka", "gadag": "Karnataka", "bagalkot": "Karnataka", "mysore": "Karnataka", "mysuru": "Karnataka", "hassan": "Karnataka", "belgaum": "Karnataka", "belagavi": "Karnataka", "raichur": "Karnataka", "kalaburagi": "Karnataka", "gulbarga": "Karnataka", "bidar": "Karnataka", "shimoga": "Karnataka",
            "guntur": "Andhra Pradesh", "khammam": "Telangana", "madanapalle": "Andhra Pradesh", "adoni": "Andhra Pradesh", "vijayawada": "Andhra Pradesh", "warangal": "Telangana", "nizamabad": "Telangana", "bowenpally": "Telangana", "hyderabad": "Telangana", "nuzvid": "Andhra Pradesh", "anantapur": "Andhra Pradesh", "kurnool": "Andhra Pradesh", "nellore": "Andhra Pradesh", "pulivendula": "Andhra Pradesh", "tenali": "Andhra Pradesh",
            "mandsaur": "Madhya Pradesh", "indore": "Madhya Pradesh", "neemuch": "Madhya Pradesh", "jabalpur": "Madhya Pradesh", "khargone": "Madhya Pradesh", "ujjain": "Madhya Pradesh", "vidisha": "Madhya Pradesh", "chhindwara": "Madhya Pradesh", "morena": "Madhya Pradesh",
            "agra": "Uttar Pradesh", "lucknow": "Uttar Pradesh", "kanpur": "Uttar Pradesh", "varanasi": "Uttar Pradesh", "allahabad": "Uttar Pradesh", "meerut": "Uttar Pradesh", "mathura": "Uttar Pradesh", "malihabad": "Uttar Pradesh",
            "shimla": "Himachal Pradesh", "kullu": "Himachal Pradesh", "solan": "Himachal Pradesh", "mandi": "Himachal Pradesh",
            "jalandhar": "Punjab", "khanna": "Punjab", "amritsar": "Punjab", "abohar": "Punjab", "ludhiana": "Punjab", "patiala": "Punjab",
            "azadpur": "Delhi", "ghazipur": "Delhi", "okhla": "Delhi",
            "jaipur": "Rajasthan", "kota": "Rajasthan", "alwar": "Rajasthan", "bikaner": "Rajasthan", "jodhpur": "Rajasthan", "sri ganganagar": "Rajasthan",
            "rajkot": "Gujarat", "gondal": "Gujarat", "surat": "Gujarat", "anand": "Gujarat", "deesa": "Gujarat", "unjha": "Gujarat", "junagadh": "Gujarat", "vadodara": "Gujarat", "bharuch": "Gujarat",
            "trichy": "Tamil Nadu", "coimbatore": "Tamil Nadu", "erode": "Tamil Nadu", "pollachi": "Tamil Nadu", "madurai": "Tamil Nadu", "villupuram": "Tamil Nadu", "tindivanam": "Tamil Nadu", "chennai": "Tamil Nadu", "koyambedu": "Tamil Nadu", "salem": "Tamil Nadu", "thanjavur": "Tamil Nadu", "tiruppur": "Tamil Nadu", "dindigul": "Tamil Nadu", "tirunelveli": "Tamil Nadu",
            "wayanad": "Kerala", "kalpetta": "Kerala", "vazhakulam": "Kerala", "kochi": "Kerala", "kozhikode": "Kerala",
            "hooghly": "West Bengal", "burdwan": "West Bengal", "ranaghat": "West Bengal", "siliguri": "West Bengal", "sheoraphuli": "West Bengal",
            "patna": "Bihar", "hajipur": "Bihar", "nalanda": "Bihar",
            "cuttack": "Odisha", "silchar": "Assam"
        }
        for mkt, st in market_to_state.items():
            if mkt in q_lower:
                return st
                
        # 4. Fuzzy fallback for state names
        for w in words:
            if len(w) < 5:
                continue
            for standard_state, synonyms in STATE_SYNONYMS.items():
                close = difflib.get_close_matches(w, [s for s in synonyms if len(s) > 4], n=1, cutoff=0.78)
                if close:
                    return standard_state
                    
        return None

    @staticmethod
    def detect_language(query_text: str) -> str:
        """Detects language (Telugu, Kannada, Hindi, or English)."""
        # Check Telugu script range (\u0C00 to \u0C7F)
        if any('\u0c00' <= char <= '\u0c7f' for char in query_text):
            return 'te'
        # Check Kannada script range (\u0C80 to \u0CFF)
        if any('\u0c80' <= char <= '\u0cff' for char in query_text):
            return 'kn'
        # Check Devanagari script range (\u0900 to \u097F)
        if any('\u0900' <= char <= '\u097f' for char in query_text):
            return 'hi'
        # Check Tamil script range (\u0B80 to \u0BFF)
        if any('\u0b80' <= char <= '\u0bff' for char in query_text):
            return 'ta'
            
        q_lower = query_text.lower()
        if any(k in q_lower for k in ['eppudu', 'entha', 'ammala', 'ammali', 'dhara', 'dharalu', 'samayam', 'bhavu', 'nilva', 'telugu']):
            return 'te'
        if any(k in q_lower for k in ['elli', 'enu', 'marata', 'beka', 'dara', 'yavaga', 'madala', 'kannada']):
            return 'kn'
        if any(k in q_lower for k in ['kya', 'bechu', 'bechna', 'aaj', 'bhav', 'mein', 'hai', 'chahiye', 'kaise', 'hindi']):
            return 'hi'
        if any(k in q_lower for k in ['eppo', 'eppothu', 'vikkalaam', 'vikkalam', 'vilai', 'nalladhu', 'thaan', 'tamil']):
            return 'ta'
            
        return 'en'

entity_matcher = AgriculturalEntityMatcher()
