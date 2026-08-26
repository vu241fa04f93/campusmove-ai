import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { busApi } from '../api/busApi';
import { socketService } from '../services/socketService';
import { formatSpeed, formatDistance } from '../utils/etaCalculator';
import {
  Bus,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Radio,
  Clock,
  Play,
  Square,
  Compass,
  Gauge,
  Sparkles,
  MapPin,
  Activity,
} from 'lucide-react';

export const DriverDashboard = () => {
  const { user } = useAuth();
  const [buses, setBuses] = useState([]);
  const [assignedBus, setAssignedBus] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [successNotice, setSuccessNotice] = useState('');

  // Trip & GPS States
  const [isTripActive, setIsTripActive] = useState(false);
  const [isSimulated, setIsSimulated] = useState(false);
  const [currentCoords, setCurrentCoords] = useState(null);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [currentHeading, setCurrentHeading] = useState(0);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [tripSeconds, setTripSeconds] = useState(0);
  const [gpsError, setGpsError] = useState('');

  const watchIdRef = useRef(null);
  const simTimerRef = useRef(null);
  const tripTimerRef = useRef(null);

  const fetchDriverData = async () => {
    try {
      setLoading(true);
      const res = await busApi.getAll();
      if (res.success) {
        setBuses(res.data);
        const myBus =
          res.data.find((b) => b.currentDriver?._id === user?.id || b.currentDriver === user?.id) ||
          res.data.find((b) => b.busNumber === 'Bus 12') ||
          res.data[0];

        setAssignedBus(myBus);
        if (myBus) {
          setStatusMessage(myBus.statusMessage || '');
          setIsTripActive(myBus.isTripActive || false);
          setIsSimulated(myBus.isSimulated || false);
          if (myBus.lastKnownLocation) {
            setCurrentCoords({
              lat: myBus.lastKnownLocation.lat,
              lng: myBus.lastKnownLocation.lng,
            });
            setCurrentSpeed(myBus.lastKnownLocation.speed || 0);
            setCurrentHeading(myBus.lastKnownLocation.heading || 0);
          }
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
    socketService.connect();

    return () => {
      stopGPSWatch();
      stopSimulation();
      if (tripTimerRef.current) clearInterval(tripTimerRef.current);
    };
  }, [user]);

  // Trip Duration Timer
  useEffect(() => {
    if (isTripActive) {
      tripTimerRef.current = setInterval(() => {
        setTripSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (tripTimerRef.current) clearInterval(tripTimerRef.current);
      setTripSeconds(0);
    }
    return () => {
      if (tripTimerRef.current) clearInterval(tripTimerRef.current);
    };
  }, [isTripActive]);

  // Format trip seconds into HH:MM:SS
  const formatTripTime = (totalSec) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Start Real Browser Geolocation GPS Watch
  const startRealGPS = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser/device.');
      return;
    }

    setGpsError('');
    setIsSimulated(false);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const speedKmh = pos.coords.speed ? pos.coords.speed * 3.6 : 18;
        const headingDeg = pos.coords.heading || 0;
        const accuracyMeters = pos.coords.accuracy || 5;

        setCurrentCoords({ lat, lng });
        setCurrentSpeed(speedKmh);
        setCurrentHeading(headingDeg);
        setGpsAccuracy(accuracyMeters);

        if (assignedBus) {
          socketService.sendLocationUpdate({
            busId: assignedBus._id,
            lat,
            lng,
            speed: speedKmh,
            heading: headingDeg,
            accuracy: accuracyMeters,
            driverId: user?.id,
            isSimulated: false,
          });
        }
      },
      (err) => {
        console.warn('[DriverDashboard] Geolocation watch error:', err.message);
        setGpsError(`GPS Access notice: ${err.message}. You can also use simulated drive.`);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const stopGPSWatch = () => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  // Start Simulated Route Drive (For testing on stationary desktop)
  const startSimulation = () => {
    stopGPSWatch();
    setIsSimulated(true);
    setGpsError('');

    const routeStops = assignedBus?.currentRoute?.stops || [];
    let pathPoints = [];

    if (assignedBus?.currentRoute?.pathCoordinates?.length > 0) {
      pathPoints = assignedBus.currentRoute.pathCoordinates;
    } else if (routeStops.length > 0) {
      pathPoints = routeStops
        .filter((st) => st.stop?.coordinates)
        .map((st) => [st.stop.coordinates.lat, st.stop.coordinates.lng]);
    }

    if (pathPoints.length === 0) {
      pathPoints = [
        [28.5385, 77.19],
        [28.5415, 77.1895],
        [28.5448, 77.1905],
        [28.546, 77.192],
        [28.5475, 77.1942],
        [28.5485, 77.1915],
      ];
    }

    let currentIndex = 0;
    let step = 0;
    const totalStepsBetweenPoints = 6;

    simTimerRef.current = setInterval(() => {
      const p1 = pathPoints[currentIndex];
      const p2 = pathPoints[(currentIndex + 1) % pathPoints.length];

      const ratio = step / totalStepsBetweenPoints;
      const lat = p1[0] + (p2[0] - p1[0]) * ratio;
      const lng = p1[1] + (p2[1] - p1[1]) * ratio;

      // Calculate approximate heading angle
      const dLng = p2[1] - p1[1];
      const dLat = p2[0] - p1[0];
      const heading = (Math.atan2(dLng, dLat) * 180) / Math.PI;

      const simSpeed = 22 + Math.floor(Math.random() * 8);

      setCurrentCoords({ lat, lng });
      setCurrentSpeed(simSpeed);
      setCurrentHeading(heading >= 0 ? heading : 360 + heading);
      setGpsAccuracy(3);

      if (assignedBus) {
        socketService.sendLocationUpdate({
          busId: assignedBus._id,
          lat,
          lng,
          speed: simSpeed,
          heading: heading >= 0 ? heading : 360 + heading,
          accuracy: 3,
          driverId: user?.id,
          isSimulated: true,
        });
      }

      step++;
      if (step > totalStepsBetweenPoints) {
        step = 0;
        currentIndex = (currentIndex + 1) % pathPoints.length;
      }
    }, 2200);
  };

  const stopSimulation = () => {
    if (simTimerRef.current) {
      clearInterval(simTimerRef.current);
      simTimerRef.current = null;
    }
  };

  // Start Trip Action
  const handleStartTrip = async (useSim = false) => {
    if (!assignedBus) return;
    try {
      setUpdating(true);
      setIsTripActive(true);

      socketService.startTrip(assignedBus._id, assignedBus.currentRoute?._id, user?.id, useSim);

      if (useSim) {
        startSimulation();
      } else {
        startRealGPS();
      }

      setSuccessNotice(`Trip Started for ${assignedBus.busNumber}! Location broadcasting active.`);
      setTimeout(() => setSuccessNotice(''), 4000);
    } catch (err) {
      console.error('Failed to start trip:', err);
    } finally {
      setUpdating(false);
    }
  };

  // End Trip Action
  const handleEndTrip = async () => {
    if (!assignedBus) return;
    try {
      setUpdating(true);
      stopGPSWatch();
      stopSimulation();
      setIsTripActive(false);
      setIsSimulated(false);
      setCurrentSpeed(0);

      socketService.endTrip(assignedBus._id, user?.id);

      setSuccessNotice(`Trip Ended for ${assignedBus.busNumber}. Bus marked as off duty.`);
      setTimeout(() => setSuccessNotice(''), 4000);
    } catch (err) {
      console.error('Failed to end trip:', err);
    } finally {
      setUpdating(false);
    }
  };

  // Update Status (On Time / Delayed / Breakdown)
  const handleStatusUpdate = async (newStatus) => {
    if (!assignedBus) return;
    try {
      setUpdating(true);
      const newMsg = statusMessage || (newStatus === 'delayed' ? 'Running behind schedule' : 'Operating normally');

      socketService.updateBusStatus(assignedBus._id, newStatus, newMsg);

      await busApi.update(assignedBus._id, {
        status: newStatus,
        statusMessage: newMsg,
      });

      setAssignedBus((prev) => ({ ...prev, status: newStatus, statusMessage: newMsg }));
      setSuccessNotice(`Status updated to "${newStatus.toUpperCase()}"!`);
      setTimeout(() => setSuccessNotice(''), 4000);
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
      socketService.updateBusStatus(assignedBus._id, assignedBus.status, statusMessage);
      await busApi.update(assignedBus._id, { statusMessage });

      setSuccessNotice('Driver broadcast message updated & sent to students!');
      setTimeout(() => setSuccessNotice(''), 4000);
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
            License: <span className="font-mono font-bold text-white">DL-2024-9988-KA</span> • Shift:{' '}
            <span className={isTripActive ? 'text-emerald-400 font-bold' : 'text-slate-300'}>
              {isTripActive ? 'Live Trip Active' : 'Stationary'}
            </span>
          </p>
        </div>

        <div className="bg-emerald-700/50 border border-emerald-500/40 px-4 py-2.5 rounded-xl text-center min-w-[140px]">
          <p className="text-[10px] uppercase font-bold text-emerald-200">Vehicle Assigned</p>
          <p className="text-lg font-black text-white">{assignedBus?.busNumber || 'Bus 12'}</p>
        </div>
      </div>

      {successNotice && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {successNotice}
        </div>
      )}

      {gpsError && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          {gpsError}
        </div>
      )}

      {/* TRIP CONTROLLER & TELEMETRY HUD */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600" /> Live Trip Controller & GPS Streamer
            </h3>
            <p className="text-xs text-slate-500">
              Start broadcasting your position to students and campus dispatch
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!isTripActive ? (
              <>
                <button
                  onClick={() => handleStartTrip(false)}
                  disabled={updating}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-2 shadow-lg shadow-emerald-600/25 disabled:opacity-50"
                >
                  <Play className="w-4 h-4" /> Start Real Trip
                </button>
                <button
                  onClick={() => handleStartTrip(true)}
                  disabled={updating}
                  title="Test GPS drive along route stops on desktop without physical movement"
                  className="px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4 text-indigo-600" /> Simulate Drive
                </button>
              </>
            ) : (
              <button
                onClick={handleEndTrip}
                disabled={updating}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-2 shadow-lg shadow-rose-600/25 disabled:opacity-50"
              >
                <Square className="w-4 h-4" /> End Trip
              </button>
            )}
          </div>
        </div>

        {/* Live Telemetry Meters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5 text-blue-600" /> Current Speed
            </span>
            <p className="text-lg font-black text-slate-900 mt-1">{formatSpeed(currentSpeed)}</p>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-purple-600" /> Compass Heading
            </span>
            <p className="text-lg font-black text-slate-900 mt-1">{Math.round(currentHeading)}°</p>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-emerald-600" /> Trip Duration
            </span>
            <p className="text-lg font-black text-slate-900 mt-1">{formatTripTime(tripSeconds)}</p>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-amber-600" /> GPS Mode
            </span>
            <div className="mt-1">
              {isTripActive ? (
                <span
                  className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-md ${
                    isSimulated
                      ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  {isSimulated ? 'SIMULATED GPS' : 'DEVICE GPS LIVE'}
                </span>
              ) : (
                <span className="text-xs font-semibold text-slate-400">Offline</span>
              )}
            </div>
          </div>
        </div>

        {currentCoords && (
          <div className="text-[11px] text-slate-500 font-mono bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <span>
              Coordinates: {currentCoords.lat.toFixed(5)}, {currentCoords.lng.toFixed(5)}
            </span>
            <span>Accuracy: ±{gpsAccuracy || 5}m</span>
          </div>
        )}
      </div>

      {/* Primary Vehicle Controls & Status Toggles */}
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
              <span className="text-slate-500">Operational Status</span>
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
