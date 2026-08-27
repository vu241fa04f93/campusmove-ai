import { Stop } from '../models/Stop.js';
import { Alert } from '../models/Alert.js';
import { Bus } from '../models/Bus.js';
import { Route } from '../models/Route.js';
import { calculateHaversineDistance } from '../utils/geoUtils.js';

/**
 * Geofencing Service for CampusMove AI
 * Monitors real-time bus coordinates against campus stops,
 * manages entry/exit states, and emits proactive arrival notifications.
 */
class GeofenceService {
  constructor() {
    // Configurable geofence radius in kilometers (0.2 km = 200 meters)
    this.defaultRadiusKm = 0.2;
    // Hysteresis exit multiplier to avoid boundary flipping
    this.exitMultiplier = 1.3;
    // Cooldown duration in milliseconds (3 minutes) before re-alerting for the same stop
    this.cooldownMs = 3 * 60 * 1000;

    // In-memory state tracking: Map of `${busId}:${stopId}` -> { inside: boolean, lastAlertTime: Date }
    this.busStopState = new Map();
  }

  /**
   * Process a live bus location update against all active campus stops.
   * @param {Object} bus Bus document or populated object
   * @param {Object} location { lat: number, lng: number, speed?: number }
   * @param {Object} [ioInstance] Socket.IO instance to emit events
   * @returns {Promise<Array>} Array of newly triggered alerts
   */
  async processBusLocation(bus, location, ioInstance = null) {
    if (!bus || !location || location.lat === undefined || location.lng === undefined) {
      return [];
    }

    const busId = bus._id ? bus._id.toString() : String(bus.id || bus.busId);
    const busNumber = bus.busNumber || 'Campus Bus';
    const routeId = bus.currentRoute?._id || bus.currentRoute;

    // Load active stops (cached query)
    const stops = await Stop.find({ active: true }).lean();
    const triggeredAlerts = [];
    const now = Date.now();

    for (const stop of stops) {
      if (!stop.coordinates?.lat || !stop.coordinates?.lng) continue;

      const stopId = stop._id.toString();
      const stateKey = `${busId}:${stopId}`;
      const currentState = this.busStopState.get(stateKey) || {
        inside: false,
        lastAlertTime: 0,
      };

      const distanceKm = calculateHaversineDistance(
        location.lat,
        location.lng,
        stop.coordinates.lat,
        stop.coordinates.lng
      );
      const distanceMeters = Math.round(distanceKm * 1000);

      const isInside = distanceKm <= this.defaultRadiusKm;
      const isOutside = distanceKm > this.defaultRadiusKm * this.exitMultiplier;

      if (isInside) {
        const timeSinceLastAlert = now - currentState.lastAlertTime;
        const canTrigger = !currentState.inside || timeSinceLastAlert >= this.cooldownMs;

        if (canTrigger) {
          // Transitioned from outside to inside: create and broadcast alert
          this.busStopState.set(stateKey, {
            inside: true,
            lastAlertTime: now,
          });

          const title = `Bus ${busNumber} Approaching ${stop.name}`;
          const message = `${busNumber} is now within ${distanceMeters}m of ${stop.name} (${stop.code}). Estimated arrival in ~1-2 mins.`;

          const alertDoc = await Alert.create({
            title,
            message,
            type: 'geofence_entered',
            severity: 'info',
            bus: bus._id || busId,
            stop: stop._id,
            route: routeId || null,
            targetAudience: 'all',
            active: true,
            metadata: {
              distanceMeters,
              distanceKm: parseFloat(distanceKm.toFixed(3)),
              coordinates: { lat: location.lat, lng: location.lng },
              speed: location.speed || 0,
              trigger: 'geofence_entry',
            },
          });

          const populatedAlert = await Alert.findById(alertDoc._id)
            .populate('bus', 'busNumber plateNumber status')
            .populate('stop', 'name code campusZone')
            .populate('route', 'name code color')
            .lean();

          triggeredAlerts.push(populatedAlert);

          // Emit real-time socket event
          if (ioInstance) {
            ioInstance.emit('alert:new', populatedAlert);
            ioInstance.to(`bus:${busId}`).emit('alert:new', populatedAlert);
          }
        }
      } else if (isOutside && currentState.inside) {
        // Bus has clearly departed the geofence perimeter
        this.busStopState.set(stateKey, {
          inside: false,
          lastAlertTime: currentState.lastAlertTime,
        });
      }
    }

    return triggeredAlerts;
  }

  /**
   * Trigger alert when a bus status changes (e.g. active -> delayed, or delayed -> active)
   * @param {Object} bus
   * @param {string} oldStatus
   * @param {string} newStatus
   * @param {string} [statusMessage]
   * @param {Object} [ioInstance]
   */
  async processStatusChange(bus, oldStatus, newStatus, statusMessage = '', ioInstance = null) {
    if (!bus || oldStatus === newStatus) return null;

    const busNumber = bus.busNumber || 'Campus Bus';
    const busId = bus._id ? bus._id.toString() : String(bus.id);
    let title = '';
    let message = '';
    let type = 'general';
    let severity = 'info';

    if (newStatus === 'delayed') {
      type = 'bus_delayed';
      severity = 'warning';
      title = `⚠️ ${busNumber} Delayed`;
      message = statusMessage
        ? `${busNumber} is experiencing delays: ${statusMessage}.`
        : `${busNumber} is currently running behind schedule.`;
    } else if (oldStatus === 'delayed' && newStatus === 'active') {
      type = 'general';
      severity = 'info';
      title = `✅ ${busNumber} Resumed Normal Service`;
      message = `${busNumber} has cleared delays and is now running on regular schedule.`;
    } else if (newStatus === 'breakdown') {
      type = 'general';
      severity = 'critical';
      title = `🚨 ${busNumber} Service Disruption`;
      message = statusMessage || `${busNumber} has reported a mechanical issue. Passengers are advised to seek alternative shuttles.`;
    } else {
      return null;
    }

    const alertDoc = await Alert.create({
      title,
      message,
      type,
      severity,
      bus: bus._id || busId,
      route: bus.currentRoute?._id || bus.currentRoute || null,
      targetAudience: 'all',
      active: true,
      metadata: {
        oldStatus,
        newStatus,
        statusMessage,
      },
    });

    const populatedAlert = await Alert.findById(alertDoc._id)
      .populate('bus', 'busNumber plateNumber status')
      .populate('route', 'name code color')
      .lean();

    if (ioInstance) {
      ioInstance.emit('alert:new', populatedAlert);
    }

    return populatedAlert;
  }

  /**
   * Reset in-memory geofence states (useful during testing)
   */
  resetState() {
    this.busStopState.clear();
  }
}

export const geofenceService = new GeofenceService();
