import React, { useState, useEffect } from 'react';
import { incidentApi } from '../api/incidentApi';
import {
  ShieldAlert,
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertTriangle,
  User,
  Bus,
  Route as RouteIcon,
  X,
  FileText,
  Lock,
} from 'lucide-react';

export const AdminIncidents = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (severityFilter !== 'all') params.severity = severityFilter;

      const res = await incidentApi.getAll(params);
      if (res.success && res.data) {
        setIncidents(res.data);
        if (selectedIncident) {
          const updated = res.data.find((i) => i._id === selectedIncident._id);
          if (updated) setSelectedIncident(updated);
        }
      }
    } catch (err) {
      console.error('[AdminIncidents] Error fetching incidents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [statusFilter, severityFilter]);

  const handleStatusChange = async (incidentId, newStatus) => {
    try {
      setSubmitting(true);
      const res = await incidentApi.update(incidentId, { status: newStatus });
      if (res.success) {
        fetchIncidents();
      }
    } catch (err) {
      console.error('[AdminIncidents] Error updating status:', err);
      alert('Failed to update status.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    if (!selectedIncident) return;

    try {
      setSubmitting(true);
      const res = await incidentApi.resolve(selectedIncident._id, {
        resolutionNotes: resolutionNotes.trim() || 'Incident investigated and resolved.',
      });
      if (res.success) {
        setShowResolveModal(false);
        setResolutionNotes('');
        fetchIncidents();
      }
    } catch (err) {
      console.error('[AdminIncidents] Error resolving incident:', err);
      alert('Failed to resolve incident.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseIncident = async (incidentId) => {
    if (!confirm('Are you sure you want to close and archive this incident?')) return;
    try {
      setSubmitting(true);
      const res = await incidentApi.close(incidentId);
      if (res.success) {
        fetchIncidents();
      }
    } catch (err) {
      console.error('[AdminIncidents] Error closing incident:', err);
      alert('Failed to close incident.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'closed':
        return (
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
            Closed
          </span>
        );
      case 'resolved':
        return (
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
            Resolved
          </span>
        );
      case 'investigating':
        return (
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 animate-pulse">
            Investigating
          </span>
        );
      case 'reported':
      default:
        return (
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
            Reported
          </span>
        );
    }
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'critical':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-600 text-white">Critical</span>;
      case 'high':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500 text-white">High</span>;
      case 'low':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">Low</span>;
      case 'medium':
      default:
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700">Medium</span>;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[600px] flex flex-col">
      {/* Header */}
      <div className="bg-slate-900 text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-rose-300">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white">Transport Operational Incidents</h3>
            <p className="text-xs text-slate-400">
              Breakdown logging, route hazard tracking, and safety management
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold uppercase text-slate-400">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2 py-1 rounded-lg border border-slate-300 bg-white font-medium text-xs"
            >
              <option value="all">All Statuses</option>
              <option value="reported">Reported</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold uppercase text-slate-400">Severity:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-2 py-1 rounded-lg border border-slate-300 bg-white font-medium text-xs"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        <button onClick={fetchIncidents} className="text-xs text-blue-600 hover:underline font-bold">
          Refresh ({incidents.length})
        </button>
      </div>

      {/* Split List & Detail View */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Incident List */}
        <div className="lg:col-span-6 border-r border-slate-200 overflow-y-auto max-h-[600px] p-3 space-y-2 bg-slate-50/40">
          {loading && (
            <div className="text-center py-12 space-y-2">
              <div className="w-8 h-8 rounded-full border-2 border-rose-600 border-t-transparent animate-spin mx-auto"></div>
              <p className="text-xs text-slate-500">Loading incidents...</p>
            </div>
          )}

          {!loading && incidents.length === 0 && (
            <div className="text-center py-16 space-y-2">
              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
              <h4 className="font-bold text-slate-800 text-sm">No Incidents Reported</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                No active operational disruptions or breakdowns reported.
              </p>
            </div>
          )}

          {!loading &&
            incidents.map((inc) => (
              <div
                key={inc._id}
                onClick={() => setSelectedIncident(inc)}
                className={`p-3.5 rounded-xl border cursor-pointer transition space-y-2 ${
                  selectedIncident?._id === inc._id
                    ? 'bg-rose-50/70 border-rose-300 ring-2 ring-rose-200/50 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-rose-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                      {inc.incidentNumber}
                    </span>
                    {getSeverityBadge(inc.severity)}
                  </div>
                  {getStatusBadge(inc.status)}
                </div>

                <div>
                  <h4 className="font-bold text-xs text-slate-900 line-clamp-1">{inc.title}</h4>
                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{inc.description}</p>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                  <span className="flex items-center gap-1 font-semibold text-slate-700">
                    <User className="w-3 h-3 text-slate-400" /> {inc.reportedBy?.name || 'Staff'} (
                    {inc.reportedBy?.role})
                  </span>
                  <span>{new Date(inc.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
        </div>

        {/* Selected Incident Detail */}
        <div className="lg:col-span-6 p-6 overflow-y-auto max-h-[600px] space-y-5 bg-white text-xs">
          {selectedIncident ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg">
                      {selectedIncident.incidentNumber}
                    </span>
                    {getStatusBadge(selectedIncident.status)}
                    {getSeverityBadge(selectedIncident.severity)}
                  </div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 mt-2">
                    {selectedIncident.title}
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Reported on {new Date(selectedIncident.createdAt).toLocaleString()}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {selectedIncident.status === 'reported' && (
                    <button
                      onClick={() => handleStatusChange(selectedIncident._id, 'investigating')}
                      disabled={submitting}
                      className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1 shadow-xs"
                    >
                      <Clock className="w-3.5 h-3.5" /> Start Investigation
                    </button>
                  )}

                  {selectedIncident.status !== 'resolved' &&
                    selectedIncident.status !== 'closed' && (
                      <button
                        onClick={() => setShowResolveModal(true)}
                        disabled={submitting}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1 shadow-xs"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Resolve Incident
                      </button>
                    )}

                  {selectedIncident.status === 'resolved' && (
                    <button
                      onClick={() => handleCloseIncident(selectedIncident._id)}
                      disabled={submitting}
                      className="bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1 shadow-xs"
                    >
                      <Lock className="w-3.5 h-3.5" /> Close & Archive
                    </button>
                  )}
                </div>
              </div>

              {/* Transit entity linkage */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Reported By</span>
                  <p className="font-bold text-slate-800">{selectedIncident.reportedBy?.name}</p>
                  <p className="text-slate-500 text-[11px]">
                    {selectedIncident.reportedBy?.email} • {selectedIncident.reportedBy?.phone}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Associated Vehicle</span>
                  <p className="text-slate-700">
                    Bus: {selectedIncident.bus?.busNumber || 'None'} ({selectedIncident.bus?.plateNumber})
                  </p>
                  <p className="text-slate-700">
                    Route: {selectedIncident.route?.name || 'None'}
                  </p>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h4 className="font-bold uppercase tracking-wider text-slate-500 text-[10px]">
                  Description
                </h4>
                <div className="p-4 rounded-xl bg-white border border-slate-200 text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {selectedIncident.description}
                </div>
              </div>

              {/* Resolution Notes */}
              {selectedIncident.resolutionNotes && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                    <CheckCircle className="w-4 h-4 text-emerald-600" /> Resolution Note
                  </div>
                  <p className="text-emerald-800 leading-relaxed">
                    {selectedIncident.resolutionNotes}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-24 space-y-3">
              <ShieldAlert className="w-8 h-8 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-700 text-sm">Select an Incident</h4>
              <p className="text-xs text-slate-400">
                Choose an incident from the left list to review report details and dispatch status.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Resolve Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" /> Resolve Incident{' '}
                {selectedIncident?.incidentNumber}
              </h3>
              <button
                onClick={() => setShowResolveModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResolveSubmit} className="space-y-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Resolution / Repairs / Clearance Notes *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Detail repair steps taken, tow arrival, backup bus assigned, or lane cleared..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs resize-none"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowResolveModal(false)}
                  className="px-3 py-1.5 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 font-bold rounded-lg transition shadow-sm"
                >
                  {submitting ? 'Resolving...' : 'Confirm Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminIncidents;
