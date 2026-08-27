import React, { useState, useEffect } from 'react';
import { analyticsApi } from '../api/analyticsApi';
import { Navigation, Flame, MapPin, Bus, MessageSquare, ShieldAlert, TrendingUp } from 'lucide-react';

export const RouteAnalytics = () => {
  const [routeData, setRouteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRoutes = async () => {
    try {
      setLoading(true);
      const res = await analyticsApi.getRoutes();
      if (res.success) setRouteData(res.data);
    } catch (err) {
      console.error('[RouteAnalytics] Error:', err);
      setError('Failed to calculate route analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

  if (loading) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500 font-medium">Analyzing campus route demand and passenger traffic...</p>
      </div>
    );
  }

  if (error || !routeData) {
    return (
      <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl text-rose-700 text-xs flex items-center justify-between">
        <span>{error || 'Route analytics unavailable.'}</span>
        <button onClick={fetchRoutes} className="px-3 py-1 bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-700">
          Retry
        </button>
      </div>
    );
  }

  const { totalRoutes, busiestRoute, leastUtilizedRoute, routeWithMostComplaints, routes } = routeData;

  return (
    <div className="space-y-6">
      {/* Route Highlights Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase text-slate-500">Busiest Campus Corridor</span>
            <Flame className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-extrabold text-slate-900">{busiestRoute?.name || 'N/A'}</div>
          <p className="text-xs font-semibold text-purple-600">
            Code: {busiestRoute?.code || '—'} • {busiestRoute?.trips || 0} Estimated Trips
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase text-slate-500">Least Utilized Corridor</span>
            <TrendingUp className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-extrabold text-slate-900">{leastUtilizedRoute?.name || 'N/A'}</div>
          <p className="text-xs font-semibold text-amber-600">
            {leastUtilizedRoute?.utilization}% average capacity factor
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase text-slate-500">Highest Feedback Hotspot</span>
            <MessageSquare className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-extrabold text-slate-900">{routeWithMostComplaints?.name || 'N/A'}</div>
          <p className="text-xs font-semibold text-rose-600">
            {routeWithMostComplaints?.complaints || 0} logged student feedback tickets
          </p>
        </div>
      </div>

      {/* Corridor Intelligence Roster */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <Navigation className="w-4 h-4 text-blue-600" /> Route Corridor Performance Matrix
            </h3>
            <p className="text-xs text-slate-500">Stop coverage, fleet allocation ratio, trip throughput, feedback tickets, and demand tier</p>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
            {totalRoutes} Corridors
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Route Name</th>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Stops</th>
                <th className="py-3 px-4">Assigned Fleet</th>
                <th className="py-3 px-4">Total Trips</th>
                <th className="py-3 px-4">Avg Utilization</th>
                <th className="py-3 px-4">Complaints</th>
                <th className="py-3 px-4">Incidents</th>
                <th className="py-3 px-4 text-right">Demand Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {routes.map((r) => (
                <tr key={r.routeId} className="hover:bg-slate-50/80 transition">
                  <td className="py-3.5 px-4 font-extrabold text-slate-900">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                      <span>{r.routeName}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                    {r.routeCode}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-700">
                    {r.numberOfStops} stops
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">
                    {r.assignedBusesCount} buses ({r.activeBusesCount} active)
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-purple-700">
                    {r.totalTrips}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="w-24 space-y-1">
                      <span className="font-bold text-[10px]">{r.averageUtilization}%</span>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${r.averageUtilization}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-700">
                    {r.complaintsCount}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-700">
                    {r.incidentsCount}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span
                      className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase ${
                        r.demandLevel === 'SURGE'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : r.demandLevel === 'HIGH'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {r.demandLevel}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
