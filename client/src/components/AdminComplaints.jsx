import React, { useState, useEffect } from 'react';
import { complaintApi } from '../api/complaintApi';
import {
  MessageSquare,
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertCircle,
  CheckCheck,
  RotateCcw,
  User,
  Bus,
  Route as RouteIcon,
  MapPin,
  History,
  X,
  Send,
  Eye,
} from 'lucide-react';

export const AdminComplaints = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (priorityFilter !== 'all') params.priority = priorityFilter;
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await complaintApi.getAll(params);
      if (res.success && res.data) {
        setComplaints(res.data);
        if (selectedComplaint) {
          const updated = res.data.find((c) => c._id === selectedComplaint._id);
          if (updated) setSelectedComplaint(updated);
        }
      }
    } catch (err) {
      console.error('[AdminComplaints] Error fetching complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [statusFilter, priorityFilter, categoryFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchComplaints();
  };

  const handleStatusChange = async (complaintId, newStatus) => {
    try {
      setSubmitting(true);
      const res = await complaintApi.update(complaintId, { status: newStatus });
      if (res.success) {
        fetchComplaints();
      }
    } catch (err) {
      console.error('[AdminComplaints] Error updating status:', err);
      alert('Failed to update status.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    if (!resolutionNotes.trim()) {
      alert('Please provide resolution details/notes.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await complaintApi.resolve(selectedComplaint._id, {
        resolutionNotes: resolutionNotes.trim(),
      });
      if (res.success) {
        setShowResolveModal(false);
        setResolutionNotes('');
        fetchComplaints();
      }
    } catch (err) {
      console.error('[AdminComplaints] Error resolving complaint:', err);
      alert('Failed to resolve complaint.');
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

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[650px] flex flex-col">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white">Campus Transport Complaint Dispatch</h3>
            <p className="text-xs text-slate-400">
              Review, assign, resolve, and audit student transport feedback & service tickets
            </p>
          </div>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search ticket, title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs"
          >
            Search
          </button>
        </form>
      </div>

      {/* Filter Bar */}
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
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="confirmed">Confirmed</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold uppercase text-slate-400">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-2 py-1 rounded-lg border border-slate-300 bg-white font-medium text-xs"
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold uppercase text-slate-400">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2 py-1 rounded-lg border border-slate-300 bg-white font-medium text-xs"
            >
              <option value="all">All Categories</option>
              <option value="bus_delay">Bus Delay</option>
              <option value="driver_behavior">Driver Behavior</option>
              <option value="overcrowding">Overcrowding</option>
              <option value="safety">Safety</option>
              <option value="route_issue">Route Issue</option>
              <option value="cleanliness">Cleanliness</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <button
          onClick={fetchComplaints}
          className="text-xs text-blue-600 hover:underline font-bold"
        >
          Refresh ({complaints.length})
        </button>
      </div>

      {/* Split View */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Table / List */}
        <div className="lg:col-span-6 border-r border-slate-200 overflow-y-auto max-h-[650px] p-3 space-y-2 bg-slate-50/40">
          {loading && (
            <div className="text-center py-12 space-y-2">
              <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mx-auto"></div>
              <p className="text-xs text-slate-500">Loading complaints...</p>
            </div>
          )}

          {!loading && complaints.length === 0 && (
            <div className="text-center py-16 space-y-2">
              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
              <h4 className="font-bold text-slate-800 text-sm">No Complaints Match Filters</h4>
            </div>
          )}

          {!loading &&
            complaints.map((c) => (
              <div
                key={c._id}
                onClick={() => setSelectedComplaint(c)}
                className={`p-3.5 rounded-xl border cursor-pointer transition space-y-2 ${
                  selectedComplaint?._id === c._id
                    ? 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-200/50 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-blue-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                      {c.ticketId}
                    </span>
                    {getPriorityBadge(c.priority)}
                  </div>
                  {getStatusBadge(c.status)}
                </div>

                <div>
                  <h4 className="font-bold text-xs text-slate-900 line-clamp-1">{c.title}</h4>
                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{c.description}</p>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                  <span className="flex items-center gap-1 text-slate-700 font-semibold">
                    <User className="w-3 h-3 text-slate-400" /> {c.student?.name || 'Student'} (
                    {c.student?.hostel || 'Campus'})
                  </span>
                  <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
        </div>

        {/* Selected Complaint Admin Detail Panel */}
        <div className="lg:col-span-6 p-6 overflow-y-auto max-h-[650px] space-y-6 bg-white">
          {selectedComplaint ? (
            <div className="space-y-6 text-xs">
              {/* Header */}
              <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
                      {selectedComplaint.ticketId}
                    </span>
                    {getStatusBadge(selectedComplaint.status)}
                    {getPriorityBadge(selectedComplaint.priority)}
                  </div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 mt-2">
                    {selectedComplaint.title}
                  </h3>
                  <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                    <span>Submitted by {selectedComplaint.student?.name}</span>
                    <span>•</span>
                    <span>{new Date(selectedComplaint.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                {/* Status Action Buttons for Admin */}
                <div className="flex flex-wrap items-center gap-2">
                  {selectedComplaint.status === 'open' && (
                    <button
                      onClick={() => handleStatusChange(selectedComplaint._id, 'in_progress')}
                      disabled={submitting}
                      className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1 shadow-xs"
                    >
                      <Clock className="w-3.5 h-3.5" /> Move to In Progress
                    </button>
                  )}

                  {selectedComplaint.status !== 'resolved' &&
                    selectedComplaint.status !== 'confirmed' && (
                      <button
                        onClick={() => setShowResolveModal(true)}
                        disabled={submitting}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1 shadow-xs"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Resolve Ticket
                      </button>
                    )}
                </div>
              </div>

              {/* Student & Route Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Student</span>
                  <p className="font-bold text-slate-800">{selectedComplaint.student?.name}</p>
                  <p className="text-slate-500 text-[11px]">{selectedComplaint.student?.email}</p>
                  <p className="text-slate-500 text-[11px]">
                    {selectedComplaint.student?.hostel} • {selectedComplaint.student?.department}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    Linked Transit Entities
                  </span>
                  <p className="text-slate-700">
                    Bus: {selectedComplaint.bus?.busNumber || 'None'}
                  </p>
                  <p className="text-slate-700">
                    Route: {selectedComplaint.route?.name || 'None'}
                  </p>
                  <p className="text-slate-700">
                    Stop: {selectedComplaint.stop?.name || 'None'}
                  </p>
                </div>
              </div>

              {/* Full Description */}
              <div className="space-y-2">
                <h4 className="font-bold uppercase tracking-wider text-slate-500 text-[10px]">
                  Description
                </h4>
                <div className="p-4 rounded-xl bg-white border border-slate-200 text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {selectedComplaint.description}
                </div>
              </div>

              {/* Resolution Notes (if any) */}
              {selectedComplaint.resolutionNotes && (
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-blue-900">
                    <CheckCircle className="w-4 h-4 text-blue-600" /> Admin Resolution Note
                  </div>
                  <p className="text-blue-800 leading-relaxed">
                    {selectedComplaint.resolutionNotes}
                  </p>
                </div>
              )}

              {/* Activity Audit Timeline */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <h4 className="font-bold uppercase tracking-wider text-slate-500 text-[10px] flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-blue-600" /> Ticket Activity & Audit Log
                </h4>

                <div className="space-y-3 pl-2 border-l-2 border-slate-200 ml-2">
                  {selectedComplaint.history?.map((h, i) => (
                    <div key={i} className="relative pl-4 space-y-1">
                      <div className="absolute -left-[13px] top-1 w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-white"></div>
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
              <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-700 text-sm">Select a Complaint</h4>
              <p className="text-xs text-slate-400">
                Choose a ticket from the left column to view student details, take action, or resolve.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Admin Resolution Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-blue-600" /> Resolve Ticket{' '}
                {selectedComplaint?.ticketId}
              </h3>
              <button
                onClick={() => setShowResolveModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResolveSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Resolution Notes / Action Taken *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Explain corrective actions taken, driver briefing, route adjustments, or investigation findings..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs resize-none"
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
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 font-bold rounded-lg transition shadow-sm"
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

export default AdminComplaints;
