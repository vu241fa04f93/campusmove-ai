import React, { useState } from 'react';
import { incidentApi } from '../api/incidentApi';
import { ShieldAlert, X, AlertTriangle, Send } from 'lucide-react';

export const DriverIncidentModal = ({ isOpen, onClose, bus, route, onIncidentReported }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('breakdown');
  const [severity, setSeverity] = useState('medium');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      alert('Please fill out all required incident details.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await incidentApi.create({
        title: title.trim(),
        description: description.trim(),
        type,
        severity,
        bus: bus?._id || undefined,
        route: route?._id || undefined,
      });

      if (res.success) {
        setTitle('');
        setDescription('');
        if (onIncidentReported) onIncidentReported(res.data);
        onClose();
      }
    } catch (err) {
      console.error('[DriverIncidentModal] Error submitting incident:', err);
      alert('Failed to submit incident report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Report Transport Incident</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Incident Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Engine overheating near Admin Circle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Type *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 text-xs bg-white"
              >
                <option value="breakdown">Breakdown</option>
                <option value="traffic">Severe Traffic</option>
                <option value="accident">Accident / Collision</option>
                <option value="safety">Safety Hazard</option>
                <option value="medical">Medical Emergency</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Severity *</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 text-xs bg-white"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Detailed Description *</label>
            <textarea
              required
              rows={3}
              placeholder="Explain the situation, any passenger impact, and assistance needed..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 text-xs resize-none"
            />
          </div>

          {(bus || route) && (
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-center gap-3">
              {bus && <span>Bus: <strong>{bus.busNumber}</strong></span>}
              {route && <span>Route: <strong>{route.name}</strong></span>}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              {submitting ? 'Reporting...' : 'Submit Incident Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DriverIncidentModal;
