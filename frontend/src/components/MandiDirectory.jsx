import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  Building2, MapPin, Search, Filter, TrendingUp, TrendingDown, 
  ExternalLink, Calendar, RefreshCw, CheckCircle2, ChevronRight,
  Store, Globe, Sparkles, PhoneCall, ShieldCheck, MessageSquareQuote,
  ChevronLeft
} from 'lucide-react';

const STATES_LIST = [
  'All States', 'Andhra Pradesh', 'Telangana', 'Tamil Nadu', 
  'Karnataka', 'Maharashtra', 'Gujarat', 'Rajasthan', 
  'Madhya Pradesh', 'Uttar Pradesh', 'Punjab', 'Himachal Pradesh', 
  'Kerala', 'West Bengal', 'Bihar', 'Delhi'
];

const COMMODITIES_LIST = [
  'All Commodities', 'Banana', 'Tomato', 'Onion', 'Pomegranate', 'Mango', 
  'Green Chilli', 'Turmeric', 'Cotton', 'Groundnut', 'Coconut', 
  'Lemon', 'Potato', 'Apple', 'Grapes', 'Cumin (Jeera)', 'Paddy(Dhan)', 'Wheat'
];

const ITEMS_PER_PAGE = 12;

export default function MandiDirectory({ onAskInChat }) {
  const [selectedState, setSelectedState] = useState('All States');
  const [selectedCommodity, setSelectedCommodity] = useState('All Commodities');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [allRecords, setAllRecords] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchDirectoryPrices();
  }, [selectedCommodity]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedState, selectedCommodity, searchQuery]);

  const fetchDirectoryPrices = async () => {
    setLoading(true);
    try {
      const comm = selectedCommodity === 'All Commodities' ? 'Tomato' : selectedCommodity;
      const resp = await axios.get(`/api/prices/trends/?commodity=${encodeURIComponent(comm)}&days=30`);
      setAllRecords(resp.data.records || []);
    } catch (err) {
      console.error('Failed to load mandi records:', err);
    } finally {
      setLoading(false);
    }
  };

  const marketCards = useMemo(() => {
    const marketMap = {};
    allRecords.forEach(r => {
      const key = `${r.market}-${r.state}`;
      if (!marketMap[key] || new Date(r.arrival_date) > new Date(marketMap[key].arrival_date)) {
        marketMap[key] = r;
      }
    });

    let list = Object.values(marketMap);

    if (selectedState !== 'All States') {
      list = list.filter(m => m.state?.toLowerCase() === selectedState.toLowerCase());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(m => 
        m.market?.toLowerCase().includes(q) || 
        m.district?.toLowerCase().includes(q) || 
        m.state?.toLowerCase().includes(q) ||
        m.commodity?.toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => b.modal_price - a.modal_price);
  }, [allRecords, selectedState, searchQuery]);

  const totalPages = Math.ceil(marketCards.length / ITEMS_PER_PAGE) || 1;
  const paginatedCards = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return marketCards.slice(start, start + ITEMS_PER_PAGE);
  }, [marketCards, currentPage]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-6 sm:p-8 shadow-sm text-white">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-semibold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            Official APMC & e-NAM Verified Directory
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            All India Mandi Network & Spot Rates Directory
          </h1>
          <p className="text-emerald-50 text-sm leading-relaxed">
            Real-time APMC market directory covering <strong className="text-white underline decoration-emerald-300">150+ terminal & regional mandis</strong> across Andhra Pradesh, Telangana, Tamil Nadu, Karnataka, Maharashtra, and North India.
          </p>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Mandi, City, or District..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* State Dropdown */}
          <div>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors cursor-pointer"
            >
              {STATES_LIST.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Commodity Dropdown */}
          <div>
            <select
              value={selectedCommodity}
              onChange={(e) => setSelectedCommodity(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors cursor-pointer"
            >
              {COMMODITIES_LIST.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* State Quick Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin text-xs">
          <span className="text-slate-500 font-medium whitespace-nowrap pl-1">Popular States:</span>
          {['Andhra Pradesh', 'Telangana', 'Tamil Nadu', 'Karnataka', 'Maharashtra', 'Gujarat', 'Uttar Pradesh', 'Madhya Pradesh'].map(st => (
            <button
              key={st}
              onClick={() => setSelectedState(st)}
              className={`px-3 py-1 rounded-xl whitespace-nowrap font-medium transition-all ${
                selectedState === st 
                  ? 'bg-emerald-600 text-white font-bold shadow-xs' 
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
          {selectedState !== 'All States' && (
            <button
              onClick={() => setSelectedState('All States')}
              className="text-xs text-rose-600 hover:underline px-2 py-1 font-semibold"
            >
              Clear Filter
            </button>
          )}
        </div>
      </div>

      {/* Active Results Summary & Pagination Header */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 px-1 gap-2">
        <div>
          Showing <strong className="text-emerald-700">{paginatedCards.length} of {marketCards.length} APMC Mandis</strong> for <strong className="text-slate-900">{selectedCommodity === 'All Commodities' ? 'Tomato' : selectedCommodity}</strong> in <strong className="text-slate-900">{selectedState}</strong>
        </div>
        
        {/* Pagination Controls Top */}
        {totalPages > 1 && (
          <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-xl border border-slate-200 shadow-xs">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded-lg hover:bg-slate-100 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-bold text-slate-700">Page {currentPage} of {totalPages}</span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded-lg hover:bg-slate-100 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        <button
          onClick={fetchDirectoryPrices}
          className="flex items-center gap-1 text-slate-600 hover:text-emerald-700 font-medium transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          <span>Refresh Rates</span>
        </button>
      </div>

      {/* Market Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-44 rounded-3xl bg-white border border-slate-200 animate-pulse p-4 space-y-3">
              <div className="h-4 bg-slate-100 rounded w-2/3"></div>
              <div className="h-3 bg-slate-100 rounded w-1/2"></div>
              <div className="h-8 bg-slate-100 rounded mt-4"></div>
            </div>
          ))}
        </div>
      ) : paginatedCards.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-3xl space-y-2">
          <Store className="w-10 h-10 text-slate-400 mx-auto" />
          <div className="text-sm font-bold text-slate-700">No APMC Mandis Found for Selected Filters</div>
          <p className="text-xs text-slate-500">Try selecting 'All States' or clearing your search term.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {paginatedCards.map((m, idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-200 hover:border-emerald-400 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group space-y-3"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                      {m.market} APMC
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">{m.district ? `${m.district}, ` : ''}{m.state}</span>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {m.commodity}
                  </span>
                </div>

                {/* Price Display */}
                <div className="pt-3 border-t border-slate-100">
                  <div className="text-[11px] text-slate-500 font-medium">Modal Spot Rate:</div>
                  <div className="flex items-baseline justify-between mt-0.5">
                    <span className="text-xl font-black text-slate-900 font-mono">
                      ₹{((m.modal_price || 0) * 10).toLocaleString('en-IN')}
                      <span className="text-xs font-normal text-slate-500 font-sans"> / Ton</span>
                    </span>
                    <span className="text-xs text-emerald-700 font-bold font-mono bg-emerald-50 px-2 py-0.5 rounded-md">
                      ₹{Math.round(m.modal_price / 100)}/kg
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono mt-1.5">
                    <span>Min: ₹{((m.min_price || 0) * 10).toLocaleString('en-IN')} / Ton</span>
                    <span>Max: ₹{((m.max_price || 0) * 10).toLocaleString('en-IN')} / Ton</span>
                  </div>
                </div>
              </div>

              {/* 1-Click Ask in AI Chat Button */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <button
                  onClick={() => onAskInChat && onAskInChat(m.market, m.commodity, m.state)}
                  className="w-full py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-emerald-200 shadow-xs"
                >
                  <MessageSquareQuote className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Ask AI Advisor about {m.market}</span>
                </button>
                
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {m.arrival_date}
                  </span>
                  <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
                    Verified <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls Bottom */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>
          
          <div className="flex items-center gap-1">
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i + 1}
                onClick={() => setCurrentPage(i + 1)}
                className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${
                  currentPage === i + 1
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
