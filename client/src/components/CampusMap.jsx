import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { socketService } from '../services/socketService';
import { formatETA, formatDistance, formatSpeed } from '../utils/etaCalculator';
import { MapPin, Navigation, Bus, Clock, ShieldAlert, Radio, Sparkles, Gauge } from 'lucide-react';

// Create custom SVG Leaflet Icons for Stops
const createStopIcon = (code, zone) => {
  let bgColor = '#2563eb'; // blue
  if (zone === 'Hostels') bgColor = '#059669'; // emerald
  if (zone === 'Main Entrance') bgColor = '#4f46e5'; // indigo
  if (zone === 'Recreational') bgColor = '#d97706'; // amber

  return L.divIcon({
    className: 'custom-stop-icon',
    html: `
      <div style="
        background-color: ${bgColor};
        color: white;
        padding: 3px 6px;
        border-radius: 6px;
        font-weight: 700;
        font-size: 10px;
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2), 0 2px 4px -2px rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        gap: 3px;
        border: 1.5px solid white;
        white-space: nowrap;
        transform: translate(-50%, -50%);
      ">
        <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:white;"></span>
        ${code}
      </div>
    `,
    iconSize: [30, 20],
    iconAnchor: [15, 10],
  });
};

// Create custom animated SVG Marker for Live Moving Buses
const createBusIcon = (busNumber, status, isLive, isSimulated, heading = 0) => {
  let badgeColor = '#10b981'; // active emerald
  if (status === 'delayed') badgeColor = '#f59e0b'; // amber
  if (status === 'breakdown') badgeColor = '#ef4444'; // red
  if (status === 'out_of_service' || !isLive) badgeColor = '#6b7280'; // gray

  const isPulsing = isLive && status !== 'out_of_service';

  return L.divIcon({
    className: `custom-bus-icon ${isPulsing ? 'pulse-marker' : ''}`,
    html: `
      <div style="
        background: #0f172a;
        color: white;
        border: 2px solid ${badgeColor};
        border-radius: 8px;
        padding: 4px 8px;
        font-size: 11px;
        font-weight: 800;
        display: flex;
        align-items: center;
        gap: 5px;
        box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3);
        transform: translate(-50%, -50%);
        transition: transform 0.4s ease-out;
      ">
        <div style="display:flex;align-items:center;justify-content:center;">
          <svg style="width:14px;height:14px;fill:${badgeColor};transform: rotate(${heading}deg);transition: transform 0.3s ease;" viewBox="0 0 24 24">
            <path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"/>
          </svg>
        </div>
        <span>${busNumber}</span>
        ${
          isSimulated
            ? `<span style="background:#e0e7ff;color:#3730a3;font-size:8px;padding:1px 3px;border-radius:4px;font-weight:700;">SIM</span>`
            : isLive
            ? `<span style="width:6px;height:6px;border-radius:50%;background:#10b981;display:inline-block;"></span>`
            : ''
        }
      </div>
    `,
    iconSize: [58, 26],
    iconAnchor: [29, 13],
  });
};

// Component to handle dynamic map centering
const ChangeMapView = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center && Array.isArray(center) && center.length === 2 && !isNaN(center[0]) && !isNaN(center[1])) {
      map.setView(center, zoom || 15);
    }
  }, [center, zoom, map]);
  return null;
};

export const CampusMap = ({
  stops = [],
  routes = [],
  buses = [],
  selectedStop = null,
  selectedRoute = null,
  selectedBus = null,
  onSelectStop,
  onSelectBus,
  height = 'h-[500px]',
}) => {
  const defaultCenter = [28.5445, 77.1915]; // GreenTech Campus center coordinates

  // Live state map for real-time tracking
  const [liveBuses, setLiveBuses] = useState({});

  // Seed liveBuses with initial buses prop
  useEffect(() => {
    const map = {};
    buses.forEach((b) => {
      map[b._id] = {
        busId: b._id,
        busNumber: b.busNumber,
        plateNumber: b.plateNumber,
        model: b.model,
        capacity: b.capacity,
        status: b.status,
        statusMessage: b.statusMessage,
        isTripActive: b.isTripActive || false,
        isLive: b.isLive || false,
        isSimulated: b.isSimulated || false,
        currentRoute: b.currentRoute,
        coordinates: b.lastKnownLocation ? { lat: b.lastKnownLocation.lat, lng: b.lastKnownLocation.lng } : null,
        speed: b.lastKnownLocation?.speed || 0,
        heading: b.lastKnownLocation?.heading || 0,
        accuracy: b.lastKnownLocation?.accuracy || 5,
        updatedAt: b.lastKnownLocation?.updatedAt || new Date(),
        etas: [],
      };
    });
    setLiveBuses(map);
  }, [buses]);

  // Connect Socket.IO and listen for real-time location broadcasts
  useEffect(() => {
    const unsubLocation = socketService.onLocationBroadcast((data) => {
      setLiveBuses((prev) => ({
        ...prev,
        [data.busId]: {
          ...(prev[data.busId] || {}),
          busId: data.busId,
          busNumber: data.busNumber || prev[data.busId]?.busNumber,
          plateNumber: data.plateNumber || prev[data.busId]?.plateNumber,
          coordinates: data.coordinates,
          speed: data.speed,
          heading: data.heading,
          accuracy: data.accuracy,
          status: data.status,
          statusMessage: data.statusMessage,
          isTripActive: data.isTripActive !== undefined ? data.isTripActive : true,
          isLive: true,
          isSimulated: !!data.isSimulated,
          route: data.route || prev[data.busId]?.currentRoute,
          etas: data.etas || [],
          updatedAt: new Date(),
        },
      }));
    });

    const unsubStart = socketService.onTripStarted((data) => {
      setLiveBuses((prev) => ({
        ...prev,
        [data.busId]: {
          ...(prev[data.busId] || {}),
          busId: data.busId,
          busNumber: data.busNumber,
          isTripActive: true,
          isLive: true,
          isSimulated: !!data.isSimulated,
          status: 'active',
          currentRoute: data.route || prev[data.busId]?.currentRoute,
          updatedAt: new Date(),
        },
      }));
    });

    const unsubEnd = socketService.onTripEnded((data) => {
      setLiveBuses((prev) => ({
        ...prev,
        [data.busId]: {
          ...(prev[data.busId] || {}),
          isTripActive: false,
          isLive: false,
          status: 'out_of_service',
          statusMessage: 'Trip completed — Vehicle off duty',
          updatedAt: new Date(),
        },
      }));
    });

    const unsubStatus = socketService.onStatusUpdated((data) => {
      setLiveBuses((prev) => ({
        ...prev,
        [data.busId]: {
          ...(prev[data.busId] || {}),
          status: data.status,
          statusMessage: data.statusMessage,
          etas: data.etas || prev[data.busId]?.etas || [],
          updatedAt: new Date(),
        },
      }));
    });

    return () => {
      unsubLocation();
      unsubStart();
      unsubEnd();
      unsubStatus();
    };
  }, []);

  // Determine current map center
  let currentCenter = defaultCenter;
  let currentZoom = 15;

  if (selectedStop && selectedStop.coordinates && selectedStop.coordinates.lat && selectedStop.coordinates.lng) {
    currentCenter = [selectedStop.coordinates.lat, selectedStop.coordinates.lng];
    currentZoom = 17;
  } else if (selectedBus && liveBuses[selectedBus._id]?.coordinates) {
    currentCenter = [liveBuses[selectedBus._id].coordinates.lat, liveBuses[selectedBus._id].coordinates.lng];
    currentZoom = 17;
  }

  const liveBusesList = Object.values(liveBuses);

  return (
    <div className={`relative w-full ${height} rounded-2xl overflow-hidden shadow-sm border border-slate-200`}>
      <MapContainer
        center={defaultCenter}
        zoom={15}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <ChangeMapView center={currentCenter} zoom={currentZoom} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Render Route Polylines */}
        {routes.map((route) => {
          let polyPositions = [];
          if (route.pathCoordinates && route.pathCoordinates.length > 0) {
            polyPositions = route.pathCoordinates;
          } else if (route.stops && route.stops.length > 0) {
            polyPositions = route.stops
              .filter((s) => s.stop && s.stop.coordinates && s.stop.coordinates.lat)
              .map((s) => [s.stop.coordinates.lat, s.stop.coordinates.lng]);
          }

          if (polyPositions.length < 2) return null;

          const isSelected = selectedRoute && selectedRoute._id === route._id;
          return (
            <Polyline
              key={route._id}
              positions={polyPositions}
              pathOptions={{
                color: route.color || '#2563eb',
                weight: isSelected ? 6 : 4,
                opacity: isSelected ? 0.95 : 0.65,
                dashArray: isSelected ? null : '6, 6',
              }}
            >
              <Popup>
                <div className="p-1 max-w-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 text-sm">
                    <span
                      className="w-3 h-3 rounded-full inline-block"
                      style={{ backgroundColor: route.color || '#2563eb' }}
                    />
                    {route.name} ({route.code})
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{route.description}</p>
                  <div className="mt-2 text-xs text-slate-600 font-medium">
                    Distance: {route.totalDistanceKm || 3.2} km • Est: {route.estimatedDurationMinutes || 12} mins
                  </div>
                </div>
              </Popup>
            </Polyline>
          );
        })}

        {/* Render Campus Stop Markers */}
        {stops.map((stop) => {
          if (!stop.coordinates || typeof stop.coordinates.lat !== 'number' || typeof stop.coordinates.lng !== 'number') {
            return null;
          }
          return (
            <Marker
              key={stop._id}
              position={[stop.coordinates.lat, stop.coordinates.lng]}
              icon={createStopIcon(stop.code, stop.campusZone)}
              eventHandlers={{
                click: () => onSelectStop && onSelectStop(stop),
              }}
            >
              <Popup>
                <div className="p-1 min-w-[220px]">
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-1.5">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {stop.campusZone}
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm mt-1">{stop.name}</h4>
                    </div>
                    <span className="font-mono text-xs font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
                      {stop.code}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5">{stop.description}</p>

                  {stop.amenities && stop.amenities.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {stop.amenities.map((a, i) => (
                        <span key={i} className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                          ✓ {a}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                    <span>Lat: {stop.coordinates.lat.toFixed(4)}</span>
                    <span>Lng: {stop.coordinates.lng.toFixed(4)}</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Render Real-Time Moving Bus Markers */}
        {liveBusesList.map((bus) => {
          if (!bus.coordinates || typeof bus.coordinates.lat !== 'number' || typeof bus.coordinates.lng !== 'number') {
            return null;
          }

          const nextStop = bus.etas?.find((e) => e.isNext);

          return (
            <Marker
              key={bus.busId}
              position={[bus.coordinates.lat, bus.coordinates.lng]}
              icon={createBusIcon(bus.busNumber, bus.status, bus.isLive, bus.isSimulated, bus.heading)}
              eventHandlers={{
                click: () => onSelectBus && onSelectBus(bus),
              }}
            >
              <Popup>
                <div className="p-1 min-w-[240px]">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      <Bus className="w-4 h-4 text-blue-600" />
                      {bus.busNumber}
                      {bus.isSimulated && (
                        <span className="text-[9px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.2 rounded">
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

                  {/* Route & Telemetry info */}
                  <div className="mt-2 space-y-1 text-xs">
                    <p className="text-slate-600 font-medium">
                      Route: <span className="font-bold text-slate-800">{bus.currentRoute?.name || bus.route?.name || 'Assigned Route'}</span>
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 p-1.5 rounded-lg">
                      <span className="flex items-center gap-1 font-semibold text-slate-700">
                        <Gauge className="w-3.5 h-3.5 text-blue-600" />
                        {formatSpeed(bus.speed)}
                      </span>
                      <span>Heading: {Math.round(bus.heading || 0)}°</span>
                    </div>
                  </div>

                  {/* Next Stop & ETA */}
                  {nextStop ? (
                    <div className="mt-2 bg-emerald-50 border border-emerald-200 p-2 rounded-xl text-xs">
                      <div className="flex items-center justify-between text-emerald-900 font-bold">
                        <span>Next: {nextStop.stopName}</span>
                        <span className="text-emerald-700 font-black">{formatETA(nextStop.estimatedMinutes)}</span>
                      </div>
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        Distance: {formatDistance(nextStop.distanceKm)}
                      </p>
                    </div>
                  ) : null}

                  {/* Broadcast Message */}
                  <div className="mt-2 text-xs text-slate-600 italic bg-slate-50 p-2 rounded">
                    📢 {bus.statusMessage || 'Operating normally'}
                  </div>

                  {/* Downstream Stop ETAs */}
                  {bus.etas && bus.etas.length > 1 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Upcoming Stops & ETAs:
                      </p>
                      <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                        {bus.etas.slice(0, 4).map((eta, idx) => (
                          <div key={idx} className="flex items-center justify-between text-[11px] text-slate-700">
                            <span className="truncate max-w-[140px]">
                              {idx + 1}. {eta.stopName}
                            </span>
                            <span className="font-bold text-blue-600 shrink-0">{formatETA(eta.estimatedMinutes)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Live Connection & Map Legend Overlay */}
      <div className="absolute bottom-4 right-4 z-20 bg-white/95 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-slate-200 text-xs hidden sm:block">
        <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-slate-100">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
            Real-Time GPS Active
          </span>
        </div>
        <div className="space-y-1 text-slate-600 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-blue-600 inline-block"></span>
            <span>Academic Stops</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-emerald-600 inline-block"></span>
            <span>Hostel Stops</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-slate-900 border border-emerald-400 inline-block"></span>
            <span>Live Moving Bus</span>
          </div>
        </div>
      </div>
    </div>
  );
};
