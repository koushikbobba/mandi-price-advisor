import React from 'react';
import { Sprout, MessageSquareQuote, TrendingUp, BookOpen, Store, RefreshCw, ShieldCheck } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, onTriggerSeed, isSeeding, onSelectTickerQuery }) {
  const TICKER_ITEMS = [
    { label: "Guntur (AP) Chilli", price: "₹41,700/Ton", change: "+2.5%", positive: true, query: "ఆంధ్రప్రదేశ్ గుంటూరు మిర్చి మార్కెట్ ధర మరియు అమ్మకపు సమయం ఏమిటి?" },
    { label: "Nizamabad (TG) Turmeric", price: "₹1,47,800/Ton", change: "+4.1%", positive: true, query: "నిజామాబాద్ మార్కెట్లో పసుపు ధరలు ఎలా ఉన్నాయి? ఎప్పుడు గరిష్ట ధర వస్తుంది?" },
    { label: "Trichy (TN) Banana", price: "₹18,800/Ton", change: "-1.4%", positive: false, query: "திருச்சி வாழை விற்பனை செய்ய சிறந்த மாதம் எது?" },
    { label: "Madanapalle (AP) Tomato", price: "₹21,600/Ton", change: "+6.8%", positive: true, query: "మదనపల్లె టమోటా ధరల పరిస్థితి ఏమిటి? ఇప్పుడు అమ్మాలా లేదా నిల్వ చేయాలా?" },
    { label: "Pollachi (TN) Coconut", price: "₹29,800/Ton", change: "+1.2%", positive: true, query: "பொள்ளாச்சி தேங்காய் சந்தை விலை நிலவரம் மற்றும் உச்ச விலை எப்போது?" },
    { label: "Lasalgaon (MH) Onion", price: "₹28,500/Ton", change: "+3.2%", positive: true, query: "What is the peak price month for Rabi Onion in Lasalgaon Maharashtra?" },
    { label: "Azadpur (Delhi) Apple", price: "₹92,000/Ton", change: "+5.0%", positive: true, query: "What is the CA cold storage release strategy for Apple in Azadpur Delhi?" },
    { label: "Unjha (GJ) Jeera", price: "₹2,54,000/Ton", change: "+2.8%", positive: true, query: "What is the Jeera cumin forecast in Unjha Gujarat?" }
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-xs">
      {/* Live Top Mandi Ticker (Clickable to inspect or query) */}
      <div className="bg-emerald-50/90 border-b border-emerald-100 px-4 py-1.5 text-[11px] overflow-x-auto whitespace-nowrap flex items-center gap-6 text-slate-700 font-medium scrollbar-none">
        <span className="flex items-center gap-1.5 text-emerald-800 font-extrabold uppercase tracking-wider shrink-0 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-300">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          Live APMC Feed:
        </span>
        {TICKER_ITEMS.map((item, idx) => (
          <button
            key={idx}
            onClick={() => onSelectTickerQuery && onSelectTickerQuery(item.query)}
            className="shrink-0 hover:bg-emerald-100/70 px-2 py-0.5 rounded-md transition-all group flex items-center gap-1 cursor-pointer"
            title="Click to query this mandi in AI Advisor"
          >
            <span>{item.positive ? '🟢' : '🟡'} {item.label}:</span>
            <strong className="text-slate-900 font-mono group-hover:text-emerald-700">{item.price}</strong>
            <span className={`font-semibold ${item.positive ? 'text-emerald-700' : 'text-amber-700'}`}>({item.change})</span>
          </button>
        ))}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('chat')}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-500/25 ring-2 ring-emerald-200">
              <Sprout className="w-6 h-6 text-white stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-black tracking-tight text-slate-900">
                  Mandi <span className="text-emerald-600">Price Advisor</span>
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 border border-slate-300 text-slate-700 hidden sm:inline-flex items-center gap-1">
                  👨‍🌾 Created by <strong className="text-emerald-700">Bobba Koushik</strong>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  National Agmarknet
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:flex items-center gap-1">
                <span>150+ APMC Mandis</span>
                <span>&bull;</span>
                <span className="text-emerald-700 font-semibold">AP, TG, TN, KA, MH, North India</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'chat'
                  ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <MessageSquareQuote className="w-4 h-4" />
              <span>AI Advisor</span>
            </button>

            <button
              onClick={() => setActiveTab('directory')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'directory'
                  ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>Mandi Directory</span>
            </button>

            <button
              onClick={() => setActiveTab('prices')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'prices'
                  ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Price Trends & ROI</span>
            </button>

            <button
              onClick={() => setActiveTab('advisories')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'advisories'
                  ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">ICAR Guides</span>
            </button>

            <button
              onClick={onTriggerSeed}
              disabled={isSeeding}
              title="Sync Latest Mandi Spot Rates"
              className="ml-1 sm:ml-2 flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-xs transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSeeding ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
              <span className="hidden md:inline">{isSeeding ? 'Syncing...' : 'Sync Mandis'}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
