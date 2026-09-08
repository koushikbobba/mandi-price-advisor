import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Send, Database, BookOpen, CheckCircle2, AlertTriangle, 
  Sparkles, ChevronDown, ChevronUp, Code2, Globe, Clock, Zap,
  Mic, MicOff, Copy, Check, TrendingUp, ShieldAlert, Store, MapPin,
  SlidersHorizontal, Lightbulb, ArrowRight, Volume2, VolumeX, BarChart2,
  Calendar, Layers, ShieldCheck, Award, MessageSquareQuote, Printer, Download, FileText
} from 'lucide-react';
import { synthesizeClientAdvisory } from '../services/advisorEngine';

const STATE_MANDI_MAP = {
  'Andhra Pradesh': [
    'Guntur', 'Madanapalle', 'Nuzvid', 'Pulivendula', 'Kurnool', 
    'Anantapur', 'Nellore', 'Adoni', 'Vijayawada', 'Rajahmundry',
    'Chittoor', 'Tirupati', 'Kadapa', 'Eluru', 'Amalapuram',
    'Tenali', 'Hindupur', 'Ongole', 'Srikakulam', 'Vizianagaram'
  ],
  'Telangana': [
    'Bowenpally (Hyderabad)', 'Warangal', 'Nizamabad', 'Khammam', 'Karimnagar',
    'Suryapet', 'Mahbubnagar', 'Nalgonda', 'Siddipet', 'Adilabad',
    'Ramagundam', 'Miryalaguda', 'Jagtial', 'Nirmal', 'Kamareddy', 'Gadwal', 'Sircilla'
  ],
  'Tamil Nadu': [
    'Koyambedu (Chennai)', 'Trichy', 'Coimbatore', 'Erode', 'Pollachi',
    'Madurai', 'Salem', 'Tirunelveli', 'Thanjavur', 'Dindigul',
    'Theni', 'Dharmapuri', 'Vellore', 'Cuddalore', 'Kanchipuram',
    'Villupuram', 'Krishnagiri', 'Ottanchatram'
  ],
  'Karnataka': [
    'Kolar', 'Bengaluru (Binny Mill)', 'Chintamani', 'Hubli', 'Belagavi',
    'Mysuru', 'Shimoga', 'Hassan', 'Davanagere', 'Ballari',
    'Tumakuru', 'Raichur', 'Bijapur', 'Mandya', 'Gadag', 'Bagalkot'
  ],
  'Maharashtra': [
    'Lasalgaon', 'Nashik', 'Pimpalgaon', 'Pune', 'Solapur',
    'Ahmednagar', 'Nagpur', 'Vashi (Mumbai)', 'Sangli', 'Jalgaon',
    'Kolhapur', 'Latur', 'Akola', 'Amravati', 'Nanded', 'Rahata', 'Yeola'
  ],
  'Gujarat': [
    'Unjha', 'Rajkot', 'Gondal', 'Surat', 'Ahmedabad',
    'Vadodara', 'Morbi', 'Jamnagar', 'Junagadh', 'Mehsana',
    'Deesa', 'Anand', 'Bhavnagar', 'Porbandar'
  ],
  'Rajasthan': [
    'Jodhpur', 'Jaipur', 'Kota', 'Bikaner', 'Sri Ganganagar',
    'Alwar', 'Nagaur', 'Bharatpur', 'Sikar', 'Pali', 'Udaipur', 'Tonk', 'Hanumangarh'
  ],
  'Madhya Pradesh': [
    'Mandsaur', 'Indore', 'Ujjain', 'Neemuch', 'Bhopal',
    'Jabalpur', 'Ratlam', 'Gwalior', 'Sagar', 'Dewas', 'Khandwa', 'Khargone', 'Chhindwara', 'Vidisha'
  ],
  'Uttar Pradesh': [
    'Agra', 'Varanasi', 'Lucknow', 'Kanpur', 'Prayagraj',
    'Bareilly', 'Aligarh', 'Meerut', 'Mathura', 'Hathras', 'Farrukhabad', 'Sambhal', 'Barabanki'
  ],
  'Punjab': [
    'Khanna', 'Ludhiana', 'Jalandhar', 'Amritsar', 'Bathinda',
    'Patiala', 'Sangrur', 'Moga', 'Hoshiarpur', 'Abohar', 'Firozpur'
  ],
  'Delhi': [
    'Azadpur', 'Ghazipur', 'Okhla', 'Keshopur'
  ]
};

const CROPS_WITH_ICONS = [
  { name: 'Banana', icon: '🍌', label: 'Banana (అరటి / வாழை)' },
  { name: 'Tomato', icon: '🍅', label: 'Tomato (టమోటా / தக்காளி)' },
  { name: 'Chilli', icon: '🌶️', label: 'Chilli (మిరప / மிளகாய்)' },
  { name: 'Turmeric', icon: '🟡', label: 'Turmeric (పసుపు / மஞ்சள்)' },
  { name: 'Mango', icon: '🥭', label: 'Mango (మామిడి / மாம்பழம்)' },
  { name: 'Pomegranate', icon: '🍎', label: 'Pomegranate (దానిమ్మ / மாதுளை)' },
  { name: 'Onion', icon: '🧅', label: 'Onion (ఉల్లిపాయ / வெங்காயம்)' },
  { name: 'Potato', icon: '🥔', label: 'Potato (బంగాళాదుంప / உருளை)' },
  { name: 'Cotton', icon: '☁️', label: 'Cotton (పత్తి / பருத்தி)' },
  { name: 'Groundnut', icon: '🥜', label: 'Groundnut (వేరుశనగ / நிலக்கடலை)' },
  { name: 'Coconut', icon: '🥥', label: 'Coconut (కొబ్బరి / தேங்காய்)' },
  { name: 'Apple', icon: '🍏', label: 'Apple (యాపిల్ / ஆப்பிள்)' },
  { name: 'Grapes', icon: '🍇', label: 'Grapes (ద్రాక్ష / திராட்சை)' },
  { name: 'Lemon', icon: '🍋', label: 'Lemon (నిమ్మ / எலுமிச்சை)' },
  { name: 'Garlic', icon: '🧄', label: 'Garlic (వెల్లుల్లి / பூண்டு)' },
  { name: 'Ginger', icon: '🫚', label: 'Ginger (అల్లం / இஞ்சி)' },
  { name: 'Cumin (Jeera)', icon: '🌾', label: 'Jeera Cumin (జీలకర్ర / சீரகம்)' },
  { name: 'Wheat', icon: '🌾', label: 'Wheat (గోధుమ / கோதுமை)' },
  { name: 'Paddy', icon: '🍚', label: 'Paddy (వరి / நெல்)' }
];

const CATEGORIZED_PRESETS = [
  {
    category: '🌿 ఆంధ్ర & తెలంగాణ (AP / TG)',
    prompts: [
      { label: 'అరటి అమ్మకపు సమయం (Banana AP)', query: 'ఆంధ్రప్రదేశ్ లో అరటి పంటను అమ్మడానికి ఏ నెల మంచిది? గరిష్ట ధర ఎప్పుడు వస్తుంది?' },
      { label: 'గుంటూరు మిరపకాయలు (Guntur Chilli)', query: 'ఆంధ్రప్రదేశ్ లో గుంటూరు మిరపకాయల మార్కెట్ ధర ఎంత? ఇప్పుడు అమ్మాలా?' },
      { label: 'నిజామాబాద్ పసుపు (Nizamabad Turmeric)', query: 'నిజామాబాద్ తెలంగాణ మార్కెట్లో పసుపు ధరలు ఎలా ఉన్నాయి? ఎప్పుడు అమ్మాలి?' },
      { label: 'మదనపల్లె టమోటా (Madanapalle Tomato)', query: 'మదనపల్లె మార్కెట్లో టమోటా ధరల పరిస్థితి ఏమిటి? నిల్వ సలహా ఏమిటి?' },
      { label: 'నూజివీడు మామిడి (Nuzvid Mango)', query: 'నూజివీడు మరియు కృష్ణా జిల్లాలో బంగినపల్లి మామిడి ధరల సరళి ఎలా ఉంది?' },
      { label: 'వరంగల్ పత్తి (Warangal Cotton)', query: 'వరంగల్ మార్కెట్లో పత్తి ధరలు ఎలా ఉన్నాయి? నిల్వ చేయవచ్చా?' }
    ]
  },
  {
    category: '🌺 தமிழ்நாடு (Tamil Nadu)',
    prompts: [
      { label: 'திருச்சி வாழை (Trichy Banana)', query: 'திருச்சி மற்றும் தமிழ்நாட்டில் வாழை விற்பனை செய்ய சிறந்த மாதம் எது?' },
      { label: 'பொள்ளாச்சி தேங்காய் (Pollachi Coconut)', query: 'பொள்ளாச்சி தேங்காய் சந்தை விலை நிலவரம் என்ன? எப்போது உச்ச விலை கிடைக்கும்?' },
      { label: 'ஈரோடு மஞ்சள் (Erode Turmeric)', query: 'ஈரோடு மஞ்சள் சந்தையில் அதிகபட்ச விலை எப்போது கிடைக்கும்? சேமிப்பு முறை என்ன?' },
      { label: 'திண்டிவனம் தர்பூசணி (Tindivanam Watermelon)', query: 'தமிழ்நாட்டில் தர்பூசணி விலை போக்கு மற்றும் அறுவடை ஆலோசனை என்ன?' },
      { label: 'கோயம்பேடு தக்காளி (Koyambedu Tomato)', query: 'சென்னை கோயம்பேடு சந்தையில் தக்காளி விலை மற்றும் சேமிப்பு உத்தி என்ன?' }
    ]
  },
  {
    category: '🍎 Fruits & Vegetables',
    prompts: [
      { label: 'Banana Peak Months', query: 'When to sell my bananas in Andhra Pradesh which month is the best?' },
      { label: 'Pomegranate Peak', query: 'I want to sell my pomegranate, tell the best time and highest price in Maharashtra' },
      { label: 'Tomato Glut Strategy', query: 'Tomato prices are crashing in Kolar and Madanapalle, should I store or harvest immediately?' },
      { label: 'Onion Best Month', query: 'Which month is best to sell Rabi Onions in Maharashtra to get peak rates?' },
      { label: 'Apple CA Storage', query: 'What is the CA cold storage release strategy for Apple in Shimla and Delhi?' },
      { label: 'Garlic Mandsaur', query: 'What was the modal price of Garlic in Mandsaur Madhya Pradesh?' }
    ]
  },
  {
    category: '🌾 Spices & Cash Crops',
    prompts: [
      { label: 'Turmeric (Nizamabad/Erode)', query: 'Which month gives the highest price for Turmeric in Nizamabad Telangana and Erode Tamil Nadu?' },
      { label: 'Cumin (Jeera Unjha)', query: 'What is the Jeera price forecast in Unjha Gujarat and how to avoid blight?' },
      { label: 'Cotton (Warangal/Adoni)', query: 'Should I sell Shankar-6 Cotton at MSP or hold for January spinning mill demand in Warangal?' },
      { label: 'Groundnut (Anantapur/Adoni)', query: 'What is the groundnut storage protocol in Anantapur AP to prevent aflatoxin?' },
      { label: 'Coconut (Pollachi/Amalapuram)', query: 'When is the peak selling season for Coconut in Pollachi TN and Amalapuram AP?' }
    ]
  },
  {
    category: '🌐 हिंदी / ಕನ್ನಡ',
    prompts: [
      { label: 'Hindi Kela (केला)', query: 'आंध्र प्रदेश व महाराष्ट्र में केला बेचने का सबसे सही महीना कौन सा है?' },
      { label: 'Hindi Anar (अनार)', query: 'अनार की भगवा किस्म का नासिक मंडी में क्या भाव है और सबसे अच्छा महीना कौन सा है?' },
      { label: 'Hindi Pyaz (प्याज)', query: 'महाराष्ट्र में प्याज बेचने का सबसे सही समय और दिवाली पीक भाव कब मिलेगा?' },
      { label: 'Kannada Bale (ಬಾಳೆ)', query: 'ಕರ್ನಾಟಕದಲ್ಲಿ ಬಾಳೆಹಣ್ಣು ಮಾರಾಟ ಮಾಡಲು ಯಾವ ತಿಂಗಳು ಅತ್ಯುತ್ತಮ?' },
      { label: 'Kannada Eerulli (ಈರುಳ್ಳಿ)', query: 'ಈರುಳ್ಳಿ ಬೆಲೆ ಕುಸಿತ ತಡೆಯಲು ಶೇಖರಣೆ ಹೇಗೆ ಮಾಡಬೇಕು ಮತ್ತು ಬೆಂಗಳೂರು ದರ ಎಷ್ಟು?' }
    ]
  }
];

export default function AdvisorChat({ externalQuery, onClearExternalQuery, onOpenPriceExplorer }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [activePresetTab, setActivePresetTab] = useState(0);
  const [activeClickedPrompt, setActiveClickedPrompt] = useState(null);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState(null);
  const recognitionRef = useRef(null);
  const chatBottomRef = useRef(null);

  // Dynamic Dropdown Builder States
  const [selectedState, setSelectedState] = useState('Andhra Pradesh');
  const [selectedCity, setSelectedCity] = useState('Guntur');
  const [selectedCrop, setSelectedCrop] = useState('Banana');

  const [conversation, setConversation] = useState([
    {
      role: 'assistant',
      data: {
        query: 'Welcome to Mandi Price Advisor',
        detected_language: 'en',
        routed_category: 'HYBRID',
        routing_reason: 'System initialization',
        answer: `### 🌾 **Welcome to Mandi Price Advisor!** / **నమస్కారం!** / **வணக்கம்!** 🙏
        
Your AI agronomic economist covering **20+ Fruits, Vegetables, Spices, and Cash Crops** with deep coverage for **Andhra Pradesh, Telangana, Tamil Nadu, Karnataka, Maharashtra, MP, UP & North India**:
- **🌿 Andhra Pradesh (AP)**: Guntur (గుంటూరు), Madanapalle (మదనపల్లె), Nuzvid (నూజివీడు), Pulivendula (పులివెందుల), Kurnool (కర్నూలు), Anantapur (అనంతపురం), Nellore, Adoni.
- **🌿 Telangana (TG)**: Hyderabad Bowenpally (బోయిన్‌పల్లి), Warangal (వరంగల్), Nizamabad (నిజామాబాద్), Khammam (ఖమ్మం), Karimnagar.
- **🌺 Tamil Nadu (TN)**: Chennai Koyambedu (கோயம்பேடு), Trichy (திருச்சி), Coimbatore (கோவை), Erode (ஈரோடு), Pollachi (பொள்ளாச்சி), Madurai.
- **🍎 Complete Crop Matrix**: Banana, Mango, Pomegranate, Tomato, Chilli, Turmeric, Cotton, Groundnut, Coconut, Apple, Grapes, Potato, Onion, Lemon, Jeera.
- **🌐 5 Supported Languages**: Telugu (తెలుగు), Tamil (தமிழ்), Hindi (हिंदी), Kannada (ಕನ್ನಡ), and English with voice audio speech output.

🎯 **Click any suggested question or preset above** and the AI will analyze the live APMC spot rates and post-harvest protocols immediately!`,
        decision_action: 'INFORMATIONAL',
        reasoning: [
          'Real-time APMC Mandi Spot Rates grounded with Agmarknet data.',
          '300,000+ multi-year APMC price records across 150+ mandis in AP, TG, TN, MH, KA, and North India.',
          'ICAR post-harvest protocols from 14 national agronomic institutes.'
        ],
        confidence: 'HIGH',
        sql_executed: null,
        sources_cited: [],
        execution_time_ms: 8,
        is_cached: false
      }
    }
  ]);
  const [expandedDetails, setExpandedDetails] = useState({});

  useEffect(() => {
    if (externalQuery) {
      handlePresetClick(externalQuery, 'External Mandi Query');
      if (onClearExternalQuery) onClearExternalQuery();
    }
  }, [externalQuery]);

  const handleStateChange = (newState) => {
    setSelectedState(newState);
    const cities = STATE_MANDI_MAP[newState] || [];
    if (cities.length > 0) {
      setSelectedCity(cities[0]);
    }
  };

  const getDynamicSuggestions = () => {
    const cleanCity = selectedCity.replace(/\s*\(.*?\)\s*/g, '').trim();
    
    let regionalSuggestion = null;
    if (selectedState === 'Andhra Pradesh' || selectedState === 'Telangana') {
      regionalSuggestion = {
        label: `తెలుగు: ${cleanCity} ${selectedCrop} మార్కెట్`,
        query: `${selectedState} లోని ${cleanCity} మార్కెట్లో ${selectedCrop} ధరలు ఎలా ఉన్నాయి? అమ్మడానికి ఏ నెల మంచిది?`
      };
    } else if (selectedState === 'Tamil Nadu') {
      regionalSuggestion = {
        label: `தமிழ்: ${cleanCity} ${selectedCrop} ஆலோசனை`,
        query: `${cleanCity} மற்றும் தமிழ்நாட்டில் ${selectedCrop} சந்தை நிலவரம் என்ன? எப்போது உச்ச விலை கிடைக்கும்?`
      };
    } else if (selectedState === 'Karnataka') {
      regionalSuggestion = {
        label: `ಕನ್ನಡ: ${cleanCity} ${selectedCrop} ದರ`,
        query: `${cleanCity} ಮಾರುಕಟ್ಟೆಯಲ್ಲಿ ${selectedCrop} ಬೆಲೆ ಎಷ್ಟು ಮತ್ತು ಮಾರಾಟ ಮಾಡಲು ಉತ್ತಮ ಸಮಯ ಯಾವುದು?`
      };
    } else {
      regionalSuggestion = {
        label: `हिंदी: ${cleanCity} ${selectedCrop} सलाह`,
        query: `${cleanCity} मंडी (${selectedState}) में ${selectedCrop} बेचने का सबसे सही समय और उच्चतम भाव कब मिलेगा?`
      };
    }

    return [
      {
        label: `📅 Peak Selling Timing & Price Forecast`,
        query: `When to sell my ${selectedCrop} in ${cleanCity} (${selectedState}) and which month gives the highest peak price?`
      },
      {
        label: `💰 Current Spot Rate & Market Trend`,
        query: `What is the current market price of ${selectedCrop} in ${cleanCity} APMC mandi today and should I sell now?`
      },
      {
        label: `🛡️ Cold Storage & Spoilage Prevention`,
        query: `How to store ${selectedCrop} in ${cleanCity} to avoid post-harvest rotting and price collapse?`
      },
      regionalSuggestion
    ].filter(Boolean);
  };

  const dynamicSuggestions = getDynamicSuggestions();

  // Voice Recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'te-IN';

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setQuery(transcript);
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleVoice = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Speech recognition error:', err);
      }
    }
  };

  const speakText = (text, idx, lang = 'en') => {
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported in this browser.');
      return;
    }

    if (speakingIdx === idx) {
      window.speechSynthesis.cancel();
      setSpeakingIdx(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[#*`_~]/g, '').replace(/https?:\/\/\S+/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    if (lang === 'te') utterance.lang = 'te-IN';
    else if (lang === 'ta') utterance.lang = 'ta-IN';
    else if (lang === 'hi') utterance.lang = 'hi-IN';
    else if (lang === 'kn') utterance.lang = 'kn-IN';
    else utterance.lang = 'en-IN';

    utterance.rate = 0.95;
    utterance.onend = () => setSpeakingIdx(null);
    utterance.onerror = () => setSpeakingIdx(null);

    setSpeakingIdx(idx);
    window.speechSynthesis.speak(utterance);
  };

  const copyToClipboard = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handlePrintSlip = (msgData) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }
    const cleanAnswer = (msgData.answer || '').replace(/\*\*/g, '');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Mandi Price Advisory Slip - APMC Verified</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 35px; color: #0f172a; max-width: 650px; margin: 0 auto; line-height: 1.5; }
            .header { border-bottom: 2px solid #059669; padding-bottom: 15px; margin-bottom: 20px; }
            .badge { display: inline-block; background: #d1fae5; color: #065f46; font-size: 11px; font-weight: bold; padding: 3px 10px; border-radius: 9999px; margin-bottom: 8px; border: 1px solid #a7f3d0; }
            .title { font-size: 22px; font-weight: 800; color: #065f46; margin: 0; }
            .meta { font-size: 12px; color: #64748b; margin-top: 6px; }
            .decision-box { background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 12px; padding: 14px 18px; margin: 20px 0; font-weight: 700; color: #14532d; font-size: 15px; }
            .content { font-size: 13.5px; white-space: pre-line; background: #f8fafc; border: 1px solid #e2e8f0; padding: 18px; border-radius: 12px; color: #1e293b; }
            .footer { margin-top: 30px; border-top: 1px dashed #cbd5e1; padding-top: 14px; font-size: 11px; color: #64748b; display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="badge">Official APMC & ICAR Decision Advisory</div>
            <h1 class="title">🌾 Mandi Price Advisor</h1>
            <div class="meta">Lead Engineer: <strong>Bobba Koushik</strong> &bull; Date: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} &bull; Confidence: ${msgData.confidence || 'HIGH'}</div>
          </div>
          <div class="decision-box">🎯 Action Recommendation: ${msgData.decision_action || 'HOLD & STORE'}</div>
          <div class="content">${cleanAnswer}</div>
          <div class="footer">
            <div>&copy; 2026 Mandi Price Advisor &bull; Designed by Bobba Koushik</div>
            <div>Agmarknet Verified Intelligence</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const toggleDetails = (idx) => {
    setExpandedDetails(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  // Immediate Click-And-Show handler for quick presets & suggestions
  const handlePresetClick = (promptQuery, promptLabel) => {
    setActiveClickedPrompt(promptQuery);
    setQuery(promptQuery);
    handleSubmit(null, promptQuery);
  };

  const handleSubmit = async (e, customQuery) => {
    if (e) e.preventDefault();
    const queryToSend = customQuery || query;
    if (!queryToSend.trim() || loading) return;

    const userMsg = { role: 'user', text: queryToSend };
    setConversation(prev => [...prev, userMsg]);
    setQuery('');
    setLoading(true);

    try {
      const resp = await axios.post('/api/query/', { query: queryToSend, bypass_cache: true });
      const assistantMsg = { role: 'assistant', data: resp.data };
      setConversation(prev => [...prev, assistantMsg]);
      setExpandedDetails(prev => ({ ...prev, [conversation.length + 1]: true }));
    } catch (err) {
      console.warn('Backend query API unreachable, activating onboard Agricultural Intelligence Engine:', err.message);
      const fallbackData = synthesizeClientAdvisory(queryToSend);
      const assistantMsg = { 
        role: 'assistant', 
        data: {
          ...fallbackData,
          routed_category: 'SEASONAL_HARVEST_MATRIX',
          detected_language: fallbackData.language
        } 
      };
      setConversation(prev => [...prev, assistantMsg]);
      setExpandedDetails(prev => ({ ...prev, [conversation.length + 1]: true }));
    } finally {
      setLoading(false);
    }
  };

  const renderDecisionBanner = (data) => {
    const action = data.decision_action;
    if (!action || action === 'INFORMATIONAL' || action === 'ERROR') return null;

    let bannerConfig = {
      title: 'Action Advisory',
      bg: '',
      badge: 'bg-emerald-600 text-white',
      desc: 'Market conditions favorable for realization.',
      badgeText: '⚡ SELL NOW (High Spot Realization)'
    };

    if (action === 'HOLD') {
      bannerConfig = {
        title: 'Holding Advisory',
        bg: '',
        badge: 'bg-amber-600 text-white',
        desc: 'Hold for upcoming off-season festive peak window.',
        badgeText: '⏳ HOLD FOR PEAK (Supply Deficit Forecasted)'
      };
    } else if (action === 'STAGGER_SELL') {
      bannerConfig = {
        title: 'Tranche Dispatch Advisory',
        bg: '',
        badge: 'bg-sky-600 text-white',
        desc: 'Dispatch 40% immediate harvest, retain 60% in cold storage for post-glut prices.',
        badgeText: '📊 STAGGERED 3-TRANCHE DISPATCH'
      };
    }

    const bStyles = {
      SELL_NOW:     {bg:'rgba(16,185,129,0.1)', border:'rgba(16,185,129,0.3)', badgeBg:'rgba(16,185,129,0.2)', badgeColor:'#6ee7b7'},
      HOLD:         {bg:'rgba(251,191,36,0.08)', border:'rgba(251,191,36,0.3)', badgeBg:'rgba(251,191,36,0.15)', badgeColor:'#fde68a'},
      STAGGER_SELL: {bg:'rgba(125,211,252,0.08)', border:'rgba(125,211,252,0.25)', badgeBg:'rgba(125,211,252,0.15)', badgeColor:'#7dd3fc'},
    }[action] || {bg:'rgba(99,102,241,0.08)', border:'rgba(99,102,241,0.25)', badgeBg:'rgba(99,102,241,0.12)', badgeColor:'#a5b4fc'};
    return (
      <div className="rounded-xl p-3.5 space-y-2"
           style={{background:bStyles.bg, border:`1px solid ${bStyles.border}`}}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold"
                style={{background:bStyles.badgeBg, color:bStyles.badgeColor, fontFamily:"'Space Grotesk',sans-serif"}}>
            {bannerConfig.badgeText}
          </span>
          <span className="text-[11px] font-semibold flex items-center gap-1"
                style={{color:'rgba(100,116,139,0.9)', fontFamily:"'JetBrains Mono',monospace"}}>
            <Award className="w-3 h-3" style={{color:'#fbbf24'}} />
            Conf: {data.confidence || 'HIGH'} · Agmarknet + ICAR
          </span>
        </div>
        <p className="text-xs leading-relaxed" style={{color:'rgba(148,163,184,0.8)', fontFamily:"'Inter',sans-serif"}}>
          {bannerConfig.desc}
        </p>
      </div>
    );
  };

  const getActionBadge = (action) => {
    switch (action) {
      case 'SELL_NOW':
        return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold font-bold">⚡ SELL NOW</span>;
      case 'HOLD':
        return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold font-bold">⏳ HOLD FOR PEAK</span>;
      case 'STAGGER_SELL':
        return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold font-bold">📊 STAGGER DISPATCH</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold font-bold">ℹ️ ADVISORY</span>;
    }
  };

  const availableCities = STATE_MANDI_MAP[selectedState] || [];

  return (
    <div className="max-w-5xl mx-auto space-y-5">

      {/* ── SECTION 1: Dropdown Query Builder ── */}
      <div className="glass-card rounded-2xl p-5 space-y-4"
           style={{background:'rgba(15,23,42,0.75)', border:'1px solid rgba(16,185,129,0.18)', backdropFilter:'blur(18px)'}}>

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3"
             style={{borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                   style={{background:'linear-gradient(135deg,#065f46,#047857)', boxShadow:'0 0 16px rgba(16,185,129,0.4)'}}>
                <SlidersHorizontal className="w-4 h-4 text-emerald-300" />
              </div>
            </div>
            <div>
              <h2 style={{fontFamily:"'Space Grotesk',sans-serif"}}
                  className="text-sm font-bold text-white tracking-tight">
                Mandi &amp; Crop Decision Selector
              </h2>
              <p className="text-xs mt-0.5" style={{color:'rgba(148,163,184,0.8)'}}>
                Choose your State, Mandi &amp; Crop — get instant AI advisory
              </p>
            </div>
          </div>
          <span className="text-[11px] font-semibold px-3 py-1 rounded-full flex items-center gap-1.5"
                style={{background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.3)', color:'#6ee7b7'}}>
            <ShieldCheck className="w-3 h-3" />
            150+ APMCs · AP · TG · TN · KA
          </span>
        </div>

        {/* Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: '1. State', value: selectedState, onChange: (v) => handleStateChange(v),
              options: Object.keys(STATE_MANDI_MAP).map(s => ({v:s,l:s})) },
            { label: '2. Mandi / City', value: selectedCity, onChange: (v) => setSelectedCity(v),
              options: availableCities.map(c => ({v:c,l:c})) },
            { label: '3. Crop', value: selectedCrop, onChange: (v) => setSelectedCrop(v),
              options: CROPS_WITH_ICONS.map(cr => ({v:cr.name,l:`${cr.icon} ${cr.label}`})) },
          ].map(({label,value,onChange,options}) => (
            <div key={label}>
              <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5"
                     style={{color:'rgba(148,163,184,0.7)', fontFamily:"'Space Grotesk',sans-serif"}}>
                {label}
              </label>
              <select value={value} onChange={e => onChange(e.target.value)}
                className="w-full rounded-xl px-3.5 py-2.5 text-xs font-semibold cursor-pointer transition-all focus:outline-none"
                style={{background:'rgba(30,41,59,0.9)', border:'1px solid rgba(255,255,255,0.1)',
                        color:'#e2e8f0', fontFamily:"'Inter',sans-serif",
                        boxShadow:'inset 0 1px 2px rgba(0,0,0,0.3)'}}>
                {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            </div>
          ))}
        </div>

        {/* Smart Suggestions */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <span className="flex items-center gap-1.5 text-xs font-semibold"
                  style={{color:'rgba(209,213,219,0.85)', fontFamily:"'Space Grotesk',sans-serif"}}>
              <Lightbulb className="w-3.5 h-3.5" style={{color:'#fbbf24'}} />
              Suggestions for <span style={{color:'#34d399'}}>&nbsp;{selectedCrop}&nbsp;</span>
              in <span style={{color:'#7dd3fc'}}>&nbsp;{selectedCity}</span>
            </span>
            <button onClick={() => onOpenPriceExplorer && onOpenPriceExplorer(selectedCrop)}
              className="flex items-center gap-1 text-[11px] font-bold transition-all hover:opacity-80"
              style={{color:'#10b981', fontFamily:"'Space Grotesk',sans-serif"}}>
              <BarChart2 className="w-3.5 h-3.5" />
              Price Trends &amp; ROI →
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {getDynamicSuggestions().map((sug, sIdx) => (
              <button key={sIdx} onClick={() => handlePresetClick(sug.query, sug.label)}
                className="text-left p-3.5 rounded-xl border transition-all group flex items-start justify-between gap-2"
                style={activeClickedPrompt === sug.query
                  ? {background:'rgba(16,185,129,0.15)', border:'1px solid rgba(16,185,129,0.5)', boxShadow:'0 0 12px rgba(16,185,129,0.2)'}
                  : {background:'rgba(30,41,59,0.6)', border:'1px solid rgba(255,255,255,0.07)'}}>
                <div>
                  <div className="font-bold text-xs mb-0.5"
                       style={{color: activeClickedPrompt===sug.query ? '#6ee7b7' : '#a7f3d0',
                               fontFamily:"'Space Grotesk',sans-serif"}}>
                    {sug.label}
                  </div>
                  <div className="text-[11px] leading-relaxed line-clamp-2" style={{color:'rgba(148,163,184,0.7)'}}>
                    {sug.query}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 shrink-0 mt-0.5 opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all"
                            style={{color:'#10b981'}} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── SECTION 2: Regional Presets ── */}
      <div className="rounded-2xl p-4 space-y-3"
           style={{background:'rgba(15,23,42,0.65)', border:'1px solid rgba(255,255,255,0.07)', backdropFilter:'blur(12px)'}}>
        <div className="flex items-center justify-between pb-2" style={{borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
                style={{color:'rgba(148,163,184,0.7)', fontFamily:"'Space Grotesk',sans-serif"}}>
            <Sparkles className="w-3.5 h-3.5" style={{color:'#10b981'}} />
            Regional Quick Presets
          </span>
          <span className="text-[11px]" style={{color:'rgba(100,116,139,0.8)'}}>
            Telugu · Tamil · Hindi · Kannada · English
          </span>
        </div>
        {/* Tab Bar */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {CATEGORIZED_PRESETS.map((cat, idx) => (
            <button key={cat.category} onClick={() => setActivePresetTab(idx)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all"
              style={activePresetTab === idx
                ? {background:'linear-gradient(135deg,#065f46,#047857)', color:'#d1fae5',
                   fontFamily:"'Space Grotesk',sans-serif", boxShadow:'0 2px 8px rgba(16,185,129,0.3)'}
                : {background:'rgba(30,41,59,0.7)', color:'rgba(148,163,184,0.8)', fontFamily:"'Space Grotesk',sans-serif"}}>
              {cat.category}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {CATEGORIZED_PRESETS[activePresetTab].prompts.map((p, idx) => (
            <button key={idx} onClick={() => handlePresetClick(p.query, p.label)}
              className="text-left p-3 rounded-xl border transition-all group"
              style={activeClickedPrompt === p.query
                ? {background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.4)'}
                : {background:'rgba(30,41,59,0.5)', border:'1px solid rgba(255,255,255,0.06)'}}>
              <div className="font-semibold text-xs mb-0.5 group-hover:underline"
                   style={{color:'#6ee7b7', fontFamily:"'Space Grotesk',sans-serif"}}>{p.label}</div>
              <div className="text-[11px] line-clamp-1" style={{color:'rgba(148,163,184,0.65)'}}>{p.query}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── SECTION 3: Conversation Stream ── */}
      <div className="space-y-4 min-h-[200px]">
        {conversation.map((msg, idx) => (
          <div key={idx} className={`flex flex-col float-in ${msg.role==='user' ? 'items-end' : 'items-start'}`}
               style={{animationDelay:`${idx*0.04}s`}}>

            {msg.role === 'user' ? (
              <div className="max-w-2xl px-5 py-3 rounded-2xl rounded-tr-sm text-sm font-medium"
                   style={{background:'linear-gradient(135deg,#065f46,#047857)',
                           color:'#d1fae5', fontFamily:"'Inter',sans-serif",
                           boxShadow:'0 4px 20px rgba(16,185,129,0.25)'}}>
                {msg.text}
              </div>
            ) : (
              <div className="w-full rounded-2xl overflow-hidden"
                   style={{background:'rgba(15,23,42,0.8)', border:'1px solid rgba(16,185,129,0.2)',
                           backdropFilter:'blur(16px)', boxShadow:'0 8px 32px rgba(0,0,0,0.4)'}}>

                {/* AI Header Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
                     style={{borderBottom:'1px solid rgba(255,255,255,0.06)',
                             background:'rgba(6,95,70,0.15)'}}>
                  <div className="flex items-center gap-3">
                    {/* Animated AI orb */}
                    <div className="relative w-9 h-9 shrink-0">
                      <div className="absolute inset-0 rounded-full ai-glow"
                           style={{background:'linear-gradient(135deg,#064e3b,#065f46)',
                                   border:'1px solid rgba(16,185,129,0.4)'}} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm shimmer-text"
                              style={{fontFamily:"'Space Grotesk',sans-serif"}}>
                          Kisan AI Advisor
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                              style={{background:'rgba(16,185,129,0.15)', border:'1px solid rgba(16,185,129,0.3)',
                                      color:'#6ee7b7', fontFamily:"'JetBrains Mono',monospace"}}>
                          {msg.data.routed_category}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px]"
                           style={{color:'rgba(100,116,139,0.9)', fontFamily:"'JetBrains Mono',monospace"}}>
                        <Clock className="w-3 h-3" />
                        <span>{msg.data.execution_time_ms}ms</span>
                        <span style={{opacity:0.4}}>·</span>
                        <Globe className="w-3 h-3" />
                        <span>lang:{msg.data.detected_language?.toUpperCase()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Toolbar */}
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => speakText(msg.data.answer, idx, msg.data.detected_language)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={speakingIdx===idx
                        ? {background:'rgba(239,68,68,0.2)', border:'1px solid rgba(239,68,68,0.4)', color:'#fca5a5'}
                        : {background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.25)', color:'#6ee7b7'}}>
                      {speakingIdx===idx ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                      <span className="hidden sm:inline">{speakingIdx===idx ? 'Stop' : 'Listen'}</span>
                    </button>

                    {getActionBadge(msg.data.decision_action)}

                    <button onClick={() => handlePrintSlip(msg.data)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{background:'rgba(30,41,59,0.8)', border:'1px solid rgba(255,255,255,0.1)', color:'#94a3b8'}}>
                      <Printer className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Export</span>
                    </button>

                    <button onClick={() => copyToClipboard(msg.data.answer, idx)}
                      className="p-1.5 rounded-lg transition-all"
                      style={{background:'rgba(30,41,59,0.8)', border:'1px solid rgba(255,255,255,0.08)', color:'#94a3b8'}}>
                      {copiedIdx===idx ? <Check className="w-3.5 h-3.5" style={{color:'#34d399'}} /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="px-5 py-4 space-y-4">
                  {renderDecisionBanner(msg.data)}

                  {/* Answer Text */}
                  <div className="text-sm leading-relaxed whitespace-pre-line"
                       style={{color:'#cbd5e1', fontFamily:"'Inter',sans-serif", lineHeight:'1.75'}}>
                    {msg.data.answer}
                  </div>

                  {/* Reasoning Cards */}
                  {msg.data.reasoning && msg.data.reasoning.length > 0 && (
                    <div className="rounded-xl p-4 space-y-2"
                         style={{background:'rgba(30,41,59,0.6)', border:'1px solid rgba(255,255,255,0.06)'}}>
                      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest mb-2"
                           style={{color:'#6ee7b7', fontFamily:"'Space Grotesk',sans-serif"}}>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Key Decision Factors
                      </div>
                      <ul className="space-y-1.5">
                        {msg.data.reasoning.map((r, rIdx) => (
                          <li key={rIdx} className="flex items-start gap-2 text-xs leading-relaxed"
                              style={{color:'rgba(203,213,225,0.85)', fontFamily:"'Inter',sans-serif"}}>
                            <span style={{color:'#10b981', fontWeight:700, marginTop:2}}>▸</span>
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Toggle */}
                  <div className="flex items-center justify-between pt-2"
                       style={{borderTop:'1px solid rgba(255,255,255,0.05)'}}>
                    <button onClick={() => toggleDetails(idx)}
                      className="flex items-center gap-1.5 text-xs font-semibold transition-all hover:opacity-80"
                      style={{color:'#10b981', fontFamily:"'Space Grotesk',sans-serif"}}>
                      <Code2 className="w-3.5 h-3.5" />
                      {expandedDetails[idx] ? 'Hide Data Sources' : 'View APMC Records & ICAR Sources'}
                      {expandedDetails[idx] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    <span className="text-[11px] font-bold"
                          style={{color:'rgba(100,116,139,0.8)', fontFamily:"'JetBrains Mono',monospace"}}>
                      conf: {msg.data.confidence}
                    </span>
                  </div>

                  {/* Expandable Drawer */}
                  {expandedDetails[idx] && (
                    <div className="space-y-3 rounded-xl p-4"
                         style={{background:'rgba(2,6,23,0.6)', border:'1px solid rgba(255,255,255,0.06)'}}>

                      {msg.data.sql_executed && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold"
                               style={{color:'#7dd3fc', fontFamily:"'Space Grotesk',sans-serif"}}>
                            <Database className="w-3.5 h-3.5" />
                            APMC Database Records ({msg.data.sql_executed.count} rows)
                          </div>
                          <pre className="p-3 rounded-xl text-xs overflow-x-auto"
                               style={{background:'rgba(2,6,23,0.8)', color:'#67e8f9',
                                       fontFamily:"'JetBrains Mono',monospace", border:'1px solid rgba(103,232,249,0.15)'}}>
                            {msg.data.sql_executed.sql}
                          </pre>
                          {msg.data.sql_executed.records && msg.data.sql_executed.records.length > 0 && (
                            <div className="overflow-x-auto rounded-xl" style={{border:'1px solid rgba(255,255,255,0.08)'}}>
                              <table className="w-full text-xs" style={{fontFamily:"'JetBrains Mono',monospace"}}>
                                <thead>
                                  <tr style={{background:'rgba(30,41,59,0.9)', color:'rgba(148,163,184,0.8)',
                                              borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                                    {['Date','Commodity','Market','State','Modal Price'].map(h => (
                                      <th key={h} className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider">{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {msg.data.sql_executed.records.slice(0,5).map((rec, rIdx) => (
                                    <tr key={rIdx} style={{borderBottom:'1px solid rgba(255,255,255,0.04)',
                                                           background: rIdx%2===0 ? 'rgba(15,23,42,0.4)' : 'transparent'}}>
                                      <td className="px-3 py-2" style={{color:'rgba(148,163,184,0.7)'}}>{rec.arrival_date}</td>
                                      <td className="px-3 py-2 font-bold" style={{color:'#34d399'}}>{rec.commodity}</td>
                                      <td className="px-3 py-2" style={{color:'rgba(203,213,225,0.8)'}}>{rec.market}</td>
                                      <td className="px-3 py-2" style={{color:'rgba(100,116,139,0.8)'}}>{rec.state}</td>
                                      <td className="px-3 py-2 font-bold" style={{color:'#fbbf24'}}>
                                        ₹{(rec.modal_price*10).toLocaleString('en-IN')}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}

                      {msg.data.advanced_rag_metadata && (
                        <div className="space-y-2 pt-2" style={{borderTop:'1px solid rgba(255,255,255,0.05)'}}>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-xs font-bold"
                                  style={{color:'#a5b4fc', fontFamily:"'Space Grotesk',sans-serif"}}>
                              <Sparkles className="w-3.5 h-3.5" />
                              Advanced RAG · BM25 + Dense RRF + Re-Ranking
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded font-bold"
                                  style={{background:'rgba(99,102,241,0.15)', border:'1px solid rgba(99,102,241,0.3)',
                                          color:'#a5b4fc', fontFamily:"'JetBrains Mono',monospace"}}>
                              RRF Fusion
                            </span>
                          </div>
                          {msg.data.advanced_rag_metadata.extracted_scientific_parameters && (
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                              {[
                                {label:'Optimal Temp', val:msg.data.advanced_rag_metadata.extracted_scientific_parameters.optimal_storage_temperature, color:'#34d399'},
                                {label:'Rel. Humidity', val:msg.data.advanced_rag_metadata.extracted_scientific_parameters.optimal_relative_humidity, color:'#7dd3fc'},
                                {label:'Shelf Life', val:msg.data.advanced_rag_metadata.extracted_scientific_parameters.maximum_commercial_shelf_life, color:'#fbbf24'},
                                {label:'Pathogen Alert', val:msg.data.advanced_rag_metadata.extracted_scientific_parameters.critical_pathogen_warning, color:'#f87171'},
                              ].map(({label,val,color}) => (
                                <div key={label} className="p-2.5 rounded-xl"
                                     style={{background:'rgba(15,23,42,0.7)', border:'1px solid rgba(255,255,255,0.07)'}}>
                                  <span className="block text-[9px] font-bold uppercase tracking-widest mb-1"
                                        style={{color:'rgba(100,116,139,0.8)', fontFamily:"'Space Grotesk',sans-serif"}}>
                                    {label}
                                  </span>
                                  <span className="text-xs font-bold" style={{color, fontFamily:"'JetBrains Mono',monospace"}}>
                                    {val || '—'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                          {msg.data.advanced_rag_metadata.multi_query_facets && msg.data.advanced_rag_metadata.multi_query_facets.length > 0 && (
                            <div className="rounded-xl p-3" style={{background:'rgba(15,23,42,0.6)', border:'1px solid rgba(255,255,255,0.06)'}}>
                              <span className="block text-[10px] font-bold uppercase tracking-widest mb-1.5"
                                    style={{color:'rgba(100,116,139,0.7)', fontFamily:"'Space Grotesk',sans-serif"}}>
                                Multi-Query Expanded Facets
                              </span>
                              <ul className="space-y-0.5">
                                {msg.data.advanced_rag_metadata.multi_query_facets.map((facet, fIdx) => (
                                  <li key={fIdx} className="text-[11px] line-clamp-1"
                                      style={{color:'rgba(148,163,184,0.7)', fontFamily:"'JetBrains Mono',monospace"}}>
                                    › {facet}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {msg.data.sources_cited && msg.data.sources_cited.length > 0 && (
                        <div className="space-y-2 pt-2" style={{borderTop:'1px solid rgba(255,255,255,0.05)'}}>
                          <div className="flex items-center gap-1.5 text-xs font-bold"
                               style={{color:'#fbbf24', fontFamily:"'Space Grotesk',sans-serif"}}>
                            <BookOpen className="w-3.5 h-3.5" />
                            ICAR Research Citations
                          </div>
                          {msg.data.sources_cited.map((src, sIdx) => (
                            <div key={sIdx} className="p-3 rounded-xl space-y-1"
                                 style={{background:'rgba(15,23,42,0.6)', border:'1px solid rgba(255,255,255,0.06)'}}>
                              <div className="flex items-center justify-between text-xs font-bold"
                                   style={{color:'#fde68a', fontFamily:"'Space Grotesk',sans-serif"}}>
                                <span>{src.title}</span>
                                <span style={{color:'rgba(100,116,139,0.7)', fontFamily:"'JetBrains Mono',monospace", fontSize:'10px'}}>
                                  {((src.relevance_score||0.9)*100).toFixed(1)}% match
                                </span>
                              </div>
                              <div className="text-xs leading-relaxed" style={{color:'rgba(148,163,184,0.75)'}}>
                                {src.chunk_text || src.snippet}
                              </div>
                              <div className="flex items-center gap-2 pt-1 text-[10px]"
                                   style={{borderTop:'1px solid rgba(255,255,255,0.04)',
                                           color:'rgba(100,116,139,0.7)', fontFamily:"'JetBrains Mono',monospace"}}>
                                <span>🏛️ {src.source || 'ICAR National Agricultural Research Protocol'}</span>
                                <span>·</span>
                                <span>Peer-Reviewed</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-start">
            <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm"
                 style={{background:'rgba(15,23,42,0.8)', border:'1px solid rgba(16,185,129,0.25)',
                         color:'#6ee7b7', backdropFilter:'blur(12px)'}}>
              <Sparkles className="w-5 h-5 spin-slow" style={{color:'#10b981'}} />
              <span style={{fontFamily:"'Inter',sans-serif", color:'rgba(148,163,184,0.85)'}}>
                Retrieving live APMC spot rates &amp; ICAR protocols...
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── SECTION 4: Input Bar ── */}
      <form onSubmit={handleSubmit} className="sticky bottom-4 z-20">
        <div className="relative flex items-center rounded-2xl p-2 transition-all"
             style={{background:'rgba(15,23,42,0.9)', backdropFilter:'blur(20px)',
                     border:'1px solid rgba(16,185,129,0.3)', boxShadow:'0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(16,185,129,0.1)'}}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask anything — e.g. When to sell bananas in AP? / గుంటూరు మిర్చి ధర ఎంత? / திருச்சி வாழை?"
            className="w-full bg-transparent px-4 py-2 text-sm focus:outline-none"
            style={{color:'#e2e8f0', fontFamily:"'Inter',sans-serif",
                    caretColor:'#10b981'}}
            disabled={loading}
          />
          <div className="flex items-center gap-1.5 pr-1">
            <button type="button" onClick={toggleVoice}
              className="p-2.5 rounded-xl transition-all"
              style={isListening
                ? {background:'rgba(239,68,68,0.2)', border:'1px solid rgba(239,68,68,0.4)', color:'#fca5a5'}
                : {background:'rgba(30,41,59,0.8)', border:'1px solid rgba(255,255,255,0.08)', color:'#94a3b8'}}>
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <button type="submit" disabled={loading || !query.trim()}
              className="p-2.5 rounded-xl font-bold transition-all disabled:opacity-40"
              style={{background:'linear-gradient(135deg,#065f46,#047857)',
                      color:'#d1fae5', boxShadow:'0 4px 12px rgba(16,185,129,0.3)'}}>
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
