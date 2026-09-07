import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, Database, BookOpen, Layers, CheckCircle2, Clock, Globe } from 'lucide-react';

export default function MetricsViewer() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const resp = await axios.get('/api/stats/');
      setStats(resp.data);
    } catch (err) {
      console.error('Failed to load system stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !stats) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-400">
        <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        Loading observability metrics...
      </div>
    );
  }

  const categoryCounts = stats.category_distribution || {};
  const confidenceCounts = stats.confidence_distribution || {};

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            <span>Operational Observability & Audit Logs</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Tracking query routing decisions, confidence distribution, and latency</p>
        </div>

        <div className="flex items-center space-x-2 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1.5 rounded-xl">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Live Prometheus Metrics Scraping Active</span>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <span className="text-xs text-slate-400 font-medium">Total Queries Processed</span>
          <div className="text-2xl font-extrabold text-emerald-400 mt-1">
            {stats.total_queries_logged || 0}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Logged with full audit telemetry</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <span className="text-xs text-slate-400 font-medium">Active Mandi Prices</span>
          <div className="text-2xl font-extrabold text-cyan-400 mt-1">
            {stats.total_mandi_price_records?.toLocaleString() || 0}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Indexed Agmarknet rows</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <span className="text-xs text-slate-400 font-medium">Advisory Documents</span>
          <div className="text-2xl font-extrabold text-amber-400 mt-1">
            {stats.total_advisories || 0}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">ICAR & state department guides</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <span className="text-xs text-slate-400 font-medium">pgvector Chunks</span>
          <div className="text-2xl font-extrabold text-purple-400 mt-1">
            {stats.total_vector_chunks || 0}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">1536-dim semantic vectors</span>
        </div>
      </div>

      {/* Breakdown Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Category breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Query Routing Decisions</h3>
          <div className="space-y-2">
            {[
              { label: 'Hybrid (SQL + RAG)', count: categoryCounts['HYBRID'] || 0, color: 'bg-emerald-500', text: 'text-emerald-400' },
              { label: 'Structured (SQL Only)', count: categoryCounts['STRUCTURED'] || 0, color: 'bg-cyan-500', text: 'text-cyan-400' },
              { label: 'Unstructured (RAG Only)', count: categoryCounts['UNSTRUCTURED'] || 0, color: 'bg-amber-500', text: 'text-amber-400' },
            ].map((c, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-xs font-medium text-slate-300">{c.label}</span>
                <span className={`text-xs font-bold ${c.text}`}>{c.count} queries</span>
              </div>
            ))}
          </div>
        </div>

        {/* Confidence breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Decision Confidence Distribution</h3>
          <div className="space-y-2">
            {[
              { label: 'High Confidence', count: confidenceCounts['HIGH'] || 0, color: 'bg-emerald-500', text: 'text-emerald-400' },
              { label: 'Medium Confidence', count: confidenceCounts['MEDIUM'] || 0, color: 'bg-amber-500', text: 'text-amber-400' },
              { label: 'Low / Uncertain', count: confidenceCounts['LOW'] || 0, color: 'bg-rose-500', text: 'text-rose-400' },
            ].map((c, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-xs font-medium text-slate-300">{c.label}</span>
                <span className={`text-xs font-bold ${c.text}`}>{c.count} decisions</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Audit Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-slate-100 flex items-center justify-between">
          <span>Recent Query Audit Trail (Database Stored)</span>
          <span className="text-xs font-normal text-slate-400">Last 15 records</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3">Time</th>
                <th className="p-3">Query</th>
                <th className="p-3">Route</th>
                <th className="p-3">Confidence</th>
                <th className="p-3">Action</th>
                <th className="p-3">SQL / Chunks</th>
                <th className="p-3">Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {(stats.recent_audit_logs || []).map((log) => (
                <tr key={log.id} className="hover:bg-slate-950/50">
                  <td className="p-3 text-slate-400 whitespace-nowrap">{new Date(log.created_at).toLocaleTimeString()}</td>
                  <td className="p-3 font-medium text-slate-200 max-w-xs truncate">{log.query_text}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-emerald-400">
                      {log.routed_category}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      log.confidence_score === 'HIGH' ? 'text-emerald-400 bg-emerald-950/80' : 'text-amber-400 bg-amber-950/80'
                    }`}>
                      {log.confidence_score}
                    </span>
                  </td>
                  <td className="p-3 text-slate-300 font-semibold">{log.decision_action}</td>
                  <td className="p-3 text-slate-400">{log.sql_results_count} rows / {log.chunks_retrieved_count} chunks</td>
                  <td className="p-3 text-slate-400 whitespace-nowrap">{log.execution_time_ms} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
