import React, { useState, useEffect } from 'react';
import { analyticsApi } from '../api/analyticsApi';
import { CheckCircle2, AlertTriangle, XCircle, Shield, Rocket, RefreshCw, Cpu, Server, Database } from 'lucide-react';

export const PilotReadinessPanel = () => {
  const [readinessData, setReadinessData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReadiness = async () => {
    try {
      setLoading(true);
      const res = await analyticsApi.getPilotReadiness();
      if (res.success) setReadinessData(res.data);
    } catch (err) {
      console.error('[PilotReadinessPanel] Error:', err);
      setError('Failed to run pilot readiness diagnostic check.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReadiness();
  }, []);

  if (loading) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500 font-medium">Executing 10-point system pilot readiness audit...</p>
      </div>
    );
  }

  if (error || !readinessData) {
    return (
      <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl text-rose-700 text-xs flex items-center justify-between">
        <span>{error || 'Pilot readiness diagnostics unavailable.'}</span>
        <button onClick={fetchReadiness} className="px-3 py-1 bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-700">
          Retry Audit
        </button>
      </div>
    );
  }

  const { readinessScore, status, totalChecks, passedChecks, checks, auditTimestamp } = readinessData;

  return (
    <div className="space-y-6">
      {/* Pilot Score Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 text-white p-6 rounded-2xl shadow-lg border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2">
            <Rocket className="w-6 h-6 text-amber-300 animate-bounce" />
            <h2 className="font-black text-xl text-white">CampusMove AI Pilot Readiness Audit</h2>
          </div>
          <p className="text-xs text-purple-200/90 leading-relaxed">
            Automated 10-point system diagnostic audit verifying application-level database persistence, JWT authentication, real-time WebSockets, ML prediction services, and operational dispatch APIs.
          </p>
          <div className="text-[11px] text-slate-400">
            Last Audit Run: <strong>{new Date(auditTimestamp).toLocaleTimeString()}</strong> ({passedChecks}/{totalChecks} System Checks Passed)
          </div>
        </div>

        {/* Big Score Meter */}
        <div className="bg-white/10 p-5 rounded-2xl border border-white/15 text-center min-w-[220px] shadow-inner">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-300">
            Pilot Readiness Score
          </span>
          <div className="text-4xl font-black mt-1 mb-1 text-amber-300">
            {readinessScore}%
          </div>
          <span
            className={`inline-block text-[10px] font-black px-3 py-0.5 rounded-full uppercase ${
              status === 'READY'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}
          >
            {status === 'READY' ? 'PRODUCTION READY' : 'ACTION REQUIRED'}
          </span>
          <button
            onClick={fetchReadiness}
            className="mt-3 w-full py-1.5 px-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Re-run Diagnostics
          </button>
        </div>
      </div>

      {/* 10-Point Diagnostic Checks Roster */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-600" /> Subsystem Diagnostics Roster
            </h3>
            <p className="text-xs text-slate-500">Validation of core technical stack components for Phase 1 to Phase 8</p>
          </div>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            {passedChecks} / {totalChecks} READY
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {checks.map((c, i) => (
            <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50/80 transition">
              <div className="flex items-center gap-3">
                {c.status === 'READY' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                ) : c.status === 'WARNING' ? (
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                )}
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">{c.name}</h4>
                  <p className="text-xs text-slate-500">{c.details}</p>
                </div>
              </div>

              <span
                className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${
                  c.status === 'READY'
                    ? 'bg-emerald-100 text-emerald-800'
                    : c.status === 'WARNING'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {c.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
