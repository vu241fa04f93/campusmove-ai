import React, { useState, useEffect } from 'react';
import { tripApi } from '../api/tripApi';
import { formatETA, formatDistance, formatSpeed } from '../utils/etaCalculator';
import {
  Navigation,
  MapPin,
  Clock,
  Zap,
  ArrowRight,
  ArrowUpDown,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Calendar,
  Footprints,
  Bus,
  Sparkles,
  ShieldCheck,
  Info,
  ChevronRight,
  Layers,
} from 'lucide-react';

export const TripPlanner = ({
  stops = [],
  routes = [],
  onSelectRoute,
  onSelectStop,
  onSelectBus,
  onFocusMap,
}) => {
  // Form States
  const [origin, setOrigin] = useState('Hostel 3 (Men’s Residence)');
  const [destination, setDestination] = useState('Block C (Computer Science)');
  const [requiredArrivalTime, setRequiredArrivalTime] = useState('09:00');
  const [preference, setPreference] = useState('fastest'); // 'fastest', 'earliest_arrival', 'convenient'

  // Result States
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedOptionId, setSelectedOptionId] = useState(null);

  // Set default initial arrival time based on current time + 25 mins
  useEffect(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 25);
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    setRequiredArrivalTime(`${hours}:${mins}`);

    // Fetch popular suggestions
    tripApi
      .getSuggestions()
      .then((res) => {
        if (res.success) setSuggestions(res.data);
      })
      .catch(() => {});
  }, []);

  const handleSwap = () => {
    setOrigin(destination);
    setDestination(origin);
  };

  const handlePlanTrip = async (e) => {
    if (e) e.preventDefault();
    if (!origin || !destination) {
      setError('Please select both an origin and a destination.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const data = await tripApi.planTrip({
        origin,
        destination,
        requiredArrivalTime: requiredArrivalTime || undefined,
        preference,
      });

      if (data.success) {
        setResult(data);
        setSelectedOptionId(data.recommendation?.id || null);

        // Notify parent to highlight on map if route exists
        if (data.recommendation?.routeId && onSelectRoute) {
          const matchedRoute = routes.find((r) => r._id === data.recommendation.routeId);
          if (matchedRoute) onSelectRoute(matchedRoute);
        }
      } else {
        setError(data.message || 'Unable to calculate trip. Please check your inputs.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to plan trip. Server connection error.');
    } finally {
      setLoading(false);
    }
  };

  // Run initial query on mount once stops are loaded
  useEffect(() => {
    if (stops.length > 0 && !result) {
      handlePlanTrip();
    }
  }, [stops]);

  const handleSelectSuggestion = (sug) => {
    setOrigin(sug.origin);
    setDestination(sug.destination);
    if (sug.targetTime) setRequiredArrivalTime(sug.targetTime);
  };

  const activeOption =
    result?.recommendation?.id === selectedOptionId
      ? result.recommendation
      : result?.alternatives?.find((a) => a.id === selectedOptionId) || result?.recommendation;

  return (
    <div className="space-y-6">
      {/* Trip Planning Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              Intelligent Campus Trip Planner
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Deterministic multi-factor routing engine with live GPS tracking, walking metrics & safety buffers
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold text-slate-700">Safety Buffer: ~5–8 mins</span>
          </div>
        </div>

        {/* Form Controls */}
        <form onSubmit={handlePlanTrip} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* Origin Stop */}
            <div className="md:col-span-5 relative">
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Origin (Pickup Stop)
              </label>
              <div className="relative">
                <select
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className="w-full pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {stops.map((s) => (
                    <option key={s._id} value={s.name}>
                      {s.name} ({s.code}) — {s.campusZone}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Swap Button */}
            <div className="md:col-span-2 flex justify-center pt-5">
              <button
                type="button"
                onClick={handleSwap}
                title="Swap Origin and Destination"
                className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-blue-600 transition border border-slate-200"
              >
                <ArrowUpDown className="w-4 h-4" />
              </button>
            </div>

            {/* Destination Stop */}
            <div className="md:col-span-5 relative">
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span> Destination (Target Block)
              </label>
              <div className="relative">
                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {stops.map((s) => (
                    <option key={s._id} value={s.name}>
                      {s.name} ({s.code}) — {s.campusZone}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Time and Preferences Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 pt-1">
            {/* Required Arrival Time */}
            <div className="md:col-span-4">
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-600" /> Must Reach Destination By:
              </label>
              <input
                type="time"
                value={requiredArrivalTime}
                onChange={(e) => setRequiredArrivalTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Preference Chips */}
            <div className="md:col-span-5">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Routing Priority:</label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setPreference('fastest')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                    preference === 'fastest'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" /> Fastest
                </button>
                <button
                  type="button"
                  onClick={() => setPreference('earliest_arrival')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                    preference === 'earliest_arrival'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" /> Earliest
                </button>
                <button
                  type="button"
                  onClick={() => setPreference('convenient')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                    preference === 'convenient'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Footprints className="w-3.5 h-3.5" /> Min Walking
                </button>
              </div>
            </div>

            {/* Plan Button */}
            <div className="md:col-span-3 flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Evaluating Routes...
                  </>
                ) : (
                  <>
                    <Navigation className="w-4 h-4" /> Find Best Route
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Quick Campus Suggestions */}
        {suggestions.length > 0 && (
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Quick Trips:</span>
            {suggestions.map((sug) => (
              <button
                key={sug.id}
                type="button"
                onClick={() => handleSelectSuggestion(sug)}
                className="text-[11px] font-semibold bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 px-2.5 py-1 rounded-lg border border-slate-200 transition"
              >
                {sug.title} ({sug.targetTime})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Error Notice */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl text-rose-800 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Delay / Automatic Replanning Notice */}
      {result?.delayNotice && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-amber-900 text-xs flex items-start gap-2.5 shadow-sm">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold uppercase tracking-wider text-[10px] text-amber-700 block mb-0.5">
              Automatic Rerouting Alert
            </span>
            <p>{result.delayNotice}</p>
          </div>
        </div>
      )}

      {/* Recommended Option Hero Card */}
      {result && result.recommendation && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Recommended Transport Option
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              Evaluated {result.totalOptionsEvaluated || 1} candidate routes
            </span>
          </div>

          <div
            className={`bg-white rounded-2xl border-2 transition shadow-sm overflow-hidden ${
              activeOption?.id === result.recommendation.id
                ? 'border-blue-500 shadow-blue-500/10 shadow-lg'
                : 'border-slate-200'
            }`}
          >
            {/* Header Ribbon */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
                  {activeOption?.type === 'walk' ? (
                    <Footprints className="w-5 h-5" />
                  ) : (
                    <Bus className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-white">{activeOption?.title}</span>
                    {activeOption?.isLiveGPS && (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-400/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Live GPS
                      </span>
                    )}
                    {activeOption?.isSimulated && (
                      <span className="text-[9px] bg-indigo-500/30 text-indigo-200 font-bold px-1.5 py-0.5 rounded">
                        SIM
                      </span>
                    )}
                    {activeOption?.dataSource === 'scheduled_timetable' && (
                      <span className="text-[10px] bg-slate-700 text-slate-200 font-bold px-2 py-0.5 rounded-full">
                        Timetable
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {activeOption?.originStop?.name} <span className="text-slate-500">→</span> {activeOption?.destinationStop?.name}
                  </p>
                </div>
              </div>

              {/* On-Time Badge */}
              <div className="flex items-center gap-2">
                {activeOption?.isOnTime ? (
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    On Time ({activeOption.marginMinutes}m buffer)
                  </span>
                ) : (
                  <span className="bg-rose-500/20 text-rose-300 border border-rose-400/30 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    Late by {Math.abs(activeOption?.marginMinutes || 0)}m
                  </span>
                )}
              </div>
            </div>

            {/* Timing & Summary Bar */}
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center sm:text-left">
              <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Departure Time
                </span>
                <span className="text-lg font-black text-slate-800 mt-0.5 block">
                  {activeOption?.departureTime}
                </span>
                <span className="text-[11px] text-slate-500">
                  {activeOption?.type === 'walk' ? 'Start walking now' : `From ${activeOption?.boardingStop?.name}`}
                </span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Expected Arrival
                </span>
                <span className="text-lg font-black text-blue-600 mt-0.5 block">
                  {activeOption?.arrivalTime}
                </span>
                <span className="text-[11px] text-slate-500">
                  Target: {requiredArrivalTime || 'Flexible'}
                </span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Travel Time
                </span>
                <span className="text-lg font-black text-slate-800 mt-0.5 block">
                  ~{activeOption?.totalDurationMinutes} mins
                </span>
                <span className="text-[11px] text-emerald-600 font-semibold">
                  Safety Buffer: {activeOption?.safetyBufferMinutes}m included
                </span>
              </div>
            </div>

            {/* Step-by-Step Journey Breakdown */}
            <div className="p-5 space-y-4">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Step-by-Step Journey Plan:
              </h4>

              <div className="space-y-3">
                {activeOption?.steps?.map((st, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {st.stepIndex || idx + 1}
                    </span>
                    <div className="flex-1 text-xs">
                      <p className="font-bold text-slate-800">{st.instruction}</p>
                      {st.details && <p className="text-[11px] text-slate-500 mt-0.5">{st.details}</p>}
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500 font-medium">
                        {st.durationMinutes > 0 && <span>Duration: ~{st.durationMinutes} mins</span>}
                        {st.distance && <span>Distance: {st.distance}</span>}
                        {st.stopsCount > 0 && <span>Stops: {st.stopsCount} stops</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Rationale Bullet Points */}
              {activeOption?.whyRecommended && activeOption.whyRecommended.length > 0 && (
                <div className="mt-4 p-4 rounded-xl bg-blue-50/70 border border-blue-100">
                  <h5 className="text-xs font-bold text-blue-900 flex items-center gap-1.5 mb-2">
                    <Info className="w-3.5 h-3.5 text-blue-600" />
                    Why this option is recommended:
                  </h5>
                  <ul className="space-y-1 text-xs text-blue-800/90 list-disc list-inside">
                    {activeOption.whyRecommended.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Alternative Options List */}
      {result && result.alternatives && result.alternatives.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-600" />
            Alternative Campus Routes & Options ({result.alternatives.length})
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {result.alternatives.map((alt) => (
              <div
                key={alt.id}
                onClick={() => setSelectedOptionId(alt.id)}
                className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                  activeOption?.id === alt.id
                    ? 'bg-blue-50/80 border-blue-500 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs truncate max-w-[150px]">
                      {alt.title}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        alt.isOnTime ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {alt.isOnTime ? 'On Time' : 'Late'}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Depart:</span>
                      <span className="font-bold text-slate-800">{alt.departureTime}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Arrive:</span>
                      <span className="font-bold text-blue-600">{alt.arrivalTime}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Duration:</span>
                      <span className="font-semibold text-slate-800">~{alt.totalDurationMinutes} mins</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedOptionId(alt.id);
                  }}
                  className="mt-3 w-full py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition flex items-center justify-center gap-1"
                >
                  View Details <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
