import React, { useState, useEffect } from 'react';
import { StatCard } from './StatCard';
import { analyticsApi } from '../api/analyticsApi';
import {
  Bus,
  Activity,
  AlertCircle,
  ShieldAlert,
  MessageSquare,
  HeartPulse,
  Info,
  CheckCircle2,
  AlertTriangle,
  Layers,
} from 'lucide-react';

export const AdminOverview = () => {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const res = await analyticsApi.getOverview();
      if (res.success) setOverview(res.data);
    } catch (err) {
      console.error('[AdminOverview] Error:', err);
      setError('Failed to load system overview analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  if (loading) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500 font-medium">Calculating system intelligence metrics...</p>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl text-rose-700 text-xs flex items-center justify-between">
        <span>{error || 'Unable to display overview data.'}</span>
        <button onClick={fetchOverview} className="px-3 py-1 bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-700">
          Retry
        </button>
      </div>
    );
  }

  const { fleet, network, operations, support, fleetHealthScore, healthRating, healthFormulaExplanation } = overview;

  return (
    <div className="space-y-6">
      {/* Upper Executive Header & Fleet Health Score Gauge */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-lg border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2">
            <HeartPulse className="w-6 h-6 text-emerald-400 animate-pulse" />
            <h2 className="font-black text-xl text-white">System Executive Overview</h2>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Real-time operational metrics across campus transport corridors, active fleet telemetry, passenger feedback queues, and system health status.
          </p>
          <div className="pt-2 flex items-center gap-3 text-[11px] font-semibold text-slate-300">
            <span className="bg-white/10 px-2.5 py-1 rounded-full border border-white/10">
              Corridors: <strong>{network?.totalRoutes || 0}</strong>
            </span>
            <span className="bg-white/10 px-2.5 py-1 rounded-full border border-white/10">
              Stops: <strong>{network?.totalStops || 0}</strong>
            </span>
            <span className="bg-white/10 px-2.5 py-1 rounded-full border border-white/10">
              Registered Users: <strong>{support?.totalUsers || 0}</strong>
            </span>
          </div>
        </div>

        {/* Fleet Health Score Gauge */}
        <div className="bg-white/10 p-5 rounded-2xl border border-white/10 text-center min-w-[220px] shadow-inner">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-300">
            Overall Fleet Health
          </span>
          <div className="text-4xl font-black mt-1 mb-1 text-emerald-400">
            {fleetHealthScore}<span className="text-lg text-slate-300">/100</span>
          </div>
          <span
            className={`inline-block text-[11px] font-black px-3 py-0.5 rounded-full capitalize ${
              fleetHealthScore >= 90
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : fleetHealthScore >= 75
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                : fleetHealthScore >= 50
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            }`}
          >
            {healthRating} Status
          </span>
        </div>
      </div>

      {/* Overview Stat Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Fleet"
          value={`${fleet?.activeBuses || 0} / ${fleet?.totalBuses || 0}`}
          subtext={`${fleet?.delayedBuses || 0} Delayed, ${fleet?.inactiveBuses || 0} Off-Duty`}
          icon={Bus}
          color="purple"
        />
        <StatCard
          title="Active Trips"
          value={operations?.activeTrips || 0}
          subtext={`${operations?.completedTrips || 0} Trips Completed Today`}
          icon={Activity}
          color="emerald"
        />
        <StatCard
          title="Open Complaints"
          value={support?.openComplaints || 0}
          subtext="Student feedback tickets"
          icon={MessageSquare}
          color="amber"
        />
        <StatCard
          title="Unresolved Incidents"
          value={support?.unresolvedIncidents || 0}
          subtext="Safety & delay dispatches"
          icon={ShieldAlert}
          color="rose"
        />
      </div>

      {/* Health Score Calculation Rationale Callout */}
      <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-xs space-y-2">
        <div className="flex items-center gap-2 font-bold text-slate-800">
          <Info className="w-4 h-4 text-blue-600" />
          <span>Health Score EvaluationRoster</span>
        </div>
        <p className="text-slate-600 leading-relaxed">
          {healthFormulaExplanation}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1">
          <div className="bg-white p-2 rounded-xl border border-slate-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <div>
              <span className="font-bold text-slate-800">90 - 100</span>
              <p className="text-[10px] text-slate-500">Optimal Operation</p>
            </div>
          </div>
          <div className="bg-white p-2 rounded-xl border border-slate-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-500" />
            <div>
              <span className="font-bold text-slate-800">75 - 89</span>
              <p className="text-[10px] text-slate-500">Good Health</p>
            </div>
          </div>
          <div className="bg-white p-2 rounded-xl border border-slate-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <div>
              <span className="font-bold text-slate-800">50 - 74</span>
              <p className="text-[10px] text-slate-500">Needs Attention</p>
            </div>
          </div>
          <div className="bg-white p-2 rounded-xl border border-slate-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500" />
            <div>
              <span className="font-bold text-slate-800">&lt; 50</span>
              <p className="text-[10px] text-slate-500">Critical Action Required</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
