import React, { useState, useEffect } from 'react';
import { complaintApi } from '../api/complaintApi';
import {
  MessageSquare,
  PlusCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  Tag,
  ChevronRight,
  Send,
  Bus,
  MapPin,
  Route as RouteIcon,
  ShieldAlert,
  HelpCircle,
  History,
  CheckCheck,
  X,
  Sparkles,
} from 'lucide-react';

export const StudentComplaints = ({ stops = [], routes = [], buses = [] }) => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // New complaint form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'bus_delay',
    priority: 'medium',
    bus: '',
    route: '',
    stop: '',
  });

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await complaintApi.getMy({
        status: statusFilter === 'all' ? undefined : statusFilter,
      });
      if (res.success && res.data) {
        setComplaints(res.data);
        if (selectedComplaint) {
          const updated = res.data.find((c) => c._id === selectedComplaint._id);
          if (updated) setSelectedComplaint(updated);
        }
      }
    } catch (err) {
      console.error('[StudentComplaints] Failed to load complaints:', err);
      setError('Unable to load your complaints. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [statusFilter]);

  const handleCreateComplaint = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim()) {
      alert('Please fill in both a title and description.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        priority: formData.priority,
        bus: formData.bus || undefined,
        route: formData.route || undefined,
        stop: formData.stop || undefined,
      };

      const res = await complaintApi.create(payload);
      if (res.success) {
        setShowNewModal(false);
        setFormData({
          title: '',
          description: '',
          category: 'bus_delay',
          priority: 'medium',
          bus: '',
          route: '',
          stop: '',
        });
        fetchComplaints();
      }
    } catch (err) {
      console.error('[StudentComplaints] Error submitting complaint:', err);
      alert('Failed to submit complaint. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmResolution = async (complaintId) => {
    try {
      setSubmitting(true);
      const res = await complaintApi.confirm(complaintId, {
        feedback: 'Student confirmed satisfactory resolution',
      });
      if (res.success) {
        fetchComplaints();
      }
    } catch (err) {
      console.error('[StudentComplaints] Failed to confirm resolution:', err);
      alert('Error confirming resolution.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReopenComplaint = async (e) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    if (!reopenReason.trim()) {
      alert('Please provide a reason for reopening this ticket.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await complaintApi.reopen(selectedComplaint._id, {
        reopenReason: reopenReason.trim(),
      });
      if (res.success) {
        setShowReopenModal(false);
        setReopenReason('');
        fetchComplaints();
      }
    } catch (err) {
      console.error('[StudentComplaints] Failed to reopen complaint:', err);
      alert('Error reopening complaint.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
            <CheckCheck className="w-3 h-3 text-emerald-600" /> Confirmed
          </span>
        );
      case 'resolved':
        return (
          <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-blue-600" /> Resolved
          </span>
        );
      case 'in_progress':
        return (
          <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600 animate-spin" /> In Progress
          </span>
        );
      case 'open':
      default:
        return (
          <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-rose-600" /> Open
          </span>
        );
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'critical':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500 text-white">Critical</span>;
      case 'high':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500 text-white">High</span>;
      case 'low':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">Low</span>;
      case 'medium':
      default:
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700">Medium</span>;
    }
  };

  const formatCategory = (cat) => {
    return cat
      ? cat
          .split('_')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ')
      : 'General';
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[600px] flex flex-col">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-sm">
            <MessageSquare className="w-5 h-5 text-indigo-300" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white">Transport Feedback & Complaints</h3>
            <p className="text-xs text-slate-300">
              Submit issues regarding delays, routes, or driver conduct with ticket lifecycle tracking
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
        >
          <PlusCircle className="w-4 h-4" /> Submit Complaint
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 overflow-x-auto text-xs">
        <div className="flex items-center gap-1.5">
          {['all', 'open', 'in_progress', 'resolved', 'confirmed'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg font-bold capitalize transition ${
                statusFilter === status
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-slate-400 font-medium pr-2">
          {complaints.length} tickets
        </span>
      </div>

      {/* Main Content: List + Detail Split View */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Complaints List (Left Col) */}
        <div className="lg:col-span-5 border-r border-slate-200 overflow-y-auto max-h-[650px] p-3 space-y-2.5 bg-slate-50/40">
          {loading && (
            <div className="text-center py-12 space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mx-auto"></div>
              <p className="text-xs text-slate-500">Loading complaints...</p>
            </div>
          )}

          {!loading && complaints.length === 0 && (
            <div className="text-center py-16 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <CheckCircle className="w-6 h-6 text-emerald-500" />
              </div>
              <h4 className="font-bold text-slate-800 text-sm">No Complaints Found</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                You haven't submitted any complaints under this filter. Everything looks smooth!
              </p>
            </div>
          )}

          {!loading &&
            complaints.map((c) => (
              <div
                key={c._id}
                onClick={() => setSelectedComplaint(c)}
                className={`p-3.5 rounded-xl border cursor-pointer transition space-y-2 ${
                  selectedComplaint?._id === c._id
                    ? 'bg-indigo-50/60 border-indigo-300 ring-2 ring-indigo-200/50 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-indigo-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                    {c.ticketId}
                  </span>
                  {getStatusBadge(c.status)}
                </div>

                <div>
                  <h4 className="font-bold text-xs text-slate-900 line-clamp-1">{c.title}</h4>
                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                    {c.description}
                  </p>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                  <span className="font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                    {formatCategory(c.category)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(c.createdAt).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            ))}
        </div>

        {/* Selected Complaint Detail (Right Col) */}
        <div className="lg:col-span-7 p-6 overflow-y-auto max-h-[650px] space-y-6 bg-white">
          {selectedComplaint ? (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg">
                      {selectedComplaint.ticketId}
                    </span>
                    {getStatusBadge(selectedComplaint.status)}
                    {getPriorityBadge(selectedComplaint.priority)}
                  </div>
                  <h3 className="font-bold text-base text-slate-900 mt-2">
                    {selectedComplaint.title}
                  </h3>
                  <span className="text-xs text-slate-400">
                    Submitted on {new Date(selectedComplaint.createdAt).toLocaleString()}
                  </span>
                </div>

                {/* Status Action Buttons for Student */}
                <div className="flex items-center gap-2">
                  {selectedComplaint.status === 'resolved' && (
                    <>
                      <button
                        onClick={() => handleConfirmResolution(selectedComplaint._id)}
                        disabled={submitting}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                      >
                        <CheckCheck className="w-3.5 h-3.5" /> Confirm Resolution
                      </button>
                      <button
                        onClick={() => setShowReopenModal(true)}
                        disabled={submitting}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Reopen Ticket
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Description & Entities */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Issue Description
                </h4>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {selectedComplaint.description}
                </div>

                {/* Optional linked transit entities */}
                {(selectedComplaint.bus || selectedComplaint.route || selectedComplaint.stop) && (
                  <div className="flex flex-wrap gap-3 pt-2">
                    {selectedComplaint.bus && (
                      <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-lg border border-slate-200 flex items-center gap-1.5">
                        <Bus className="w-3.5 h-3.5 text-blue-600" /> Bus:{' '}
                        {selectedComplaint.bus.busNumber}
                      </span>
                    )}
                    {selectedComplaint.route && (
                      <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-lg border border-slate-200 flex items-center gap-1.5">
                        <RouteIcon className="w-3.5 h-3.5 text-indigo-600" /> Route:{' '}
                        {selectedComplaint.route.name}
                      </span>
                    )}
                    {selectedComplaint.stop && (
                      <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-lg border border-slate-200 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Stop:{' '}
                        {selectedComplaint.stop.name}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Resolution Notes Box (if any) */}
              {selectedComplaint.resolutionNotes && (
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                    <CheckCircle className="w-4 h-4 text-blue-600" /> Resolution Notes from
                    Transport Admin
                  </div>
                  <p className="text-xs text-blue-800 leading-relaxed">
                    {selectedComplaint.resolutionNotes}
                  </p>
                  {selectedComplaint.resolvedAt && (
                    <span className="text-[10px] text-blue-500 block pt-1">
                      Resolved on {new Date(selectedComplaint.resolvedAt).toLocaleString()}
                    </span>
                  )}
                </div>
              )}

              {/* History / Audit Timeline */}
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-indigo-600" /> Ticket Activity & Status
                  History
                </h4>

                <div className="space-y-3 pl-2 border-l-2 border-slate-200 ml-2">
                  {selectedComplaint.history?.map((h, i) => (
                    <div key={i} className="relative pl-4 text-xs space-y-1">
                      <div className="absolute -left-[13px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-white"></div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 capitalize">
                          {h.action.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(h.timestamp).toLocaleString()}
                        </span>
                      </div>
                      {h.message && <p className="text-slate-600 text-[11px]">{h.message}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-24 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto text-indigo-500">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-800 text-sm">Select a Ticket</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Click on any complaint on the left panel to inspect resolution details, activity
                history, and status actions.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* New Complaint Submission Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <PlusCircle className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Submit Transport Complaint</h3>
              </div>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateComplaint} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bus 12 was 20 minutes late at Hostel 3"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs bg-white"
                  >
                    <option value="bus_delay">Bus Delay</option>
                    <option value="driver_behavior">Driver Behavior</option>
                    <option value="overcrowding">Overcrowding</option>
                    <option value="safety">Safety / Reckless Driving</option>
                    <option value="route_issue">Route / Missed Stop</option>
                    <option value="cleanliness">Bus Cleanliness</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs bg-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Provide complete details including time of incident, conditions, or specific concerns..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs resize-none"
                />
              </div>

              {/* Optional References */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1 text-[11px]">
                    Related Bus
                  </label>
                  <select
                    value={formData.bus}
                    onChange={(e) => setFormData({ ...formData, bus: e.target.value })}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-[11px] bg-white"
                  >
                    <option value="">None</option>
                    {buses.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.busNumber}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1 text-[11px]">
                    Related Route
                  </label>
                  <select
                    value={formData.route}
                    onChange={(e) => setFormData({ ...formData, route: e.target.value })}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-[11px] bg-white"
                  >
                    <option value="">None</option>
                    {routes.map((r) => (
                      <option key={r._id} value={r._id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1 text-[11px]">
                    Related Stop
                  </label>
                  <select
                    value={formData.stop}
                    onChange={(e) => setFormData({ ...formData, stop: e.target.value })}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-[11px] bg-white"
                  >
                    <option value="">None</option>
                    {stops.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl font-bold transition flex items-center gap-2 shadow-sm"
                >
                  {submitting ? 'Submitting...' : 'Submit Complaint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reopen Complaint Modal */}
      {showReopenModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-rose-600" /> Reopen Ticket{' '}
                {selectedComplaint?.ticketId}
              </h3>
              <button
                onClick={() => setShowReopenModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Please let us know why the proposed resolution was incomplete or how the issue
              persists:
            </p>

            <form onSubmit={handleReopenComplaint} className="space-y-4">
              <textarea
                required
                rows={3}
                placeholder="State why this ticket needs to be reopened..."
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 text-xs resize-none"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowReopenModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-1.5 text-xs font-bold rounded-lg transition shadow-sm"
                >
                  {submitting ? 'Reopening...' : 'Reopen Complaint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentComplaints;
