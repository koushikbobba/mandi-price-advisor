import React from 'react';
import { Sprout, MessageSquareQuote, TrendingUp, BookOpen, Store, RefreshCw } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, onTriggerSeed, isSeeding, onSelectTickerQuery }) {
  const TICKER_ITEMS = [
    { label: "Guntur Chilli", price: "₹41,700/T", change: "+2.5%", positive: true, query: "What is the best time to sell Chilli in Guntur Andhra Pradesh?" },
    { label: "Nizamabad Turmeric", price: "₹1,47,800/T", change: "+4.1%", positive: true, query: "When is peak price for Turmeric in Nizamabad Telangana?" },
    { label: "Trichy Banana", price: "₹18,800/T", change: "-1.4%", positive: false, query: "Best month to sell Banana in Trichy Tamil Nadu?" },
    { label: "Madanapalle Tomato", price: "₹21,600/T", change: "+6.8%", positive: true, query: "Current Tomato price in Madanapalle — sell now or hold?" },
    { label: "Lasalgaon Onion", price: "₹28,500/T", change: "+3.2%", positive: true, query: "Peak price month for Rabi Onion in Lasalgaon Maharashtra?" },
    { label: "Azadpur Apple", price: "₹92,000/T", change: "+5.0%", positive: true, query: "Cold storage release strategy for Apple in Azadpur Delhi?" },
    { label: "Solapur Pomegranate", price: "₹78,000/T", change: "+2.2%", positive: true, query: "Best selling time for Pomegranate in Solapur Maharashtra?" },
  ];

  const TABS = [
    { id: 'chat',        label: 'AI Advisor',     icon: MessageSquareQuote },
    { id: 'directory',  label: 'Mandis',          icon: Store },
    { id: 'prices',     label: 'Price Trends',    icon: TrendingUp },
    { id: 'advisories', label: 'ICAR Guides',     icon: BookOpen },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      {/* Ticker */}
      <div className="bg-slate-800 px-4 py-1.5 text-[11px] overflow-x-auto whitespace-nowrap flex items-center gap-5 text-slate-300 font-medium scrollbar-none">
        <span className="flex items-center gap-1.5 text-emerald-400 font-bold uppercase tracking-wider shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
          Live APMC
        </span>
        {TICKER_ITEMS.map((item, idx) => (
          <button key={idx} onClick={() => onSelectTickerQuery && onSelectTickerQuery(item.query)}
            className="shrink-0 hover:text-white transition-colors flex items-center gap-1.5 group">
            <span className={`font-semibold ${item.positive ? 'text-emerald-400' : 'text-amber-400'}`}>
              {item.positive ? '▲' : '▼'}
            </span>
            <span className="text-slate-300 group-hover:text-white">{item.label}:</span>
            <span className="font-mono font-bold text-white">{item.price}</span>
            <span className={`text-[10px] ${item.positive ? 'text-emerald-400' : 'text-amber-400'}`}>{item.change}</span>
          </button>
        ))}
      </div>

      {/* Main nav */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">

          {/* Logo */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab('chat')}>
            <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center shadow-sm">
              <Sprout className="w-4.5 h-4.5 text-white" style={{ width: '18px', height: '18px' }} />
            </div>
            <div>
              <span className="text-base font-black tracking-tight text-slate-900">
                Mandi <span className="text-emerald-600">Price Advisor</span>
              </span>
              <p className="text-[10px] text-slate-400 leading-none hidden sm:block">150+ APMC · AP · TG · TN · MH · KA</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === id
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}

            <button
              onClick={onTriggerSeed}
              disabled={isSeeding}
              className="ml-1 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSeeding ? 'animate-spin text-emerald-600' : ''}`} />
              <span className="hidden md:inline">{isSeeding ? 'Syncing…' : 'Sync'}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
