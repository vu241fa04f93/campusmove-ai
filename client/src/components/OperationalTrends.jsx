import React, { useState, useEffect } from 'react';
import { analyticsApi } from '../api/analyticsApi';
import { TrendingUp, Calendar, Activity, MessageSquare, ShieldAlert, Clock, Info } from 'lucide-react';

export const OperationalTrends = () => {
  const [range, setRange] = useState('7d');
  const [trendsData, setTrendsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTrends = async (selectedRange) => {
    try {
      setLoading(true);
      const res = await analyticsApi.getTrends(selectedRange);
      if (res.success) setTrendsData(res.data);
    } catch (err) {
      console.error('[OperationalTrends] Error:', err);
      setError('Failed to compute operational trend metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrends(range);
  }, [range]);

  if (loading) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500 font-medium">Aggregating operational trend timelines ({range})...</p>
      </div>
    );
  }

  if (error || !trendsData) {
    return (
      <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl text-rose-700 text-xs flex items-center justify-between">
        <span>{error || 'Operational trends unavailable.'}</span>
        <button onClick={() => fetchTrends(range)} className="px-3 py-1 bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-700">
          Retry
        </button>
      </div>
    );
  }

  const { timeline } = trendsData;
  const maxTrips = Math.max(...timeline.map((t) => t.trips), 1);
  const maxUtilization = 100;

  return (
    <div className="space-y-6">
      {/* Time Horizon Selector */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-600" /> Longitudinal Operational Trends
          </h3>
          <p className="text-xs text-slate-500">
            Multi-day activity analysis for trip volume, student complaints, safety dispatches, fleet utilization, and delays
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setRange('7d')}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
              range === '7d' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            7 Days
          </button>
          <button
            onClick={() => setRange('30d')}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
              range === '30d' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            30 Days
          </button>
        </div>
      </div>

      {/* Visual Chart 1: Trip Activity & Utilization Trend */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" /> Daily Trip Throughput & Fleet Utilization
            </h4>
            <p className="text-xs text-slate-500">Trip volume bars overlaid with fleet utilization trend</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1 text-emerald-700">
              <span className="w-3 h-3 bg-emerald-500 rounded-sm" /> Trips Completed
            </span>
            <span className="flex items-center gap-1 text-purple-700">
              <span className="w-3 h-3 bg-purple-500 rounded-sm" /> Fleet Utilization %
            </span>
          </div>
        </div>

        {/* SVG/Tailwind Visual Bar/Line Chart */}
        <div className="pt-4 border-t border-slate-100">
          <div className="h-48 flex items-end gap-2 px-2">
            {timeline.map((item, idx) => {
              const tripHeightPct = Math.round((item.trips / maxTrips) * 100);
              const utilHeightPct = item.utilization;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                  {/* Tooltip on Hover */}
                  <div className="absolute -top-12 bg-slate-900 text-white text-[10px] p-2 rounded shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition z-10 whitespace-nowrap">
                    <p className="font-bold">{item.label} ({item.date})</p>
                    <p>Trips: {item.trips} | Util: {item.utilization}%</p>
                  </div>

                  <div className="w-full flex items-end justify-center gap-1 h-36 border-b border-slate-200 pb-1">
                    {/* Trips Bar */}
                    <div
                      className="w-1/2 bg-emerald-500/80 group-hover:bg-emerald-600 rounded-t transition-all"
                      style={{ height: `${tripHeightPct}%` }}
                    />
                    {/* Utilization Bar */}
                    <div
                      className="w-1/2 bg-purple-500/80 group-hover:bg-purple-600 rounded-t transition-all"
                      style={{ height: `${utilHeightPct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono truncate max-w-full">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Visual Chart 2: Complaints & Incident Safety Telemetry */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Complaints Trend */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-amber-500" /> Student Complaints Volume ({range})
            </h4>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
              Tickets Logged
            </span>
          </div>
          <div className="space-y-2">
            {timeline.slice(-7).map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <span className="w-12 font-mono text-[10px] text-slate-500">{item.label}</span>
                <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{ width: `${Math.min(100, item.complaints * 20)}%` }}
                  />
                </div>
                <span className="font-bold text-slate-800 text-[11px] w-6 text-right">{item.complaints}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Delays & Safety Incidents Trend */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-rose-500" /> Fleet Delays & Safety Dispatches ({range})
            </h4>
            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
              Events Flagged
            </span>
          </div>
          <div className="space-y-2">
            {timeline.slice(-7).map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <span className="w-12 font-mono text-[10px] text-slate-500">{item.label}</span>
                <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-500 rounded-full"
                    style={{ width: `${Math.min(100, item.delays * 18)}%` }}
                  />
                </div>
                <span className="font-bold text-slate-800 text-[11px] w-6 text-right">{item.delays}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-[11px] text-slate-500 flex items-center gap-2">
        <Info className="w-4 h-4 text-purple-600 shrink-0" />
        <span>
          Operational trend points anchor dynamically to historical database records, with derived baseline trends for sparse days clearly tagged.
        </span>
      </div>
    </div>
  );
};
