import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { busApi } from '../api/busApi';
import { routeApi } from '../api/routeApi';
import { Bus, Navigation, CheckCircle2, AlertTriangle, ShieldAlert, Radio, Clock, User } from 'lucide-react';

export const DriverDashboard = () => {
  const { user } = useAuth();
  const [buses, setBuses] = useState([]);
  const [assignedBus, setAssignedBus] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [successNotice, setSuccessNotice] = useState('');

  const fetchDriverData = async () => {
    try {
      setLoading(true);
      const res = await busApi.getAll();
      if (res.success) {
        setBuses(res.data);
        // Find bus assigned to this driver or default to Bus 12
        const myBus =
          res.data.find((b) => b.currentDriver?._id === user?.id || b.currentDriver === user?.id) ||
          res.data.find((b) => b.busNumber === 'Bus 12') ||
          res.data[0];
        setAssignedBus(myBus);
        if (myBus) {
          setStatusMessage(myBus.statusMessage || '');
        }
      }
    } catch (err) {
      console.error('[DriverDashboard] Error fetching bus data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDriverData();
  }, [user]);

  const handleStatusUpdate = async (newStatus) => {
    if (!assignedBus) return;
    try {
      setUpdating(true);
      const res = await busApi.update(assignedBus._id, {
        status: newStatus,
        statusMessage: statusMessage || (newStatus === 'delayed' ? 'Running behind schedule' : 'Operating normally'),
      });
      if (res.success) {
        setAssignedBus(res.data);
        setSuccessNotice(`Status updated to "${newStatus.toUpperCase()}"!`);
        setTimeout(() => setSuccessNotice(''), 4000);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleCustomMessageSave = async (e) => {
    e.preventDefault();
    if (!assignedBus) return;
    try {
      setUpdating(true);
      const res = await busApi.update(assignedBus._id, {
        statusMessage,
      });
      if (res.success) {
        setAssignedBus(res.data);
        setSuccessNotice('Driver broadcast message updated!');
        setTimeout(() => setSuccessNotice(''), 4000);
      }
    } catch (err) {
      console.error('Failed to save message:', err);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Driver Header */}
      <div className="bg-gradient-to-r from-emerald-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase tracking-wider">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" /> Driver Operational Cockpit
          </div>
          <h1 className="text-2xl font-extrabold mt-1">{user?.name || 'Driver Portal'}</h1>
          <p className="text-xs text-emerald-100/80 mt-1">
            License: <span className="font-mono font-bold text-white">DL-2024-9988-KA</span> • Status: Active Shift
          </p>
        </div>

        <div className="bg-emerald-700/50 border border-emerald-500/40 px-4 py-2 rounded-xl text-center">
          <p className="text-[10px] uppercase font-bold text-emerald-200">Vehicle Assigned</p>
          <p className="text-lg font-black text-white">{assignedBus?.busNumber || 'Bus 12'}</p>
        </div>
      </div>

      {successNotice && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {successNotice}
        </div>
      )}

      {/* Primary Vehicle Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Vehicle Information */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <Bus className="w-4 h-4 text-emerald-600" /> Vehicle & Route Details
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Plate Number</span>
              <span className="font-mono font-bold text-slate-800">{assignedBus?.plateNumber}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Bus Model</span>
              <span className="font-semibold text-slate-800">{assignedBus?.model}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Capacity</span>
              <span className="font-semibold text-slate-800">{assignedBus?.capacity} Passengers</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Assigned Route</span>
              <span className="font-bold text-blue-600">{assignedBus?.currentRoute?.name || 'North-South Campus Express'}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-500">Current Status</span>
              <span
                className={`font-bold capitalize px-2 py-0.5 rounded-full text-[10px] ${
                  assignedBus?.status === 'active'
                    ? 'bg-emerald-100 text-emerald-800'
                    : assignedBus?.status === 'delayed'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {assignedBus?.status}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Operational Status Toggles */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-600" /> One-Tap Status Reporter
          </h3>
          <p className="text-xs text-slate-500">
            Keep students and dispatchers instantly informed about route conditions.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
            <button
              onClick={() => handleStatusUpdate('active')}
              disabled={updating}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 font-bold text-xs transition ${
                assignedBus?.status === 'active'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <CheckCircle2 className="w-5 h-5" />
              On Time
            </button>

            <button
              onClick={() => handleStatusUpdate('delayed')}
              disabled={updating}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 font-bold text-xs transition ${
                assignedBus?.status === 'delayed'
                  ? 'bg-amber-500 text-white border-amber-500 shadow-md'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
              Delayed
            </button>

            <button
              onClick={() => handleStatusUpdate('breakdown')}
              disabled={updating}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 font-bold text-xs transition ${
                assignedBus?.status === 'breakdown'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-md'
                  : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
              }`}
            >
              <ShieldAlert className="w-5 h-5" />
              Breakdown
            </button>
          </div>

          <form onSubmit={handleCustomMessageSave} className="mt-4 pt-4 border-t border-slate-100">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Live Broadcast Message for Students:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={statusMessage}
                onChange={(e) => setStatusMessage(e.target.value)}
                placeholder="e.g. Approaching Hostel 3 stop on schedule"
                className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={updating}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition"
              >
                Post
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Route Checkpoints Sequence */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 mb-4">
          <Navigation className="w-4 h-4 text-emerald-600" /> Route Checkpoint Checklist
        </h3>

        <div className="space-y-3">
          {assignedBus?.currentRoute?.stops?.length > 0 ? (
            assignedBus.currentRoute.stops.map((st, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div>
                    <h5 className="font-bold text-slate-800 text-xs">{st.stop?.name || `Stop ${idx + 1}`}</h5>
                    <span className="text-[10px] text-slate-500">{st.stop?.campusZone || 'Campus Zone'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-600">+{st.estimatedMinutesFromStart} mins</span>
                  <span className="font-mono text-xs font-bold bg-white text-blue-600 px-2 py-0.5 rounded border border-slate-200">
                    {st.stop?.code}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-xs text-slate-500">
              No assigned stop sequence found for this route.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
