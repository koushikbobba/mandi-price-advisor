import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BookOpen, Upload, Plus, Search, Tag, Calendar, Building, Layers } from 'lucide-react';

export default function AdvisoryLibrary() {
  const [advisories, setAdvisories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCrop, setSelectedCrop] = useState('All');
  const [showUploadModal, setShowUploadModal] = useState(false);
  
  // Upload form state
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('ICAR / State Agri Dept');
  const [crop, setCrop] = useState('Wheat');
  const [category, setCategory] = useState('storage');
  const [docText, setDocText] = useState('');
  const [uploading, setUploading] = useState(false);

  const fetchAdvisories = async () => {
    setLoading(true);
    try {
      const resp = await axios.get('/api/advisories/');
      setAdvisories(resp.data.results || resp.data);
    } catch (err) {
      console.error('Error fetching advisories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdvisories();
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!title.trim() || !docText.trim()) return;

    setUploading(true);
    try {
      await axios.post('/api/advisories/upload/', {
        title,
        source,
        crop,
        category,
        document_text: docText
      });
      setShowUploadModal(false);
      setTitle('');
      setDocText('');
      fetchAdvisories();
    } catch (err) {
      alert('Upload failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploading(false);
    }
  };

  const crops = ['All', ...new Set(advisories.map(a => a.crop))];

  const filteredAdvisories = advisories.filter(a => {
    const matchSearch = (a.title + a.source + a.crop + a.document_text).toLowerCase().includes(search.toLowerCase());
    const matchCrop = selectedCrop === 'All' || a.crop === selectedCrop;
    return matchSearch && matchCrop;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-emerald-600" />
            <span>ICAR & Agronomic Advisory Knowledge Base</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Indexed guides chunked and verified across 14 ICAR institutes</p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Ingest New Advisory</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search advisories by keyword (spoilage, curing, MSP, export)..."
            className="w-full bg-white border border-slate-300 rounded-2xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-xs"
          />
        </div>

        <div className="flex items-center space-x-1.5 overflow-x-auto py-1">
          {crops.map(c => (
            <button
              key={c}
              onClick={() => setSelectedCrop(c)}
              className={`text-xs px-3.5 py-2 rounded-xl font-medium transition-all ${
                selectedCrop === c
                  ? 'bg-emerald-600 text-white font-bold shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Advisory Cards Grid */}
      {loading ? (
        <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
          <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mr-2"></div>
          Loading indexed advisories...
        </div>
      ) : filteredAdvisories.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-500 text-sm">
          No advisory documents matched your filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAdvisories.map((adv) => (
            <div key={adv.id} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3 hover:border-emerald-400 transition-all">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {adv.crop}
                    </span>
                    <span className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                      {adv.category}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-2">{adv.title}</h3>
                </div>
                <div className="flex items-center space-x-1 text-[11px] text-slate-600 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200 shrink-0">
                  <Layers className="w-3.5 h-3.5 text-sky-600" />
                  <span>{adv.chunks_count || 1} chunks</span>
                </div>
              </div>

              <div className="flex items-center space-x-4 text-xs text-slate-500">
                <span className="flex items-center space-x-1">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate max-w-[200px]">{adv.source}</span>
                </span>
                {adv.publication_date && (
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{adv.publication_date}</span>
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-700 line-clamp-4 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-200">
                {adv.document_text}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Upload className="w-5 h-5 text-emerald-600" />
              <span>Ingest Agronomic Advisory Document</span>
            </h3>

            <form onSubmit={handleUpload} className="space-y-3">
              <div>
                <label className="text-xs text-slate-600 font-medium block mb-1">Document Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Post-Harvest Cold Storage of Potato"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-600 font-medium block mb-1">Target Crop</label>
                  <input
                    type="text"
                    required
                    value={crop}
                    onChange={(e) => setCrop(e.target.value)}
                    placeholder="e.g., Onion, Wheat"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-600 font-medium block mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="storage">Storage Management</option>
                    <option value="harvesting">Harvesting & Best Time</option>
                    <option value="price_cycle">Price Trends & Cycles</option>
                    <option value="disease_pest">Spoilage & Disease</option>
                    <option value="export_msp">Govt Policy & MSP</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-600 font-medium block mb-1">Author / Source Organization</label>
                <input
                  type="text"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="e.g., ICAR-IIHR Bengaluru"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-600 font-medium block mb-1">Advisory Text Content</label>
                <textarea
                  rows="6"
                  required
                  value={docText}
                  onChange={(e) => setDocText(e.target.value)}
                  placeholder="Paste the guidance text, storage guidelines, moisture percentages, or marketing recommendations..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 shadow-xs"
                >
                  {uploading ? 'Embedding Vector Chunks...' : 'Ingest & Embed'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
