import { Route } from '../../models/Route.js';
import { Bus } from '../../models/Bus.js';
import { Complaint } from '../../models/Complaint.js';
import { Incident } from '../../models/Incident.js';
import { Trip } from '../../models/Trip.js';
import { demandForecastService } from '../prediction/demandForecastService.js';

/**
 * Calculates comprehensive route analytics, passenger demand, complaint hotspots, and route rankings.
 */
export const getRouteAnalytics = async () => {
  try {
    const routes = await Route.find().populate('stops.stop', 'name code').lean();

    if (!routes || routes.length === 0) {
      return {
        totalRoutes: 0,
        busiestRoute: null,
        leastUtilizedRoute: null,
        routeWithMostComplaints: null,
        routes: [],
      };
    }

    // Fetch relational aggregate counts
    const [buses, complaints, incidents, trips, demandForecast] = await Promise.all([
      Bus.find().select('currentRoute status capacity speed').lean(),
      Complaint.aggregate([
        { $match: { route: { $ne: null } } },
        { $group: { _id: '$route', count: { $sum: 1 } } },
      ]),
      Incident.aggregate([
        { $match: { route: { $ne: null } } },
        { $group: { _id: '$route', count: { $sum: 1 } } },
      ]),
      Trip.aggregate([
        { $match: { recommendedRoute: { $ne: null } } },
        { $group: { _id: '$recommendedRoute', count: { $sum: 1 } } },
      ]),
      demandForecastService.forecastDemand().catch(() => null),
    ]);

    const complaintMap = new Map();
    complaints.forEach((c) => complaintMap.set(c._id.toString(), c.count));

    const incidentMap = new Map();
    incidents.forEach((i) => incidentMap.set(i._id.toString(), i.count));

    const tripMap = new Map();
    trips.forEach((t) => tripMap.set(t._id.toString(), t.count));

    // Map buses to routes
    const busRouteMap = new Map();
    buses.forEach((b) => {
      if (b.currentRoute) {
        const rId = b.currentRoute.toString();
        if (!busRouteMap.has(rId)) busRouteMap.set(rId, []);
        busRouteMap.get(rId).push(b);
      }
    });

    const routeMetrics = routes.map((route) => {
      const routeIdStr = route._id.toString();
      const assignedBuses = busRouteMap.get(routeIdStr) || [];
      const assignedBusesCount = assignedBuses.length;
      const complaintsCount = complaintMap.get(routeIdStr) || 0;
      const incidentsCount = incidentMap.get(routeIdStr) || 0;
      const baseTrips = tripMap.get(routeIdStr) || 0;
      const totalTrips = baseTrips > 0 ? baseTrips : assignedBusesCount * 18 + 12;

      // Determine average utilization
      const activeBuses = assignedBuses.filter((b) => b.status === 'active').length;
      const averageUtilization = Math.min(
        96,
        Math.max(25, Math.round(activeBuses * 30 + assignedBusesCount * 15 + totalTrips * 0.8))
      );

      // Route demand level from forecast or calculated fallback
      let demandLevel = 'MODERATE';
      if (demandForecast?.busiestRoutes) {
        const matchingForecast = demandForecast.busiestRoutes.find((r) => r.code === route.code || r.name === route.name);
        if (matchingForecast) {
          demandLevel = matchingForecast.expectedDemand >= 200 ? 'SURGE' : matchingForecast.expectedDemand >= 120 ? 'HIGH' : 'MODERATE';
        }
      }
      if (demandLevel === 'MODERATE' && (totalTrips > 40 || averageUtilization > 75)) {
        demandLevel = 'HIGH';
      }

      return {
        routeId: route._id,
        routeName: route.name,
        routeCode: route.code,
        color: route.color || '#2563eb',
        numberOfStops: route.stops ? route.stops.length : 0,
        assignedBusesCount,
        activeBusesCount: activeBuses,
        totalTrips,
        averageUtilization,
        complaintsCount,
        incidentsCount,
        demandLevel,
      };
    });

    // Determine rankings
    const sortedByTrips = [...routeMetrics].sort((a, b) => b.totalTrips - a.totalTrips);
    const sortedByUtil = [...routeMetrics].sort((a, b) => a.averageUtilization - b.averageUtilization);
    const sortedByComplaints = [...routeMetrics].sort((a, b) => b.complaintsCount - a.complaintsCount);

    const busiestRoute = sortedByTrips[0] ? { name: sortedByTrips[0].routeName, code: sortedByTrips[0].routeCode, trips: sortedByTrips[0].totalTrips } : null;
    const leastUtilizedRoute = sortedByUtil[0] ? { name: sortedByUtil[0].routeName, code: sortedByUtil[0].routeCode, utilization: sortedByUtil[0].averageUtilization } : null;
    const routeWithMostComplaints = sortedByComplaints[0] ? { name: sortedByComplaints[0].routeName, code: sortedByComplaints[0].routeCode, complaints: sortedByComplaints[0].complaintsCount } : null;

    return {
      totalRoutes: routes.length,
      busiestRoute,
      leastUtilizedRoute,
      routeWithMostComplaints,
      routes: routeMetrics,
    };
  } catch (error) {
    console.error('[RouteAnalytics] Error generating route metrics:', error.message);
    throw error;
  }
};
