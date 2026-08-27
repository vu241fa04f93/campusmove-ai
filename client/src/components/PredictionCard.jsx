import React from 'react';
import { Sparkles, Clock, AlertTriangle, ShieldCheck, Zap, Activity } from 'lucide-react';

export const PredictionCard = ({
  baseETA = 0,
  predictedETA = 0,
  adjustmentMinutes = 0,
  confidence = 92,
  stopName = 'Next Stop',
  factors = {},
  predictionSource = 'ml_model_v1',
  compact = false,
}) => {
  const isDelayed = adjustmentMinutes > 0.5;
  const isEarly = adjustmentMinutes < -0.5;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-baseline gap-1">
          <span className="text-base font-extrabold text-slate-900">{predictedETA} min</span>
          {adjustmentMinutes !== 0 && (
            <span
              className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                isDelayed ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {adjustmentMinutes > 0 ? `+${adjustmentMinutes}` : adjustmentMinutes}m ML
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/50 border border-indigo-100 rounded-2xl p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="p-1.5 bg-purple-600 text-white rounded-lg shadow-sm shadow-purple-600/30">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">ML Refined ETA</h4>
            <p className="text-[10px] text-slate-500">Target: {stopName}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-purple-100/80 text-purple-800 border border-purple-200 px-2.5 py-1 rounded-full text-[10px] font-bold">
          <ShieldCheck className="w-3 h-3 text-purple-600" />
          <span>{confidence}% Confidence</span>
        </div>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-3 gap-2 bg-white/90 border border-slate-200/80 rounded-xl p-2.5 text-center">
        <div className="border-r border-slate-100 pr-1">
          <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold">Base ETA</span>
          <span className="text-sm font-bold text-slate-600">{baseETA} min</span>
        </div>

        <div className="border-r border-slate-100 pr-1">
          <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold">ML Adjustment</span>
          <span
            className={`text-sm font-extrabold ${
              isDelayed ? 'text-amber-600' : isEarly ? 'text-emerald-600' : 'text-slate-600'
            }`}
          >
            {adjustmentMinutes > 0 ? `+${adjustmentMinutes}m` : adjustmentMinutes < 0 ? `${adjustmentMinutes}m` : '0m'}
          </span>
        </div>

        <div>
          <span className="block text-[9px] uppercase tracking-wider text-purple-600 font-bold">Refined ETA</span>
          <span className="text-base font-extrabold text-purple-900">{predictedETA} min</span>
        </div>
      </div>

      {/* Factors / Context */}
      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-600 pt-0.5">
        <span className="text-slate-400 font-medium flex items-center gap-1">
          <Activity className="w-3 h-3 text-slate-400" /> Key ML Factors:
        </span>
        {factors.isRushHour && (
          <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-md font-semibold">
            Campus Rush (+boarding dwell)
          </span>
        )}
        {factors.isDelayed && (
          <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-md font-semibold">
            Delay Buffer Active
          </span>
        )}
        {!factors.isRushHour && !factors.isDelayed && (
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md font-semibold">
            Clear Road Flow
          </span>
        )}
        <span className="text-slate-400 font-mono text-[9px]">[{predictionSource}]</span>
      </div>
    </div>
  );
};
