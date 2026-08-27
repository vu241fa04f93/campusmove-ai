import React, { useState, useEffect } from 'react';
import { analyticsApi } from '../api/analyticsApi';
import { CrowdIndicator } from './CrowdIndicator';
import { Bus, Gauge, Award, Clock, Activity, TrendingUp, AlertTriangle } from 'lucide-react';

export const FleetAnalytics = () => {
  const [fleetData, setFleetData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFleet = async () => {
    try {
      setLoading(true);
      const res = await analyticsApi.getFleet();
      if (res.success) setFleetData(res.data);
    } catch (err) {
      console.error('[FleetAnalytics] Error:', err);
      setError('Failed to calculate fleet utilization metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFleet();
  }, []);

  if (loading) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500 font-medium">Computing fleet utilization telemetry...</p>
      </div>
    );
  }

  if (error || !fleetData) {
    return (
      <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl text-rose-700 text-xs flex items-center justify-between">
        <span>{error || 'Fleet metrics unavailable.'}</span>
        <button onClick={fetchFleet} className="px-3 py-1 bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-700">
          Retry
        </button>
      </div>
    );
  }

  const { fleetSize, averageFleetUtilization, mostUtilizedBus, leastUtilizedBus, buses } = fleetData;

  return (
    <div className="space-y-6">
      {/* Fleet Utilization Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-purple-900 to-indigo-900 text-white p-5 rounded-2xl shadow-sm space-y-1">
          <span className="text-[10px] font-extrabold uppercase text-purple-200">Average Fleet Utilization</span>
          <div className="text-3xl font-black text-white flex items-baseline gap-2">
            {averageFleetUtilization}%
            <span className="text-xs font-normal text-purple-200">capacity factor</span>
          </div>
          <p className="text-[11px] text-purple-200/90 pt-1">Across all {fleetSize} registered campus vehicles</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase text-slate-500">Most Utilized Vehicle</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-extrabold text-slate-900">{mostUtilizedBus?.busNumber || 'N/A'}</div>
          <p className="text-xs font-semibold text-emerald-600">
            {mostUtilizedBus?.utilization}% utilization • {mostUtilizedBus?.route || 'Campus Line'}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase text-slate-500">Least Utilized Vehicle</span>
            <TrendingUp className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-extrabold text-slate-900">{leastUtilizedBus?.busNumber || 'N/A'}</div>
          <p className="text-xs font-semibold text-amber-600">
            {leastUtilizedBus?.utilization}% utilization • {leastUtilizedBus?.route || 'Campus Line'}
          </p>
        </div>
      </div>

      {/* Fleet Utilization Detail Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <Bus className="w-4 h-4 text-purple-600" /> Fleet Vehicle Roster & Utilization
            </h3>
            <p className="text-xs text-slate-500">Detailed breakdown of operating status, estimated hours, crowd load, and reliability score</p>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
            {buses.length} Vehicles
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Bus</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Route</th>
                <th className="py-3 px-4">Completed Trips</th>
                <th className="py-3 px-4">Operating Hours</th>
                <th className="py-3 px-4">Passenger Crowd</th>
                <th className="py-3 px-4">Utilization</th>
                <th className="py-3 px-4 text-right">Reliability Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {buses.map((b) => (
                <tr key={b.busId} className="hover:bg-slate-50/80 transition">
                  <td className="py-3.5 px-4 font-extrabold text-slate-900">
                    <div className="flex items-center gap-1.5">
                      <span>{b.busNumber}</span>
                      <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border">
                        {b.plateNumber}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full capitalize ${
                        b.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : b.status === 'delayed'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {b.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-700">
                    {b.route?.name || 'Unassigned'}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                    {b.tripsCompleted}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-700">
                    {b.estimatedOperatingHours} hrs
                  </td>
                  <td className="py-3.5 px-4">
                    <CrowdIndicator
                      crowdLevel={b.crowdLevel}
                      occupancyPercentage={b.currentOccupancy}
                      compact={true}
                    />
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="w-28 space-y-1">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span>{b.utilization}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            b.utilization >= 80 ? 'bg-purple-600' : b.utilization >= 50 ? 'bg-blue-600' : 'bg-amber-500'
                          }`}
                          style={{ width: `${b.utilization}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span
                      className={`font-black text-xs px-2.5 py-1 rounded-lg ${
                        b.reliabilityScore >= 85
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : b.reliabilityScore >= 70
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {b.reliabilityScore} / 100
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
