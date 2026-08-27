import React, { useState, useEffect } from 'react';
import { alertApi } from '../api/alertApi';
import { socketService } from '../services/socketService';
import {
  Bell,
  BellRing,
  AlertTriangle,
  Info,
  CheckCircle,
  MapPin,
  Bus,
  Clock,
  Settings,
  Filter,
  CheckCheck,
  ShieldAlert,
  Radio,
  Sparkles,
  Navigation,
  ChevronRight,
} from 'lucide-react';

export const AlertsPanel = ({
  stops = [],
  buses = [],
  onSelectRoute,
  onSelectStop,
  onSelectBus,
  onFocusMap,
}) => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all'); // 'all', 'unread', 'delays', 'geofence'
  const [unreadCount, setUnreadCount] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState({
    notifyBusDelays: true,
    notifyBusArrival: true,
    notifyRouteUpdates: true,
    notifyGeofence: true,
  });
  const [savingPrefs, setSavingPrefs] = useState(false);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await alertApi.getAll({
        unreadOnly: filterType === 'unread' ? 'true' : 'false',
        type:
          filterType === 'delays'
            ? 'bus_delayed'
            : filterType === 'geofence'
            ? 'geofence_entered'
            : undefined,
      });

      if (res.success && res.data) {
        setAlerts(res.data);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch (err) {
      console.error('[AlertsPanel] Failed to fetch alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPreferences = async () => {
    try {
      const res = await alertApi.getPreferences();
      if (res.success && res.data) {
        setPreferences({
          notifyBusDelays: res.data.notifyBusDelays ?? true,
          notifyBusArrival: res.data.notifyBusArrival ?? true,
          notifyRouteUpdates: res.data.notifyRouteUpdates ?? true,
          notifyGeofence: res.data.notifyGeofence ?? true,
        });
      }
    } catch (err) {
      console.error('[AlertsPanel] Failed to fetch preferences:', err);
    }
  };

  useEffect(() => {
    fetchAlerts();
    fetchPreferences();

    // Real-time listener for incoming alerts
    const unsubAlert = socketService.onAlertNew((newAlert) => {
      setAlerts((prev) => [newAlert, ...prev.filter((a) => a._id !== newAlert._id)]);
      setUnreadCount((prev) => prev + 1);
    });

    return () => {
      unsubAlert();
    };
  }, [filterType]);

  const handleMarkAsRead = async (alertId) => {
    try {
      await alertApi.markAsRead(alertId);
      setAlerts((prev) =>
        prev.map((a) => (a._id === alertId ? { ...a, isRead: true } : a))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('[AlertsPanel] Error marking alert as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await alertApi.markAllAsRead();
      setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('[AlertsPanel] Error marking all alerts as read:', err);
    }
  };

  const handleSavePreferences = async () => {
    try {
      setSavingPrefs(true);
      await alertApi.updatePreferences(preferences);
      setShowSettings(false);
    } catch (err) {
      console.error('[AlertsPanel] Error saving preferences:', err);
    } finally {
      setSavingPrefs(false);
    }
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'critical':
        return (
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1">
            <ShieldAlert className="w-3 h-3" /> Critical
          </span>
        );
      case 'warning':
        return (
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Warning
          </span>
        );
      case 'info':
      default:
        return (
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 flex items-center gap-1">
            <Info className="w-3 h-3" /> Proximity & Status
          </span>
        );
    }
  };

  const getTypeIcon = (type, severity) => {
    switch (type) {
      case 'geofence_entered':
      case 'bus_arriving':
        return <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />;
      case 'bus_delayed':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case 'trip_started':
      case 'trip_ended':
        return <Bus className="w-4 h-4 text-blue-600" />;
      default:
        return severity === 'critical' ? (
          <ShieldAlert className="w-4 h-4 text-rose-600" />
        ) : (
          <Bell className="w-4 h-4 text-indigo-600" />
        );
    }
  };

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return 'Just now';
    const date = new Date(timestamp);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-rose-300 shadow-sm">
            <BellRing className="w-5 h-5 text-rose-300 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-white">Smart Push Alerts & Geofences</h3>
              {unreadCount > 0 && (
                <span className="text-[11px] font-black bg-rose-500 text-white px-2 py-0.5 rounded-full shadow-xs">
                  {unreadCount} Unread
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300">
              Proactive stop geofence arrivals, delay warnings, and operational dispatches
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <CheckCheck className="w-3.5 h-3.5" /> Mark all read
            </button>
          )}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white p-2 rounded-xl text-xs font-bold transition flex items-center gap-1"
            title="Notification Preferences"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Preferences Drawer / Modal */}
      {showSettings && (
        <div className="bg-slate-50 border-b border-slate-200 p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5 text-blue-600" /> Student Notification Subscriptions
            </h4>
            <span className="text-[11px] text-slate-400">Controls real-time broadcast triggers</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-slate-200 cursor-pointer hover:border-blue-300 transition">
              <input
                type="checkbox"
                checked={preferences.notifyGeofence}
                onChange={(e) =>
                  setPreferences({ ...preferences, notifyGeofence: e.target.checked })
                }
                className="w-4 h-4 text-blue-600 rounded"
              />
              <div>
                <span className="font-bold text-slate-800">Geofence Arrivals</span>
                <p className="text-[10px] text-slate-500">Alert when bus is within 200m</p>
              </div>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-slate-200 cursor-pointer hover:border-blue-300 transition">
              <input
                type="checkbox"
                checked={preferences.notifyBusDelays}
                onChange={(e) =>
                  setPreferences({ ...preferences, notifyBusDelays: e.target.checked })
                }
                className="w-4 h-4 text-blue-600 rounded"
              />
              <div>
                <span className="font-bold text-slate-800">Bus Delay Notices</span>
                <p className="text-[10px] text-slate-500">Traffic & breakdown updates</p>
              </div>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-slate-200 cursor-pointer hover:border-blue-300 transition">
              <input
                type="checkbox"
                checked={preferences.notifyBusArrival}
                onChange={(e) =>
                  setPreferences({ ...preferences, notifyBusArrival: e.target.checked })
                }
                className="w-4 h-4 text-blue-600 rounded"
              />
              <div>
                <span className="font-bold text-slate-800">Upcoming Stop ETAs</span>
                <p className="text-[10px] text-slate-500">Approaching student hostel stops</p>
              </div>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-slate-200 cursor-pointer hover:border-blue-300 transition">
              <input
                type="checkbox"
                checked={preferences.notifyRouteUpdates}
                onChange={(e) =>
                  setPreferences({ ...preferences, notifyRouteUpdates: e.target.checked })
                }
                className="w-4 h-4 text-blue-600 rounded"
              />
              <div>
                <span className="font-bold text-slate-800">Trip Start / End</span>
                <p className="text-[10px] text-slate-500">Daily fleet operational alerts</p>
              </div>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setShowSettings(false)}
              className="px-3 py-1.5 text-xs text-slate-600 font-bold hover:bg-slate-200 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSavePreferences}
              disabled={savingPrefs}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 text-xs font-bold rounded-lg transition shadow-sm"
            >
              {savingPrefs ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 overflow-x-auto text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 px-2 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filter:
          </span>
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 rounded-lg font-bold transition ${
              filterType === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            All Alerts ({alerts.length})
          </button>
          <button
            onClick={() => setFilterType('unread')}
            className={`px-3 py-1 rounded-lg font-bold transition ${
              filterType === 'unread'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            Unread Only {unreadCount > 0 && `(${unreadCount})`}
          </button>
          <button
            onClick={() => setFilterType('geofence')}
            className={`px-3 py-1 rounded-lg font-bold transition ${
              filterType === 'geofence'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            Proximity / Geofences
          </button>
          <button
            onClick={() => setFilterType('delays')}
            className={`px-3 py-1 rounded-lg font-bold transition ${
              filterType === 'delays'
                ? 'bg-amber-700 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            Delays & Warnings
          </button>
        </div>

        <button
          onClick={fetchAlerts}
          className="text-xs text-blue-600 hover:underline font-semibold flex items-center gap-1 pr-2"
        >
          Refresh Feed
        </button>
      </div>

      {/* Alert Feed Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/40">
        {loading && (
          <div className="text-center py-12 space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-rose-500 border-t-transparent animate-spin mx-auto"></div>
            <p className="text-xs text-slate-500 font-medium">Checking live campus dispatch...</p>
          </div>
        )}

        {!loading && alerts.length === 0 && (
          <div className="text-center py-16 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <CheckCircle className="w-7 h-7 text-emerald-500" />
            </div>
            <h4 className="font-bold text-slate-800 text-sm">No Active Alerts</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              All campus shuttles are operating smoothly with no current delay warnings or geofence arrival triggers.
            </p>
          </div>
        )}

        {!loading &&
          alerts.map((alert) => (
            <div
              key={alert._id}
              className={`p-4 rounded-2xl border transition shadow-xs space-y-2.5 ${
                alert.isRead
                  ? 'bg-white border-slate-200 opacity-80'
                  : 'bg-white border-rose-200 ring-1 ring-rose-100/60 shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-xl mt-0.5 ${
                      alert.severity === 'critical'
                        ? 'bg-rose-50 border border-rose-200 text-rose-600'
                        : alert.severity === 'warning'
                        ? 'bg-amber-50 border border-amber-200 text-amber-700'
                        : 'bg-blue-50 border border-blue-200 text-blue-600'
                    }`}
                  >
                    {getTypeIcon(alert.type, alert.severity)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900">{alert.title}</h4>
                      {!alert.isRead && (
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                      )}
                      {getSeverityBadge(alert.severity)}
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{alert.message}</p>
                  </div>
                </div>

                <div className="text-right flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {formatRelativeTime(alert.createdAt)}
                  </span>
                  {!alert.isRead && (
                    <button
                      onClick={() => handleMarkAsRead(alert._id)}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>

              {/* Action metadata bar if bus or stop attached */}
              {(alert.bus || alert.stop || alert.route) && (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <div className="flex items-center gap-3">
                    {alert.bus && (
                      <span className="flex items-center gap-1 font-semibold text-slate-700">
                        <Bus className="w-3.5 h-3.5 text-blue-600" /> {alert.bus.busNumber}
                      </span>
                    )}
                    {alert.stop && (
                      <span className="flex items-center gap-1 font-semibold text-slate-700">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" /> {alert.stop.name}
                      </span>
                    )}
                    {alert.metadata?.distanceMeters && (
                      <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                        📍 {alert.metadata.distanceMeters}m away
                      </span>
                    )}
                  </div>

                  {onFocusMap && (
                    <button
                      onClick={onFocusMap}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Navigation className="w-3 h-3" /> View Map
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
};

export default AlertsPanel;
