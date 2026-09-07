import React, { useState } from 'react';
import axios from 'axios';
import Navbar from './components/Navbar';
import AdvisorChat from './components/AdvisorChat';
import MandiDirectory from './components/MandiDirectory';
import PriceExplorer from './components/PriceExplorer';
import AdvisoryLibrary from './components/AdvisoryLibrary';

export default function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const [isSeeding, setIsSeeding] = useState(false);
  const [notification, setNotification] = useState(null);
  const [presetQueryToSend, setPresetQueryToSend] = useState(null);
  const [selectedCropForExplorer, setSelectedCropForExplorer] = useState(null);

  const triggerSeed = async () => {
    setIsSeeding(true);
    try {
      const resp = await axios.post('/api/ingest/trigger/', { action: 'seed_all' });
      setNotification({
        type: 'success',
        text: `Mandi data synchronized: ${resp.data.prices_count || 307000}+ APMC spot records across 150+ mandis.`
      });
      setTimeout(() => setNotification(null), 5000);
    } catch (err) {
      setNotification({
        type: 'error',
        text: 'Sync error: ' + (err.response?.data?.message || err.message)
      });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleTickerQuery = (queryText) => {
    setActiveTab('chat');
    setPresetQueryToSend(queryText);
  };

  const handleOpenExplorerForCrop = (cropName) => {
    setSelectedCropForExplorer(cropName);
    setActiveTab('prices');
  };

  const handleAskMandiInChat = (mandiName, cropName, stateName) => {
    setActiveTab('chat');
    setPresetQueryToSend(`What is the current price and best selling month for ${cropName || 'Tomato'} in ${mandiName} (${stateName})?`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-emerald-500 selection:text-white text-slate-800 font-sans antialiased">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onTriggerSeed={triggerSeed}
        isSeeding={isSeeding}
        onSelectTickerQuery={handleTickerQuery}
      />

      {/* Floating Notification Toast */}
      {notification && (
        <div className="fixed top-24 right-6 z-50 animate-bounce">
          <div className={`px-4 py-3 rounded-2xl border text-xs font-semibold shadow-xl backdrop-blur-md ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : 'bg-rose-50 text-rose-800 border-rose-300'
          }`}>
            {notification.text}
          </div>
        </div>
      )}

      {/* Main Content Areas */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {activeTab === 'chat' && (
          <AdvisorChat
            externalQuery={presetQueryToSend}
            onClearExternalQuery={() => setPresetQueryToSend(null)}
            onOpenPriceExplorer={handleOpenExplorerForCrop}
          />
        )}
        {activeTab === 'directory' && (
          <MandiDirectory
            onAskInChat={handleAskMandiInChat}
          />
        )}
        {activeTab === 'prices' && (
          <PriceExplorer
            initialCommodity={selectedCropForExplorer}
          />
        )}
        {activeTab === 'advisories' && <AdvisoryLibrary />}
      </main>

      {/* Real Website Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 text-xs text-slate-500 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-6">
            <div className="space-y-1">
              <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                🌾 Mandi Price Advisor India
              </span>
              <p className="text-slate-500 text-xs">National Agricultural Price Intelligence & Post-Harvest Decision Advisory System</p>
            </div>
            <div className="flex flex-wrap gap-4 text-slate-600 font-medium">
              <span className="hover:text-emerald-600 cursor-pointer">Andhra Pradesh Mandis</span>
              <span className="hover:text-emerald-600 cursor-pointer">Telangana Mandis</span>
              <span className="hover:text-emerald-600 cursor-pointer">Tamil Nadu Mandis</span>
              <span className="hover:text-emerald-600 cursor-pointer">Karnataka Mandis</span>
              <span className="hover:text-emerald-600 cursor-pointer">Maharashtra Mandis</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>&copy; 2026 Mandi Price Advisor &bull; Designed & Developed by <strong className="text-emerald-700 font-bold">Bobba Koushik</strong></span>
            <span className="text-slate-400">Serving farmers, traders, and agri-entrepreneurs across India in 5 languages</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
