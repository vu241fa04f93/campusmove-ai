import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { CampusMap } from '../components/CampusMap';
import { TripPlanner } from '../components/TripPlanner';
import { AssistantChat } from '../components/AssistantChat';
import { AlertsPanel } from '../components/AlertsPanel';
import { StudentComplaints } from '../components/StudentComplaints';
import { StatCard } from '../components/StatCard';
import { stopApi } from '../api/stopApi';
import { routeApi } from '../api/routeApi';
import { busApi } from '../api/busApi';
import { scheduleApi } from '../api/scheduleApi';
import { alertApi } from '../api/alertApi';
import { socketService } from '../services/socketService';
import { formatSpeed, formatETA, formatDistance } from '../utils/etaCalculator';
import {
  Bus,
  MapPin,
  Clock,
  Navigation,
  Sparkles,
  Bot,
  BellRing,
  MessageSquare,
  Info,
  Calendar,
  Layers,
  Search,
  CheckCircle,
  Radio,
  Gauge,
} from 'lucide-react';

export const StudentHome = () => {
  const { user } = useAuth();
  const [stops, setStops] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [buses, setBuses] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter & Selection states
  const [selectedStop, setSelectedStop] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [selectedBus, setSelectedBus] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('map'); // 'map', 'routes', 'schedules'
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [stopsRes, routesRes, busesRes, schedRes, alertsRes] = await Promise.all([
        stopApi.getAll(),
        routeApi.getAll(),
        busApi.getAll(),
        scheduleApi.getAll(),
        alertApi.getAll({ unreadOnly: true }),
      ]);

      if (stopsRes.success) setStops(stopsRes.data);
      if (routesRes.success) setRoutes(routesRes.data);
      if (busesRes.success) setBuses(busesRes.data);
      if (schedRes.success) setSchedules(schedRes.data);
      if (alertsRes.success) setUnreadAlertCount(alertsRes.unreadCount || 0);
    } catch (err) {
      console.error('[StudentHome] Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    socketService.connect();

    // Listen for live location broadcasts to update local fleet list
    const unsubLocation = socketService.onLocationBroadcast((data) => {
      setBuses((prev) =>
        prev.map((b) => {
          if (b._id === data.busId) {
            return {
              ...b,
              lastKnownLocation: {
                ...b.lastKnownLocation,
                lat: data.coordinates.lat,
                lng: data.coordinates.lng,
                speed: data.speed,
                heading: data.heading,
                accuracy: data.accuracy,
                updatedAt: new Date(),
              },
              status: data.status || b.status,
              statusMessage: data.statusMessage || b.statusMessage,
              isTripActive: data.isTripActive,
              isLive: true,
              isSimulated: data.isSimulated,
              etas: data.etas || [],
            };
          }
          return b;
        })
      );
    });

    const unsubStatus = socketService.onStatusUpdated((data) => {
      setBuses((prev) =>
        prev.map((b) => {
          if (b._id === data.busId) {
            return {
              ...b,
              status: data.status,
              statusMessage: data.statusMessage || b.statusMessage,
              etas: data.etas || b.etas,
            };
          }
          return b;
        })
      );
    });

    const unsubStart = socketService.onTripStarted((data) => {
      setBuses((prev) =>
        prev.map((b) => {
          if (b._id === data.busId) {
            return {
              ...b,
              isTripActive: true,
              isLive: true,
              isSimulated: data.isSimulated,
              status: 'active',
            };
          }
          return b;
        })
      );
    });

    const unsubEnd = socketService.onTripEnded((data) => {
      setBuses((prev) =>
        prev.map((b) => {
          if (b._id === data.busId) {
            return {
              ...b,
              isTripActive: false,
              isLive: false,
              status: 'out_of_service',
            };
          }
          return b;
        })
      );
    });

    return () => {
      unsubLocation();
      unsubStatus();
      unsubStart();
      unsubEnd();
    };
  }, []);

  const activeBusesCount = buses.filter((b) => b.status === 'active').length;

  const filteredStops = stops.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.campusZone.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Student Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-200 text-xs font-bold uppercase tracking-wider">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" /> Live Real-Time Campus Tracking
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold mt-1">
            Welcome, {user?.name || 'Student'}!
          </h1>
          <p className="text-sm text-blue-100/80 mt-1">
            Residence: <span className="font-semibold text-white">{user?.profile?.hostel || 'Hostel 3'}</span> • Department:{' '}
            <span className="font-semibold text-white">{user?.profile?.department || 'Computer Science'}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('alerts')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 relative ${
              activeTab === 'alerts' ? 'bg-white text-rose-950 shadow-md ring-2 ring-rose-300' : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            <BellRing className="w-4 h-4 text-rose-300" /> Push Alerts & Geofences
            {unreadAlertCount > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full ml-1 animate-pulse">
                {unreadAlertCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('assistant')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'assistant' ? 'bg-white text-indigo-950 shadow-md ring-2 ring-indigo-300' : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            <Bot className="w-4 h-4 text-cyan-300" /> AI Assistant
          </button>
          <button
            onClick={() => setActiveTab('plan')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'plan' ? 'bg-white text-blue-900 shadow-md ring-2 ring-blue-300' : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-300" /> Plan a Trip
          </button>
          <button
            onClick={() => setActiveTab('map')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'map' ? 'bg-white text-blue-900 shadow-md' : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            <Navigation className="w-4 h-4" /> Live Campus Map
          </button>
          <button
            onClick={() => setActiveTab('routes')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'routes' ? 'bg-white text-blue-900 shadow-md' : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            <Layers className="w-4 h-4" /> Routes & Stops
          </button>
          <button
            onClick={() => setActiveTab('schedules')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'schedules' ? 'bg-white text-blue-900 shadow-md' : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            <Calendar className="w-4 h-4" /> Bus Timetable
          </button>
          <button
            onClick={() => setActiveTab('complaints')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'complaints' ? 'bg-white text-indigo-950 shadow-md ring-2 ring-indigo-300' : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-purple-300" /> Complaints & Tickets
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Buses"
          value={`${activeBusesCount} / ${buses.length}`}
          subtext="Broadcasting real-time GPS"
          icon={Bus}
          color="emerald"
        />
        <StatCard
          title="Campus Stops"
          value={stops.length}
          subtext="Covering all zones"
          icon={MapPin}
          color="blue"
        />
        <StatCard
          title="Campus Routes"
          value={routes.length}
          subtext="Express & Shuttles"
          icon={Navigation}
          color="purple"
        />
        <StatCard
          title="Scheduled Trips"
          value={schedules.length}
          subtext="Operating daily"
          icon={Clock}
          color="amber"
        />
      </div>

      {/* Main Content Area */}
      {activeTab === 'map' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left / Top: Interactive Map */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-blue-600" /> Interactive Campus Map
                  </h3>
                  <p className="text-xs text-slate-500">
                    Live GPS positions update automatically via WebSockets
                  </p>
                </div>
                {(selectedStop || selectedBus) && (
                  <button
                    onClick={() => {
                      setSelectedStop(null);
                      setSelectedBus(null);
                    }}
                    className="text-xs text-blue-600 font-semibold hover:underline"
                  >
                    Reset Map Focus
                  </button>
                )}
              </div>

              <CampusMap
                stops={stops}
                routes={routes}
                buses={buses}
                selectedStop={selectedStop}
                selectedRoute={selectedRoute}
                selectedBus={selectedBus}
                onSelectStop={(stop) => {
                  setSelectedStop(stop);
                  setSelectedBus(null);
                }}
                onSelectBus={(bus) => {
                  setSelectedBus(bus);
                  setSelectedStop(null);
                }}
                height="h-[500px]"
              />
            </div>
          </div>

          {/* Right: Quick Stops & Bus Status */}
          <div className="space-y-4">
            {/* Live Bus Status Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Bus className="w-4 h-4 text-emerald-600" /> Operating Fleet Status
                </h3>
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Live Feed
                </span>
              </div>

              <div className="space-y-3">
                {buses.map((bus) => {
                  const isSelected = selectedBus?._id === bus._id || selectedBus?.busId === bus._id;
                  return (
                    <div
                      key={bus._id}
                      onClick={() => {
                        setSelectedBus(bus);
                        setSelectedStop(null);
                      }}
                      className={`p-3 rounded-xl border transition cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50/80 border-blue-400 shadow-sm'
                          : 'bg-slate-50 border-slate-100 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{bus.busNumber}</span>
                          <span className="text-[10px] text-slate-500 font-mono bg-white px-1.5 py-0.5 rounded border">
                            {bus.plateNumber}
                          </span>
                          {bus.isSimulated && (
                            <span className="text-[9px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">
                              SIMULATED
                            </span>
                          )}
                        </div>
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
                      </div>

                      <p className="text-xs text-slate-600 mt-1">
                        Route: <span className="font-medium">{bus.currentRoute?.name || 'General Campus Line'}</span>
                      </p>

                      <div className="flex items-center justify-between mt-1.5 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          <Gauge className="w-3 h-3 text-blue-600" />
                          {formatSpeed(bus.lastKnownLocation?.speed)}
                        </span>
                        <span className="italic truncate max-w-[150px]">
                          💬 {bus.statusMessage || 'Operating normally'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Stop / Bus Details Card */}
            {selectedBus ? (
              <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-5 rounded-2xl shadow-md space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bus className="w-5 h-5 text-blue-400" />
                    <h4 className="font-bold text-white text-base">{selectedBus.busNumber}</h4>
                  </div>
                  <span className="font-mono text-xs text-slate-300 bg-white/10 px-2 py-0.5 rounded">
                    {selectedBus.plateNumber}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="bg-white/5 p-2 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Speed</span>
                    <p className="font-black text-white text-sm mt-0.5">
                      {formatSpeed(selectedBus.lastKnownLocation?.speed || selectedBus.speed)}
                    </p>
                  </div>
                  <div className="bg-white/5 p-2 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Heading</span>
                    <p className="font-black text-white text-sm mt-0.5">
                      {Math.round(selectedBus.lastKnownLocation?.heading || selectedBus.heading || 0)}°
                    </p>
                  </div>
                </div>

                <div className="bg-white/10 p-2.5 rounded-xl text-xs">
                  <p className="text-[10px] text-slate-300 font-bold uppercase">Driver Note</p>
                  <p className="text-xs text-blue-200 mt-0.5">
                    {selectedBus.statusMessage || 'Operating normally on schedule'}
                  </p>
                </div>
              </div>
            ) : selectedStop ? (
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                      {selectedStop.campusZone}
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm mt-1">{selectedStop.name}</h4>
                  </div>
                  <span className="font-mono text-xs font-bold text-blue-700 bg-white px-2 py-0.5 rounded shadow-sm border border-blue-200">
                    {selectedStop.code}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-2">{selectedStop.description}</p>
                {selectedStop.amenities && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {selectedStop.amenities.map((a, i) => (
                      <span key={i} className="text-[10px] bg-white text-slate-700 px-2 py-0.5 rounded border border-blue-100 font-medium">
                        ✓ {a}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-50 border border-dashed border-slate-300 p-5 rounded-2xl text-center">
                <MapPin className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                <p className="text-xs font-bold text-slate-600">Select any stop or bus</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Click a bus marker to view live speed and stop ETAs</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Routes & Stops Tab */}
      {activeTab === 'routes' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {routes.map((route) => (
              <div
                key={route._id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className="text-xs font-bold px-2.5 py-1 rounded-md text-white"
                      style={{ backgroundColor: route.color || '#2563eb' }}
                    >
                      {route.code}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      ~{route.estimatedDurationMinutes} mins
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-base mt-2">{route.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">{route.description}</p>

                  <div className="mt-4 border-t border-slate-100 pt-3">
                    <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
                      Stop Sequence ({route.stops?.length || 0} stops):
                    </p>
                    <div className="space-y-2">
                      {route.stops?.map((st, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-slate-700">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="font-medium">{st.stop?.name || 'Stop'}</span>
                          <span className="text-[10px] text-slate-400 ml-auto">+{st.estimatedMinutesFromStart}m</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedRoute(route);
                    setActiveTab('map');
                  }}
                  className="mt-5 w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center justify-center gap-1"
                >
                  <Navigation className="w-3.5 h-3.5" /> View Route on Map
                </button>
              </div>
            ))}
          </div>

          {/* Stops Directory */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Campus Stops Directory</h3>
                <p className="text-xs text-slate-500">Complete list of authorized boarding and drop points</p>
              </div>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search stop name or zone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredStops.map((stop) => (
                <div
                  key={stop._id}
                  onClick={() => {
                    setSelectedStop(stop);
                    setActiveTab('map');
                  }}
                  className="p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition cursor-pointer bg-slate-50/50"
                >
                  <div className="flex items-start justify-between">
                    <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      {stop.code}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500">{stop.campusZone}</span>
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm mt-2">{stop.name}</h4>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{stop.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bus Timetable Tab */}
      {activeTab === 'schedules' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" /> Daily Campus Timetable
              </h3>
              <p className="text-xs text-slate-500">Official scheduled departures across all routes</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold tracking-wider border-y border-slate-200">
                <tr>
                  <th className="py-3 px-4">Route</th>
                  <th className="py-3 px-4">Assigned Bus</th>
                  <th className="py-3 px-4">Departure Time</th>
                  <th className="py-3 px-4">Est. Arrival</th>
                  <th className="py-3 px-4">Frequency</th>
                  <th className="py-3 px-4">Direction</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {schedules.map((sch) => (
                  <tr key={sch._id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-bold text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: sch.route?.color || '#2563eb' }}
                        />
                        {sch.route?.name} ({sch.route?.code})
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">
                      {sch.bus?.busNumber} ({sch.bus?.plateNumber})
                    </td>
                    <td className="py-3 px-4 font-bold text-blue-600 text-sm">
                      {sch.departureTime}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">
                      {sch.estimatedArrivalTime || '--'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      Every {sch.frequencyMinutes} mins
                    </td>
                    <td className="py-3 px-4 uppercase text-[10px] font-bold text-slate-500">
                      {sch.direction}
                    </td>
                    <td className="py-3 px-4">
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Trip Planner Tab */}
      {activeTab === 'plan' && (
        <TripPlanner
          stops={stops}
          routes={routes}
          onSelectRoute={(route) => {
            setSelectedRoute(route);
            setActiveTab('map');
          }}
          onSelectStop={(stop) => {
            setSelectedStop(stop);
            setActiveTab('map');
          }}
          onSelectBus={(bus) => {
            setSelectedBus(bus);
            setActiveTab('map');
          }}
          onFocusMap={() => setActiveTab('map')}
        />
      )}

      {/* AI Assistant Tab */}
      {activeTab === 'assistant' && (
        <AssistantChat
          onSelectRoute={(route) => {
            setSelectedRoute(route);
            setActiveTab('map');
          }}
          onSelectStop={(stop) => {
            setSelectedStop(stop);
            setActiveTab('map');
          }}
          onSelectBus={(bus) => {
            setSelectedBus(bus);
            setActiveTab('map');
          }}
          onFocusMap={() => setActiveTab('map')}
        />
      )}

      {/* Push Alerts & Geofences Tab */}
      {activeTab === 'alerts' && (
        <AlertsPanel
          stops={stops}
          buses={buses}
          onSelectRoute={(route) => {
            setSelectedRoute(route);
            setActiveTab('map');
          }}
          onSelectStop={(stop) => {
            setSelectedStop(stop);
            setActiveTab('map');
          }}
          onSelectBus={(bus) => {
            setSelectedBus(bus);
            setActiveTab('map');
          }}
          onFocusMap={() => setActiveTab('map')}
        />
      )}

      {/* Complaints & Feedback Tab */}
      {activeTab === 'complaints' && (
        <StudentComplaints stops={stops} routes={routes} buses={buses} />
      )}
    </div>
  );
};
