import React from 'react';
import { Users, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export const CrowdIndicator = ({
  crowdLevel = 'LOW',
  occupancyPercentage = 0,
  estimatedPassengers = 0,
  capacity = 40,
  trend = 'stable',
  confidence = 90,
  compact = false,
  showLabel = true,
}) => {
  const getCrowdColor = () => {
    switch (crowdLevel) {
      case 'FULL':
        return {
          bg: 'bg-rose-500',
          text: 'text-rose-700',
          badgeBg: 'bg-rose-100 border-rose-200 text-rose-800',
          barGradient: 'from-rose-500 to-red-600',
          label: 'Near Full / Standing Only',
        };
      case 'HIGH':
        return {
          bg: 'bg-amber-500',
          text: 'text-amber-700',
          badgeBg: 'bg-amber-100 border-amber-200 text-amber-800',
          barGradient: 'from-amber-400 to-orange-500',
          label: 'High Crowd / Limited Seats',
        };
      case 'MODERATE':
        return {
          bg: 'bg-blue-500',
          text: 'text-blue-700',
          badgeBg: 'bg-blue-100 border-blue-200 text-blue-800',
          barGradient: 'from-blue-400 to-indigo-500',
          label: 'Moderate Load / Seats Open',
        };
      case 'LOW':
      default:
        return {
          bg: 'bg-emerald-500',
          text: 'text-emerald-700',
          badgeBg: 'bg-emerald-100 border-emerald-200 text-emerald-800',
          barGradient: 'from-emerald-400 to-teal-500',
          label: 'Low Crowd / Plentiful Seats',
        };
    }
  };

  const style = getCrowdColor();

  if (compact) {
    return (
      <div className="flex items-center gap-1.5" title={`Occupancy: ${occupancyPercentage}% (${estimatedPassengers}/${capacity} seats)`}>
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${style.badgeBg}`}
        >
          <Users className="w-3 h-3" />
          {crowdLevel} • {occupancyPercentage}%
        </span>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Users className={`w-4 h-4 ${style.text}`} />
          <span className="text-xs font-bold text-slate-800">Passenger Load</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${style.badgeBg}`}>
            {crowdLevel}
          </span>
        </div>

        <div className="flex items-center gap-1 text-[11px] font-bold text-slate-600">
          <span>{estimatedPassengers}</span>
          <span className="text-slate-400 font-normal">/ {capacity} seats</span>
          <span className={`ml-1 ${style.text}`}>({occupancyPercentage}%)</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden shadow-inner">
        <div
          className={`h-full bg-gradient-to-r ${style.barGradient} transition-all duration-500 rounded-full`}
          style={{ width: `${Math.min(100, Math.max(5, occupancyPercentage))}%` }}
        ></div>
      </div>

      {showLabel && (
        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
          <span>{style.label}</span>
          <div className="flex items-center gap-1 font-medium">
            <span>Trend:</span>
            {trend === 'increasing' ? (
              <span className="flex items-center text-amber-600 font-bold">
                <TrendingUp className="w-3 h-3 mr-0.5" /> Rising
              </span>
            ) : trend === 'decreasing' ? (
              <span className="flex items-center text-emerald-600 font-bold">
                <TrendingDown className="w-3 h-3 mr-0.5" /> Easing
              </span>
            ) : (
              <span className="flex items-center text-slate-600">
                <Minus className="w-3 h-3 mr-0.5" /> Stable
              </span>
            )}
            <span className="text-slate-300">•</span>
            <span className="text-purple-600 font-semibold">{confidence}% ML conf</span>
          </div>
        </div>
      )}
    </div>
  );
};
