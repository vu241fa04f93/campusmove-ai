import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Navigation, Bus, Clock, ShieldAlert } from 'lucide-react';

// Create custom SVG Leaflet Icons
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

const createBusIcon = (busNumber, status) => {
  let badgeColor = '#10b981'; // active emerald
  if (status === 'delayed') badgeColor = '#f59e0b'; // amber
  if (status === 'breakdown') badgeColor = '#ef4444'; // red
  if (status === 'out_of_service') badgeColor = '#6b7280'; // gray

  return L.divIcon({
    className: 'custom-bus-icon pulse-marker',
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
        gap: 4px;
        box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3);
        transform: translate(-50%, -50%);
      ">
        <svg style="width:14px;height:14px;fill:${badgeColor}" viewBox="0 0 24 24">
          <path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"/>
        </svg>
        ${busNumber}
      </div>
    `,
    iconSize: [50, 24],
    iconAnchor: [25, 12],
  });
};

// Component to handle map pan/zoom changes
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
  height = 'h-[500px]',
}) => {
  const defaultCenter = [28.5445, 77.1915]; // GreenTech Campus center coordinates

  // Center coordinate determination
  let currentCenter = defaultCenter;
  let currentZoom = 15;

  if (selectedStop && selectedStop.coordinates && selectedStop.coordinates.lat && selectedStop.coordinates.lng) {
    currentCenter = [selectedStop.coordinates.lat, selectedStop.coordinates.lng];
    currentZoom = 17;
  } else if (selectedBus && selectedBus.lastKnownLocation && selectedBus.lastKnownLocation.lat && selectedBus.lastKnownLocation.lng) {
    currentCenter = [selectedBus.lastKnownLocation.lat, selectedBus.lastKnownLocation.lng];
    currentZoom = 17;
  }

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

        {/* Render Bus Live Markers */}
        {buses.map((bus) => {
          if (!bus.lastKnownLocation || typeof bus.lastKnownLocation.lat !== 'number' || typeof bus.lastKnownLocation.lng !== 'number') {
            return null;
          }
          return (
            <Marker
              key={bus._id}
              position={[bus.lastKnownLocation.lat, bus.lastKnownLocation.lng]}
              icon={createBusIcon(bus.busNumber, bus.status)}
            >
              <Popup>
                <div className="p-1 min-w-[220px]">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      <Bus className="w-4 h-4 text-blue-600" />
                      {bus.busNumber}
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

                  <p className="text-xs text-slate-600 font-medium mt-1.5">
                    Route: {bus.currentRoute?.name || 'Assigned Route'}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Model: {bus.model} ({bus.capacity} seats)
                  </p>
                  <div className="mt-2 bg-slate-50 p-2 rounded text-xs text-slate-700">
                    📢 {bus.statusMessage || 'Operating normally'}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Map Legend Overlay */}
      <div className="absolute bottom-4 right-4 z-20 bg-white/95 backdrop-blur-sm p-2.5 rounded-xl shadow-lg border border-slate-200 text-xs hidden sm:block">
        <p className="font-bold text-slate-700 mb-1.5 text-[11px] uppercase tracking-wider">Campus Map Legend</p>
        <div className="space-y-1 text-slate-600">
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
            <span>Active Bus (Live)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
