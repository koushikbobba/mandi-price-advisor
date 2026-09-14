import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

import axios from 'axios';
import {
  Send, Mic, MicOff, Sparkles, ChevronDown,
  TrendingUp, Copy, Check, Volume2, VolumeX,
  RotateCcw, ArrowRight, Bot, User, Loader2,
  MapPin, Store
} from 'lucide-react';
import { synthesizeClientAdvisory, detectCropFromQuery, CROP_INTELLIGENCE } from '../services/advisorEngine';
import { runGeminiRAG, isGeminiAvailable } from '../services/geminiRAG';

const STATE_MANDI_MAP = {
  'Andhra Pradesh': ['Guntur', 'Madanapalle', 'Nuzvid', 'Kurnool', 'Nellore', 'Vijayawada', 'Chittoor', 'Tirupati', 'Ongole'],
  'Telangana': ['Bowenpally (Hyderabad)', 'Warangal', 'Nizamabad', 'Khammam', 'Karimnagar', 'Suryapet', 'Mahbubnagar'],
  'Tamil Nadu': ['Koyambedu (Chennai)', 'Trichy', 'Coimbatore', 'Erode', 'Madurai', 'Salem', 'Thanjavur'],
  'Karnataka': ['Kolar', 'Bengaluru (Binny Mill)', 'Hubli', 'Mysuru', 'Shimoga', 'Davanagere', 'Tumakuru'],
  'Maharashtra': ['Solapur', 'Lasalgaon', 'Nashik', 'Pune', 'Nagpur', 'Vashi (Mumbai)', 'Sangli', 'Latur'],
  'Gujarat': ['Unjha', 'Rajkot', 'Gondal', 'Surat', 'Ahmedabad', 'Vadodara', 'Deesa'],
  'Rajasthan': ['Jodhpur', 'Jaipur', 'Kota', 'Bikaner', 'Sri Ganganagar', 'Nagaur'],
  'Madhya Pradesh': ['Mandsaur', 'Indore', 'Ujjain', 'Neemuch', 'Bhopal', 'Ratlam'],
  'Uttar Pradesh': ['Agra', 'Varanasi', 'Lucknow', 'Kanpur', 'Mathura', 'Bareilly'],
  'Punjab': ['Khanna', 'Ludhiana', 'Jalandhar', 'Amritsar', 'Bathinda'],
  'West Bengal': ['Kolkata', 'Siliguri', 'Burdwan', 'Hooghly'],
  'Delhi': ['Azadpur', 'Okhla', 'Shahadra'],
};

const CROPS = [
  { name: 'Pomegranate', icon: '🍎' },
  { name: 'Tomato',      icon: '🍅' },
  { name: 'Onion',       icon: '🧅' },
  { name: 'Potato',      icon: '🥔' },
  { name: 'Banana',      icon: '🍌' },
  { name: 'Mango',       icon: '🥭' },
  { name: 'Apple',       icon: '🍏' },
  { name: 'Chilli',      icon: '🌶️' },
  { name: 'Turmeric',    icon: '🟡' },
  { name: 'Cotton',      icon: '🌿' },
];

const QUICK_PROMPTS = [
  { label: 'Best time to sell?', icon: '📅' },
  { label: 'Current spot price', icon: '💰' },
  { label: 'Cold storage tips', icon: '❄️' },
  { label: 'Disease alert', icon: '⚠️' },
  { label: 'Arbitrage profit?', icon: '📈' },
  { label: 'ICAR protocol', icon: '🔬' },
];

export default function AdvisorChat({ externalQuery, onClearExternalQuery, onOpenPriceExplorer }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [selectedState, setSelectedState] = useState('Maharashtra');
  const [selectedCity, setSelectedCity] = useState('Solapur');
  const [selectedCrop, setSelectedCrop] = useState('Pomegranate');
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const recognitionRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [conversation]);

  useEffect(() => {
    if (externalQuery) {
      handleSend(null, externalQuery);
      if (onClearExternalQuery) onClearExternalQuery();
    }
  }, [externalQuery]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      const r = new SR();
      r.lang = 'en-IN'; r.continuous = false;
      r.onresult = (e) => { setQuery(e.results[0][0].transcript); setIsListening(false); };
      r.onerror = () => setIsListening(false);
      r.onend = () => setIsListening(false);
      recognitionRef.current = r;
    }
  }, []);

  const cropData = CROP_INTELLIGENCE[selectedCrop] || CROP_INTELLIGENCE.Pomegranate;
  const cropIcon = CROPS.find(c => c.name === selectedCrop)?.icon || '🌾';
  const availableCities = STATE_MANDI_MAP[selectedState] || [];

  const handleStateChange = (s) => {
    setSelectedState(s);
    const cities = STATE_MANDI_MAP[s] || [];
    if (cities.length) setSelectedCity(cities[0]);
  };

  const toggleVoice = () => {
    if (!recognitionRef.current) return;
    if (isListening) { recognitionRef.current.stop(); setIsListening(false); }
    else { try { recognitionRef.current.start(); setIsListening(true); } catch (_) {} }
  };

  const speakText = (text, idx) => {
    if (!('speechSynthesis' in window)) return;
    if (speakingIdx === idx) { window.speechSynthesis.cancel(); setSpeakingIdx(null); return; }
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text.replace(/[#*`_~]/g, ''));
    utt.lang = 'en-IN'; utt.rate = 0.95;
    utt.onend = () => setSpeakingIdx(null);
    setSpeakingIdx(idx);
    window.speechSynthesis.speak(utt);
  };

  const copyText = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleSend = async (e, customQuery) => {
    if (e) e.preventDefault();
    const q = customQuery || query;
    if (!q.trim() || loading || isStreaming) return;

    setQuery('');
    setConversation(prev => [...prev, { role: 'user', text: q }]);
    setLoading(true);

    if (isGeminiAvailable()) {
      try {
        setIsStreaming(true);
        setLoading(false);
        setConversation(prev => [...prev, { role: 'streaming', text: '' }]);
        const { fullText, cropName } = await runGeminiRAG(q, (chunk) => {
          setConversation(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === 'streaming') updated[updated.length - 1] = { role: 'streaming', text: last.text + chunk };
            return updated;
          });
        }, selectedCrop);
        const fallback = synthesizeClientAdvisory(q, selectedCrop);
        setConversation(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', text: fullText, data: { ...fallback, answer: fullText, detected_crop: cropName }, source: 'gemini' };
          return updated;
        });
        setIsStreaming(false);
        return;
      } catch (err) {
        setConversation(prev => prev.filter(m => m.role !== 'streaming'));
        setIsStreaming(false);
      }
    }

    try { await axios.post('/api/query/', { query: q }); } catch (_) {}
    const fallback = synthesizeClientAdvisory(q, selectedCrop);
    setConversation(prev => [...prev, { role: 'assistant', text: fallback.answer, data: fallback, source: 'template' }]);
    setLoading(false);
  };

  const handleQuickPrompt = (label) => {
    const cleanCity = selectedCity.replace(/\s*\(.*?\)\s*/g, '').trim();
    handleSend(null, `${label} for ${selectedCrop} in ${cleanCity}, ${selectedState}`);
  };

  return (
    <div className="flex h-[calc(100vh-130px)] gap-0 rounded-2xl overflow-hidden border border-slate-200 shadow-lg bg-white">

      {/* ── SIDEBAR ── */}
      <aside className={`${sidebarOpen ? 'w-68' : 'w-0'} transition-all duration-300 overflow-hidden flex-shrink-0 border-r border-slate-100 bg-gray-50 flex flex-col`} style={{ width: sidebarOpen ? '272px' : '0' }}>
        <div className="p-4 flex-1 overflow-y-auto space-y-5 min-w-[272px]">

          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">Crop</p>
            <div className="grid grid-cols-2 gap-1.5">
              {CROPS.map(c => (
                <button
                  key={c.name}
                  onClick={() => setSelectedCrop(c.name)}
                  className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all text-left ${
                    selectedCrop === c.name
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-emerald-300 hover:text-emerald-700'
                  }`}
                >
                  <span className="text-sm">{c.icon}</span>
                  <span className="truncate">{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">State</p>
              <select value={selectedState} onChange={e => handleStateChange(e.target.value)}
                className="w-full text-sm rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer">
                {Object.keys(STATE_MANDI_MAP).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Mandi</p>
              <select value={selectedCity} onChange={e => setSelectedCity(e.target.value)}
                className="w-full text-sm rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer">
                {availableCities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {cropData && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{cropIcon}</span>
                <div>
                  <p className="text-sm font-bold text-slate-800">{selectedCrop}</p>
                  <p className="text-[10px] text-emerald-700 font-semibold">{cropData.decision} · {cropData.gain_pct}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-white rounded-lg p-2 border border-emerald-100 text-center">
                  <p className="text-slate-400 text-[10px]">Spot Price</p>
                  <p className="font-bold text-slate-800 text-xs leading-tight">{cropData.spot_price}</p>
                </div>
                <div className="bg-white rounded-lg p-2 border border-emerald-100 text-center">
                  <p className="text-slate-400 text-[10px]">Peak Price</p>
                  <p className="font-bold text-emerald-700 text-xs leading-tight">{cropData.peak_price}</p>
                </div>
              </div>
              <button
                onClick={() => onOpenPriceExplorer && onOpenPriceExplorer(selectedCrop)}
                className="w-full flex items-center justify-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 py-1 rounded-lg hover:bg-emerald-100 transition-colors"
              >
                <TrendingUp className="w-3 h-3" /> ROI Chart <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── CHAT PANEL ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400">
              <ChevronDown className={`w-4 h-4 transition-transform ${sidebarOpen ? 'rotate-90' : '-rotate-90'}`} />
            </button>
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Kisan AI Advisor</p>
              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                {cropIcon} {selectedCrop} · {selectedCity}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isGeminiAvailable() && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 font-semibold">✨ Gemini AI</span>
            )}
            <button onClick={() => setConversation([])}
              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600" title="Clear chat">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 bg-white">

          {conversation.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-10 space-y-5">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 border-2 border-emerald-100 flex items-center justify-center">
                <span className="text-3xl">{cropIcon}</span>
              </div>
              <div>
                <p className="text-lg font-bold text-slate-800">Ask about {selectedCrop}</p>
                <p className="text-sm text-slate-400 mt-1">Prices · Storage · Disease · Timing · Arbitrage</p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center max-w-sm">
                {QUICK_PROMPTS.map(p => (
                  <button key={p.label} onClick={() => handleQuickPrompt(p.label)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 transition-all shadow-sm">
                    {p.icon} {p.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-300">English · Telugu · Hindi · Tamil · Kannada</p>
            </div>
          )}

          {conversation.map((msg, idx) => {
            if (msg.role === 'user') return (
              <div key={idx} className="flex justify-end">
                <div className="flex items-end gap-2 max-w-[75%]">
                  <div className="px-4 py-2.5 rounded-2xl rounded-br-sm bg-emerald-600 text-white text-sm leading-relaxed shadow-sm">
                    {msg.text}
                  </div>
                  <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                </div>
              </div>
            );

            if (msg.role === 'streaming') return (
              <div key={idx} className="flex justify-start">
                <div className="flex items-start gap-3 max-w-[85%]">
                  <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center shrink-0 mt-1">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 text-sm text-slate-800 leading-7 pt-1">
                    <ReactMarkdown
                      components={{
                        p: ({children}) => <p className="mb-3 last:mb-0">{children}</p>,
                        strong: ({children}) => <strong className="font-semibold text-slate-900">{children}</strong>,
                        ul: ({children}) => <ul className="mb-3 space-y-1 pl-1">{children}</ul>,
                        ol: ({children}) => <ol className="mb-3 space-y-1 pl-1 list-decimal list-inside">{children}</ol>,
                        li: ({children}) => <li className="flex gap-2 text-slate-700"><span className="text-emerald-500 mt-1 shrink-0">•</span><span>{children}</span></li>,
                        h1: ({children}) => <h1 className="text-base font-bold text-slate-900 mb-2 mt-3">{children}</h1>,
                        h2: ({children}) => <h2 className="text-sm font-bold text-slate-900 mb-2 mt-3">{children}</h2>,
                        h3: ({children}) => <h3 className="text-sm font-semibold text-slate-800 mb-1 mt-2">{children}</h3>,
                        code: ({children}) => <code className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>,
                        blockquote: ({children}) => <blockquote className="border-l-4 border-emerald-400 pl-3 text-slate-600 italic my-2">{children}</blockquote>,
                      }}
                    >
                      {msg.text || ''}
                    </ReactMarkdown>
                    <span className="inline-block w-1.5 h-4 bg-indigo-400 rounded-sm ml-0.5 animate-pulse align-middle" />
                  </div>
                </div>
              </div>
            );

            const isGeminiMsg = msg.source === 'gemini';
            return (
              <div key={idx} className="flex justify-start">
                <div className="flex items-start gap-3 max-w-[85%]">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${isGeminiMsg ? 'bg-indigo-500' : 'bg-emerald-600'}`}>
                    {isGeminiMsg ? <Sparkles className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
                  </div>
                  <div className="flex-1 space-y-3">
                    {/* Markdown body — ChatGPT prose style */}
                    <div className="text-sm text-slate-800 leading-7">
                      <ReactMarkdown
                        components={{
                          p: ({children}) => <p className="mb-3 last:mb-0">{children}</p>,
                          strong: ({children}) => <strong className="font-semibold text-slate-900">{children}</strong>,
                          em: ({children}) => <em className="italic text-slate-600">{children}</em>,
                          ul: ({children}) => <ul className="mb-3 space-y-1.5 pl-1">{children}</ul>,
                          ol: ({children}) => <ol className="mb-3 space-y-1.5 pl-1 list-decimal list-inside">{children}</ol>,
                          li: ({children}) => (
                            <li className="flex gap-2 text-slate-700 leading-relaxed">
                              <span className="text-emerald-500 shrink-0 mt-0.5 font-bold">•</span>
                              <span>{children}</span>
                            </li>
                          ),
                          h1: ({children}) => <h1 className="text-base font-bold text-slate-900 mb-2 mt-4 pb-1 border-b border-slate-100">{children}</h1>,
                          h2: ({children}) => <h2 className="text-sm font-bold text-slate-900 mb-2 mt-3">{children}</h2>,
                          h3: ({children}) => <h3 className="text-sm font-semibold text-emerald-700 mb-1 mt-2">{children}</h3>,
                          code: ({children}) => <code className="bg-slate-100 text-emerald-700 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>,
                          blockquote: ({children}) => (
                            <blockquote className="border-l-4 border-emerald-400 pl-4 text-slate-600 italic my-3 bg-emerald-50 py-2 rounded-r-lg">
                              {children}
                            </blockquote>
                          ),
                          hr: () => <hr className="my-3 border-slate-200" />,
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                    </div>

                    {/* APMC data row */}
                    {msg.data?.sql_executed?.records?.length > 0 && (
                      <div className="px-3 py-2.5 rounded-xl bg-emerald-50 border border-emerald-100 space-y-1.5">
                        <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                          <Store className="w-3 h-3" /> Live APMC Prices
                        </p>
                        {msg.data.sql_executed.records.slice(0, 3).map((r, ri) => (
                          <div key={ri} className="flex items-center justify-between text-xs">
                            <span className="text-slate-500 flex items-center gap-1">
                              <MapPin className="w-2.5 h-2.5 text-emerald-400" />{r.market}, {r.state}
                            </span>
                            <span className="font-bold text-slate-800">₹{r.modal_price?.toLocaleString('en-IN')}/Qtl</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Action row */}
                    <div className="flex items-center gap-2">
                      {isGeminiMsg && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-500 border border-indigo-100 font-semibold">✨ Gemini</span>
                      )}
                      <button onClick={() => copyText(msg.text, idx)} className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors" title="Copy">
                        {copiedIdx === idx ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => speakText(msg.text, idx)} className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors" title="Listen">
                        {speakingIdx === idx ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex justify-start">
              <div className="flex items-end gap-2">
                <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-slate-50 border border-slate-200">
                  <div className="flex gap-1 items-center">
                    {[0, 150, 300].map(d => (
                      <span key={d} className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Quick chips bar */}
        {conversation.length > 0 && (
          <div className="px-4 py-2 border-t border-slate-100 flex gap-2 overflow-x-auto bg-white">
            {QUICK_PROMPTS.slice(0, 5).map(p => (
              <button key={p.label} onClick={() => handleQuickPrompt(p.label)}
                className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-50 border border-slate-200 text-slate-500 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 transition-all">
                {p.icon} {p.label}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="px-4 py-3 border-t border-slate-100 bg-white">
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <button type="button" onClick={toggleVoice}
              className={`p-2.5 rounded-xl transition-all shrink-0 ${isListening ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <input
              type="text" value={query} onChange={e => setQuery(e.target.value)}
              placeholder={`Ask about ${selectedCrop} prices, storage, disease…`}
              disabled={loading || isStreaming}
              className="flex-1 text-sm px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white transition-all disabled:opacity-50"
            />
            <button type="submit" disabled={!query.trim() || loading || isStreaming}
              className="p-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all disabled:opacity-40 shrink-0 shadow-sm">
              {loading || isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
          <p className="text-center text-[10px] text-slate-300 mt-1.5">
            APMC Agmarknet · ICAR Research · {isGeminiAvailable() ? 'Gemini 1.5 Flash' : 'Onboard Intelligence'}
          </p>
        </div>
      </div>
    </div>
  );
}
