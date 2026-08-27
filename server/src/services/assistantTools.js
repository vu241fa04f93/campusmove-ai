import { Bus } from '../models/Bus.js';
import { Route } from '../models/Route.js';
import { Stop } from '../models/Stop.js';
import { Schedule } from '../models/Schedule.js';
import { calculateHaversineDistance, calculateStopETAs } from '../utils/geoUtils.js';
import { planTrip as planTripEngine } from './tripPlannerService.js';

/**
 * Transport Assistant Tool Library
 * Provides deterministic tool / function-style APIs grounded in real database entities.
 */
export const assistantTools = {
  /**
   * 1. Get real-time location and telemetry for a specific bus
   * @param {string} busNumber E.g. "Bus 12", "12", "Bus 04"
   */
  async getBusLocation(busNumber) {
    if (!busNumber) return { found: false, error: 'Bus number is required' };

    const cleanNum = String(busNumber).replace(/[^0-9]/g, '').padStart(2, '0');
    const bus = await Bus.findOne({
      $or: [
        { busNumber: new RegExp(cleanNum, 'i') },
        { busNumber: new RegExp(busNumber, 'i') },
        { plateNumber: new RegExp(busNumber, 'i') },
      ],
    })
      .populate('currentRoute')
      .populate('currentDriver', 'name phone')
      .lean();

    if (!bus) {
      return {
        found: false,
        message: `Bus ${busNumber} was not found in the campus transit fleet.`,
      };
    }

    const isLive = bus.status !== 'out_of_service' && Boolean(bus.lastKnownLocation?.lat);

    return {
      found: true,
      isLive,
      busNumber: bus.busNumber,
      plateNumber: bus.plateNumber,
      model: bus.model,
      status: bus.status,
      statusMessage: bus.statusMessage,
      location: bus.lastKnownLocation
        ? {
            lat: bus.lastKnownLocation.lat,
            lng: bus.lastKnownLocation.lng,
            speed: bus.lastKnownLocation.speed || 0,
            heading: bus.lastKnownLocation.heading || 0,
            updatedAt: bus.lastKnownLocation.updatedAt,
          }
        : null,
      currentRoute: bus.currentRoute
        ? {
            name: bus.currentRoute.name,
            code: bus.currentRoute.code,
          }
        : null,
      driver: bus.currentDriver ? { name: bus.currentDriver.name } : null,
      message: !isLive ? `Live location for ${bus.busNumber} is currently unavailable.` : undefined,
    };
  },

  /**
   * 2. Get operational status, capacity, and delay notes for a bus
   * @param {string} busNumber E.g. "Bus 04"
   */
  async getBusStatus(busNumber) {
    if (!busNumber) return { found: false, error: 'Bus number is required' };

    const cleanNum = String(busNumber).replace(/[^0-9]/g, '').padStart(2, '0');
    const bus = await Bus.findOne({
      $or: [
        { busNumber: new RegExp(cleanNum, 'i') },
        { busNumber: new RegExp(busNumber, 'i') },
      ],
    })
      .populate('currentRoute')
      .lean();

    if (!bus) {
      return {
        found: false,
        message: `Bus ${busNumber} is not currently registered or active in the campus fleet.`,
      };
    }

    return {
      found: true,
      busNumber: bus.busNumber,
      plateNumber: bus.plateNumber,
      status: bus.status,
      statusMessage: bus.statusMessage || 'Operating normally',
      capacity: bus.capacity,
      currentPassengerCount: bus.currentPassengerCount || 0,
      isDelayed: bus.status === 'delayed',
      isTripActive: bus.isTripActive || false,
      route: bus.currentRoute ? bus.currentRoute.name : 'Unassigned',
    };
  },

  /**
   * 3. Get all active and tracked buses on campus
   */
  async getActiveBuses() {
    const buses = await Bus.find()
      .populate('currentRoute')
      .populate('currentDriver', 'name')
      .lean();

    const activeBuses = buses.filter((b) => b.status === 'active');
    const delayedBuses = buses.filter((b) => b.status === 'delayed');
    const outOfServiceBuses = buses.filter((b) => b.status === 'out_of_service');

    return {
      total: buses.length,
      activeCount: activeBuses.length,
      delayedCount: delayedBuses.length,
      outOfServiceCount: outOfServiceBuses.length,
      activeBuses: activeBuses.map((b) => ({
        busNumber: b.busNumber,
        route: b.currentRoute?.code || 'Campus Line',
        speed: b.lastKnownLocation?.speed || 0,
        statusMessage: b.statusMessage,
      })),
      delayedBuses: delayedBuses.map((b) => ({
        busNumber: b.busNumber,
        route: b.currentRoute?.code || 'Campus Line',
        delayReason: b.statusMessage,
      })),
    };
  },

  /**
   * 4. Get detailed route information by code or name
   * @param {string} routeIdentifier E.g. "R-101" or "North-South Campus Express"
   */
  async getRouteInformation(routeIdentifier) {
    let route = null;
    if (routeIdentifier) {
      route = await Route.findOne({
        $or: [
          { code: new RegExp(routeIdentifier, 'i') },
          { name: new RegExp(routeIdentifier, 'i') },
        ],
      })
        .populate('stops.stop')
        .lean();
    }

    if (!route) {
      return { found: false, message: `Route '${routeIdentifier}' was not found.` };
    }

    return {
      found: true,
      name: route.name,
      code: route.code,
      description: route.description,
      color: route.color,
      totalDistanceKm: route.totalDistanceKm,
      estimatedDurationMinutes: route.estimatedDurationMinutes,
      stops: route.stops.map((s) => ({
        sequence: s.sequence,
        stopName: s.stop?.name || 'Stop',
        stopCode: s.stop?.code || '',
        estimatedMinutesFromStart: s.estimatedMinutesFromStart,
      })),
    };
  },

  /**
   * 5. Find routes and active buses serving a specific destination
   * @param {string|Object} destination Stop code or Stop name
   */
  async findBusForDestination(destination) {
    const destStr = typeof destination === 'string' ? destination.toLowerCase().trim() : '';

    const allStops = await Stop.find({ active: true }).lean();
    const matchedStop = allStops.find(
      (s) =>
        s.code.toLowerCase() === destStr ||
        s.name.toLowerCase().includes(destStr) ||
        destStr.includes(s.code.toLowerCase()) ||
        destStr.includes(s.name.toLowerCase())
    );

    if (!matchedStop) {
      return {
        found: false,
        message: `Could not identify campus stop for destination '${destination}'.`,
      };
    }

    const allRoutes = await Route.find({ active: true }).populate('stops.stop').lean();
    const servingRoutes = allRoutes.filter((r) =>
      r.stops?.some(
        (s) =>
          s.stop?._id?.toString() === matchedStop._id.toString() ||
          s.stop?.code?.toLowerCase() === matchedStop.code.toLowerCase()
      )
    );

    const routeIds = servingRoutes.map((r) => r._id.toString());
    const allBuses = await Bus.find().populate('currentRoute').lean();
    const servingBuses = allBuses.filter((b) =>
      routeIds.includes(b.currentRoute?._id?.toString())
    );

    return {
      found: true,
      stop: {
        name: matchedStop.name,
        code: matchedStop.code,
        campusZone: matchedStop.campusZone,
      },
      routes: servingRoutes.map((r) => ({
        name: r.name,
        code: r.code,
        estimatedDurationMinutes: r.estimatedDurationMinutes,
      })),
      buses: servingBuses.map((b) => ({
        busNumber: b.busNumber,
        status: b.status,
        statusMessage: b.statusMessage,
      })),
    };
  },

  /**
   * 6. Get next arriving bus and upcoming stop ETA
   * @param {string} [stopIdentifier] Target stop
   * @param {string} [busNumber] Specific bus number
   */
  async getNextBus(stopIdentifier, busNumber) {
    const [stops, routes, buses] = await Promise.all([
      Stop.find({ active: true }).lean(),
      Route.find({ active: true }).populate('stops.stop').lean(),
      Bus.find().populate('currentRoute').lean(),
    ]);

    let targetBus = null;
    if (busNumber) {
      const clean = String(busNumber).replace(/[^0-9]/g, '').padStart(2, '0');
      targetBus = buses.find(
        (b) =>
          b.busNumber.toLowerCase().includes(clean) ||
          b.busNumber.toLowerCase().includes(busNumber.toLowerCase())
      );
    } else {
      targetBus = buses.find((b) => (b.status === 'active' || b.status === 'delayed') && b.currentRoute) || buses[0];
    }

    if (!targetBus) {
      return {
        found: false,
        message: busNumber
          ? `Bus ${busNumber} is not currently active on any campus route.`
          : 'No active buses currently operating on route.',
      };
    }

    const route = routes.find(
      (r) =>
        r._id.toString() === targetBus.currentRoute?._id?.toString() ||
        r._id.toString() === targetBus.currentRoute?.toString()
    );

    if (!route || !route.stops || route.stops.length === 0) {
      return {
        found: true,
        busNumber: targetBus.busNumber,
        message: `${targetBus.busNumber} is currently in transit without scheduled stop checkpoints.`,
      };
    }

    let targetStop = null;
    if (stopIdentifier) {
      const q = stopIdentifier.toLowerCase().trim();
      targetStop = stops.find(
        (s) =>
          s.code.toLowerCase() === q ||
          s.name.toLowerCase().includes(q) ||
          q.includes(s.code.toLowerCase())
      );
    }

    const etas = calculateStopETAs(targetBus.lastKnownLocation || { lat: 28.5412, lng: 77.1896 }, route.stops, targetBus.status);
    let nextStopObj = null;

    if (targetStop) {
      nextStopObj = etas.find(
        (e) =>
          e.stopCode?.toLowerCase() === targetStop.code?.toLowerCase() ||
          e.stopName?.toLowerCase().includes(targetStop.name.toLowerCase())
      );
    }

    if (!nextStopObj) {
      nextStopObj = etas.find((e) => e.isNext) || etas.find((e) => !e.isPast) || etas[0];
    }

    return {
      found: true,
      busNumber: targetBus.busNumber,
      plateNumber: targetBus.plateNumber,
      routeCode: route.code,
      routeName: route.name,
      status: targetBus.status,
      speed: targetBus.lastKnownLocation?.speed || 0,
      nextStop: nextStopObj,
      allEtas: etas,
    };
  },

  /**
   * 7. Plan a trip reusing the Phase 3 Trip Planner Engine
   */
  async planTrip(origin, destination, options = {}) {
    return await planTripEngine({
      origin,
      destination,
      requiredArrivalTime: options.requiredArrivalTime,
      preference: options.preference || 'fastest',
      currentTime: options.currentTime || '08:35',
    });
  },

  /**
   * 8. Get all campus stops
   */
  async getCampusStops() {
    const stops = await Stop.find({ active: true }).sort({ orderIndex: 1 }).lean();
    return {
      count: stops.length,
      stops: stops.map((s) => ({
        name: s.name,
        code: s.code,
        campusZone: s.campusZone,
        description: s.description,
        amenities: s.amenities,
      })),
    };
  },

  /**
   * 9. Get all active campus routes
   */
  async getCampusRoutes() {
    const routes = await Route.find({ active: true }).populate('stops.stop').lean();
    return {
      count: routes.length,
      routes: routes.map((r) => ({
        name: r.name,
        code: r.code,
        description: r.description,
        color: r.color,
        totalDistanceKm: r.totalDistanceKm,
        estimatedDurationMinutes: r.estimatedDurationMinutes,
        stops: r.stops.map((s) => s.stop?.name || s.stop?.code || 'Stop'),
      })),
    };
  },
};
