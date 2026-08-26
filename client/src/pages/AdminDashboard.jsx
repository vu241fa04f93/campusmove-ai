import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { CampusMap } from '../components/CampusMap';
import { Modal } from '../components/Modal';
import { StatCard } from '../components/StatCard';
import { busApi } from '../api/busApi';
import { routeApi } from '../api/routeApi';
import { stopApi } from '../api/stopApi';
import { scheduleApi } from '../api/scheduleApi';
import {
  Bus,
  MapPin,
  Navigation,
  Clock,
  Plus,
  Edit2,
  Trash2,
  Shield,
  Layers,
  Check,
  AlertCircle,
  Users,
} from 'lucide-react';

export const AdminDashboard = () => {
  const { user } = useAuth();

  // Tab State
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'buses', 'routes', 'stops', 'schedules'

  // Data States
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [stops, setStops] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState(''); // 'bus', 'route', 'stop', 'schedule'
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [formError, setFormError] = useState('');

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [busRes, routeRes, stopRes, schedRes] = await Promise.all([
        busApi.getAll(),
        routeApi.getAll(),
        stopApi.getAll(),
        scheduleApi.getAll(),
      ]);

      if (busRes.success) setBuses(busRes.data);
      if (routeRes.success) setRoutes(routeRes.data);
      if (stopRes.success) setStops(stopRes.data);
      if (schedRes.success) setSchedules(schedRes.data);
    } catch (err) {
      console.error('[AdminDashboard] Error fetching transport data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Modal Handlers
  const handleOpenAddModal = (type) => {
    setModalType(type);
    setEditingItem(null);
    setFormError('');

    if (type === 'bus') {
      setFormData({
        busNumber: `Bus ${buses.length + 10}`,
        plateNumber: `KA-01-EXP-${Math.floor(1000 + Math.random() * 9000)}`,
        model: 'Standard Campus Shuttle',
        capacity: 40,
        status: 'active',
        currentRoute: routes[0]?._id || '',
        statusMessage: 'Operating normally',
      });
    } else if (type === 'stop') {
      setFormData({
        name: '',
        code: '',
        description: '',
        lat: 28.545,
        lng: 77.192,
        campusZone: 'Academic Zone',
        amenities: 'Covered Shelter, Seating',
      });
    } else if (type === 'route') {
      setFormData({
        name: '',
        code: `R-${routes.length + 101}`,
        color: '#2563eb',
        description: '',
        totalDistanceKm: 3.0,
        estimatedDurationMinutes: 15,
      });
    } else if (type === 'schedule') {
      setFormData({
        route: routes[0]?._id || '',
        bus: buses[0]?._id || '',
        departureTime: '10:00',
        estimatedArrivalTime: '10:15',
        frequencyMinutes: 15,
        direction: 'outbound',
      });
    }

    setIsModalOpen(true);
  };

  const handleOpenEditModal = (type, item) => {
    setModalType(type);
    setEditingItem(item);
    setFormError('');

    if (type === 'bus') {
      setFormData({
        busNumber: item.busNumber,
        plateNumber: item.plateNumber,
        model: item.model,
        capacity: item.capacity,
        status: item.status,
        currentRoute: item.currentRoute?._id || item.currentRoute || '',
        statusMessage: item.statusMessage || '',
      });
    } else if (type === 'stop') {
      setFormData({
        name: item.name,
        code: item.code,
        description: item.description || '',
        lat: item.coordinates?.lat || 28.545,
        lng: item.coordinates?.lng || 77.192,
        campusZone: item.campusZone || 'Academic Zone',
        amenities: item.amenities ? item.amenities.join(', ') : '',
      });
    } else if (type === 'route') {
      setFormData({
        name: item.name,
        code: item.code,
        color: item.color || '#2563eb',
        description: item.description || '',
        totalDistanceKm: item.totalDistanceKm || 3.0,
        estimatedDurationMinutes: item.estimatedDurationMinutes || 15,
      });
    } else if (type === 'schedule') {
      setFormData({
        route: item.route?._id || item.route || '',
        bus: item.bus?._id || item.bus || '',
        departureTime: item.departureTime,
        estimatedArrivalTime: item.estimatedArrivalTime || '',
        frequencyMinutes: item.frequencyMinutes || 15,
        direction: item.direction || 'outbound',
      });
    }

    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      if (modalType === 'bus') {
        if (editingItem) {
          await busApi.update(editingItem._id, formData);
        } else {
          await busApi.create(formData);
        }
      } else if (modalType === 'stop') {
        const payload = {
          name: formData.name,
          code: formData.code,
          description: formData.description,
          coordinates: { lat: parseFloat(formData.lat), lng: parseFloat(formData.lng) },
          campusZone: formData.campusZone,
          amenities: formData.amenities ? formData.amenities.split(',').map((s) => s.trim()) : [],
        };
        if (editingItem) {
          await stopApi.update(editingItem._id, payload);
        } else {
          await stopApi.create(payload);
        }
      } else if (modalType === 'route') {
        if (editingItem) {
          await routeApi.update(editingItem._id, formData);
        } else {
          await routeApi.create(formData);
        }
      } else if (modalType === 'schedule') {
        if (editingItem) {
          await scheduleApi.update(editingItem._id, formData);
        } else {
          await scheduleApi.create(formData);
        }
      }

      setIsModalOpen(false);
      fetchAllData();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save changes. Check inputs.');
    }
  };

  const handleDelete = async (type, id) => {
    if (!window.confirm(`Are you sure you want to delete this ${type}?`)) return;
    try {
      if (type === 'bus') await busApi.delete(id);
      if (type === 'stop') await stopApi.delete(id);
      if (type === 'route') await routeApi.delete(id);
      if (type === 'schedule') await scheduleApi.delete(id);
      fetchAllData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete record.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Admin Header */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-purple-300 text-xs font-bold uppercase tracking-wider">
            <Shield className="w-4 h-4 text-purple-400" /> Central Transport Administration
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold mt-1">Operations & Fleet Manager</h1>
          <p className="text-xs text-purple-100/80 mt-1">
            Logged in as: <span className="font-bold text-white">{user?.name} (Transport Admin)</span>
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-1.5 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'overview' ? 'bg-purple-600 text-white shadow' : 'text-slate-300 hover:text-white'
            }`}
          >
            Live Overview
          </button>
          <button
            onClick={() => setActiveTab('buses')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
              activeTab === 'buses' ? 'bg-purple-600 text-white shadow' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Bus className="w-3.5 h-3.5" /> Buses ({buses.length})
          </button>
          <button
            onClick={() => setActiveTab('routes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
              activeTab === 'routes' ? 'bg-purple-600 text-white shadow' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" /> Routes ({routes.length})
          </button>
          <button
            onClick={() => setActiveTab('stops')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
              activeTab === 'stops' ? 'bg-purple-600 text-white shadow' : 'text-slate-300 hover:text-white'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" /> Stops ({stops.length})
          </button>
          <button
            onClick={() => setActiveTab('schedules')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
              activeTab === 'schedules' ? 'bg-purple-600 text-white shadow' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" /> Timetable ({schedules.length})
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Buses" value={buses.length} subtext="Fleet vehicles" icon={Bus} color="purple" />
        <StatCard title="Active Routes" value={routes.length} subtext="Campus corridors" icon={Navigation} color="blue" />
        <StatCard title="Designated Stops" value={stops.length} subtext="Campus-wide" icon={MapPin} color="emerald" />
        <StatCard title="Total Schedules" value={schedules.length} subtext="Daily services" icon={Clock} color="amber" />
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Campus Fleet Real-Time Map</h3>
                <p className="text-xs text-slate-500">Live positioning of operating fleet and active routes</p>
              </div>
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Live System Active
              </span>
            </div>

            <CampusMap stops={stops} routes={routes} buses={buses} height="h-[520px]" />
          </div>
        </div>
      )}

      {/* TAB 2: BUSES CRUD */}
      {activeTab === 'buses' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Fleet Bus Management</h3>
              <p className="text-xs text-slate-500">Register, inspect, and update campus fleet buses</p>
            </div>
            <button
              onClick={() => handleOpenAddModal('bus')}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-purple-600/20"
            >
              <Plus className="w-4 h-4" /> Add New Bus
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold tracking-wider border-y border-slate-200">
                <tr>
                  <th className="py-3 px-4">Bus Identifier</th>
                  <th className="py-3 px-4">Plate No.</th>
                  <th className="py-3 px-4">Model & Capacity</th>
                  <th className="py-3 px-4">Assigned Driver</th>
                  <th className="py-3 px-4">Assigned Route</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {buses.map((bus) => (
                  <tr key={bus._id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{bus.busNumber}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">{bus.plateNumber}</td>
                    <td className="py-3.5 px-4 text-slate-700">
                      {bus.model} ({bus.capacity} seats)
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">
                      {bus.currentDriver?.name || <span className="text-slate-400 italic">Unassigned</span>}
                    </td>
                    <td className="py-3.5 px-4 text-blue-600 font-semibold">
                      {bus.currentRoute?.name || 'None'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                          bus.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : bus.status === 'delayed'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {bus.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditModal('bus', bus)}
                          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete('bus', bus._id)}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ROUTES CRUD */}
      {activeTab === 'routes' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Campus Bus Routes</h3>
              <p className="text-xs text-slate-500">Configure route paths, stops sequence, and durations</p>
            </div>
            <button
              onClick={() => handleOpenAddModal('route')}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-purple-600/20"
            >
              <Plus className="w-4 h-4" /> Add Route
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {routes.map((route) => (
              <div key={route._id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className="px-2.5 py-1 rounded text-xs font-bold text-white"
                      style={{ backgroundColor: route.color || '#2563eb' }}
                    >
                      {route.code}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditModal('route', route)}
                        className="p-1.5 rounded text-slate-600 hover:bg-slate-200 transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete('route', route._id)}
                        className="p-1.5 rounded text-rose-600 hover:bg-rose-100 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <h4 className="font-bold text-slate-900 text-base mt-2">{route.name}</h4>
                  <p className="text-xs text-slate-500 mt-1">{route.description}</p>
                  <div className="mt-3 flex items-center gap-4 text-xs font-semibold text-slate-700">
                    <span>📏 {route.totalDistanceKm || 3.2} km</span>
                    <span>⏱️ ~{route.estimatedDurationMinutes || 15} mins</span>
                    <span>📍 {route.stops?.length || 0} stops</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: STOPS CRUD */}
      {activeTab === 'stops' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Campus Stops Directory</h3>
              <p className="text-xs text-slate-500">Manage GPS coordinates, zones, and stop amenities</p>
            </div>
            <button
              onClick={() => handleOpenAddModal('stop')}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-purple-600/20"
            >
              <Plus className="w-4 h-4" /> Add Stop
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold tracking-wider border-y border-slate-200">
                <tr>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Stop Name</th>
                  <th className="py-3 px-4">Campus Zone</th>
                  <th className="py-3 px-4">GPS Coordinates</th>
                  <th className="py-3 px-4">Amenities</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stops.map((stop) => (
                  <tr key={stop._id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-blue-600">{stop.code}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{stop.name}</td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {stop.campusZone}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">
                      {stop.coordinates?.lat?.toFixed(4)}, {stop.coordinates?.lng?.toFixed(4)}
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-[11px]">
                      {stop.amenities?.join(', ') || 'Standard'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditModal('stop', stop)}
                          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete('stop', stop._id)}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: SCHEDULES CRUD */}
      {activeTab === 'schedules' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Schedule Timetable Management</h3>
              <p className="text-xs text-slate-500">Configure departures, route alignments, and frequencies</p>
            </div>
            <button
              onClick={() => handleOpenAddModal('schedule')}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-purple-600/20"
            >
              <Plus className="w-4 h-4" /> Add Schedule
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold tracking-wider border-y border-slate-200">
                <tr>
                  <th className="py-3 px-4">Route</th>
                  <th className="py-3 px-4">Assigned Bus</th>
                  <th className="py-3 px-4">Departure</th>
                  <th className="py-3 px-4">Est. Arrival</th>
                  <th className="py-3 px-4">Frequency</th>
                  <th className="py-3 px-4">Direction</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {schedules.map((sch) => (
                  <tr key={sch._id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {sch.route?.name} ({sch.route?.code})
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">
                      {sch.bus?.busNumber}
                    </td>
                    <td className="py-3 px-4 font-bold text-purple-600 text-sm">
                      {sch.departureTime}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">
                      {sch.estimatedArrivalTime || '--'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      Every {sch.frequencyMinutes}m
                    </td>
                    <td className="py-3 px-4 uppercase text-[10px] font-bold text-slate-500">
                      {sch.direction}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditModal('schedule', sch)}
                          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete('schedule', sch._id)}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reusable CRUD Modal Form */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`${editingItem ? 'Edit' : 'Add New'} ${modalType.toUpperCase()}`}
      >
        {formError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
            {formError}
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
          {/* BUS FORM */}
          {modalType === 'bus' && (
            <>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Bus Number / Name</label>
                <input
                  type="text"
                  required
                  value={formData.busNumber || ''}
                  onChange={(e) => setFormData({ ...formData, busNumber: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Plate Number</label>
                <input
                  type="text"
                  required
                  value={formData.plateNumber || ''}
                  onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Model</label>
                  <input
                    type="text"
                    value={formData.model || ''}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Capacity</label>
                  <input
                    type="number"
                    value={formData.capacity || 40}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Status</label>
                <select
                  value={formData.status || 'active'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                >
                  <option value="active">Active</option>
                  <option value="delayed">Delayed</option>
                  <option value="breakdown">Breakdown</option>
                  <option value="out_of_service">Out of Service</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Assigned Route</label>
                <select
                  value={formData.currentRoute || ''}
                  onChange={(e) => setFormData({ ...formData, currentRoute: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                >
                  <option value="">None</option>
                  {routes.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.name} ({r.code})
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* STOP FORM */}
          {modalType === 'stop' && (
            <>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Stop Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Science Block South"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Stop Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SCI-S"
                    value={formData.code || ''}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Campus Zone</label>
                  <select
                    value={formData.campusZone || 'Academic Zone'}
                    onChange={(e) => setFormData({ ...formData, campusZone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  >
                    <option value="Academic Zone">Academic Zone</option>
                    <option value="Hostels">Hostels</option>
                    <option value="Administrative">Administrative</option>
                    <option value="Recreational">Recreational</option>
                    <option value="Main Entrance">Main Entrance</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.lat || 28.545}
                    onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.lng || 77.192}
                    onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Amenities (comma-separated)</label>
                <input
                  type="text"
                  placeholder="Covered Shelter, Seating, Lighting"
                  value={formData.amenities || ''}
                  onChange={(e) => setFormData({ ...formData, amenities: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>
            </>
          )}

          {/* ROUTE FORM */}
          {modalType === 'route' && (
            <>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Route Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Science - Sports Shuttle"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Route Code</label>
                  <input
                    type="text"
                    required
                    value={formData.code || ''}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Color Theme (HEX)</label>
                  <input
                    type="color"
                    value={formData.color || '#2563eb'}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full h-9 p-1 rounded-lg border border-slate-300"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Est. Duration (Mins)</label>
                  <input
                    type="number"
                    value={formData.estimatedDurationMinutes || 15}
                    onChange={(e) => setFormData({ ...formData, estimatedDurationMinutes: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Distance (KM)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.totalDistanceKm || 3.0}
                    onChange={(e) => setFormData({ ...formData, totalDistanceKm: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
              </div>
            </>
          )}

          {/* SCHEDULE FORM */}
          {modalType === 'schedule' && (
            <>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Route</label>
                <select
                  required
                  value={formData.route || ''}
                  onChange={(e) => setFormData({ ...formData, route: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                >
                  {routes.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.name} ({r.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Bus</label>
                <select
                  required
                  value={formData.bus || ''}
                  onChange={(e) => setFormData({ ...formData, bus: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                >
                  {buses.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.busNumber} ({b.plateNumber})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Departure Time</label>
                  <input
                    type="time"
                    required
                    value={formData.departureTime || '08:30'}
                    onChange={(e) => setFormData({ ...formData, departureTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Est. Arrival Time</label>
                  <input
                    type="time"
                    value={formData.estimatedArrivalTime || '08:45'}
                    onChange={(e) => setFormData({ ...formData, estimatedArrivalTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md"
            >
              {editingItem ? 'Save Changes' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
