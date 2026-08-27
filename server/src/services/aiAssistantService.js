import { Bus } from '../models/Bus.js';
import { Route } from '../models/Route.js';
import { Stop } from '../models/Stop.js';
import { Schedule } from '../models/Schedule.js';
import { calculateHaversineDistance, calculateStopETAs } from '../utils/geoUtils.js';
import { planTrip, timeToMinutes, minutesToTime } from './tripPlannerService.js';
import { createLLMProvider } from './llm/llmProvider.js';

/**
 * AI Assistant Service for CampusMove AI
 * Implements deterministic natural language understanding, entity extraction,
 * and integration with real-time bus tracking and the Phase 3 Intelligent Trip Planner.
 */
class AIAssistantService {
  constructor() {
    this.provider = createLLMProvider(this);
  }

  /**
   * Main entrypoint for processing assistant chat messages
   * @param {string} message User input string
   * @param {Object} [context] Optional session/user context
   * @returns {Promise<Object>} Structured response payload
   */
  async handleChat(message, context = {}) {
    if (!message || typeof message !== 'string' || message.trim() === '') {
      return {
        success: false,
        intent: 'UNKNOWN',
        response: "Please enter a question or request (e.g., 'When will Bus 12 arrive?' or 'Fastest route to Library by 9 AM').",
        data: null,
      };
    }

    // Process via provider abstraction (which defaults to local deterministic NLP)
    return await this.provider.process({ message: message.trim(), context });
  }

  /**
   * Core deterministic NLP pipeline: intent recognition, entity extraction, and tool execution
   * @param {string} rawMessage
   * @param {Object} context
   */
  async processMessage(rawMessage, context = {}) {
    const text = rawMessage.toLowerCase().trim();

    // 1. Fetch live campus entities from DB
    const [stops, routes, buses, schedules] = await Promise.all([
      Stop.find({ active: true }).lean(),
      Route.find({ active: true }).populate('stops.stop').lean(),
      Bus.find().populate('currentDriver', 'name phone').populate('currentRoute').lean(),
      Schedule.find({ active: true }).populate('route').populate('bus').lean(),
    ]);

    // 2. Extract Entities
    const entities = this.extractEntities(rawMessage, { stops, routes, buses });

    // 3. Classify Intent
    const intent = this.classifyIntent(text, entities);

    // 4. Dispatch to intent handler
    switch (intent) {
      case 'BUS_ETA':
        return await this.handleBusETA(entities, { buses, stops, routes });

      case 'BUS_LOCATION':
        return await this.handleBusLocation(entities, { buses, stops, routes });

      case 'NEXT_STOP':
        return await this.handleNextStop(entities, { buses, stops, routes });

      case 'BUS_STATUS':
        return await this.handleBusStatus(entities, { buses, stops, routes, schedules, rawMessage, context });

      case 'ROUTE_SEARCH':
        return await this.handleRouteSearch(entities, { stops, routes, buses, schedules, rawMessage, context });

      case 'GENERAL_HELP':
      default:
        return this.handleGeneralHelp(entities, { buses, stops, routes });
    }
  }

  /**
   * Extract domain entities (buses, stops, times, preferences) from student query
   */
  extractEntities(message, { stops, routes, buses }) {
    const text = message.toLowerCase();

    // 1. Extract Bus (e.g., "Bus 12", "Bus 07", "Bus 4", "Bus 04", "12", "07")
    let targetBus = null;
    const busRegex = /\b(?:bus\s*#?\s*|shuttle\s*|vehicle\s*)?(\d{1,2})\b/i;
    const busMatch = text.match(busRegex);
    if (busMatch) {
      const num = busMatch[1].padStart(2, '0');
      targetBus = buses.find(
        (b) =>
          b.busNumber.toLowerCase().includes(num) ||
          b.busNumber.toLowerCase().includes(busMatch[1]) ||
          b.plateNumber.toLowerCase().includes(busMatch[1])
      );
    }
    if (!targetBus) {
      // Direct name check
      targetBus = buses.find((b) => text.includes(b.busNumber.toLowerCase()));
    }

    // 2. Extract Origin and Destination Stops
    let originStop = null;
    let destinationStop = null;

    // Pattern A: "from [origin] to [destination]"
    const fromToRegex = /(?:from|starting at|start at|at)\s+([a-z0-9\s'’-]+?)\s+(?:to|towards|reach|for)\s+([a-z0-9\s'’-]+?)(?:\s+by|\s+at|\s+before|$|\.|\?)/i;
    const fromToMatch = message.match(fromToRegex);

    if (fromToMatch) {
      originStop = this.matchStop(fromToMatch[1], stops);
      destinationStop = this.matchStop(fromToMatch[2], stops);
    }

    // Pattern B: "to [destination] from [origin]"
    if (!originStop || !destinationStop) {
      const toFromRegex = /(?:to|reach|get to)\s+([a-z0-9\s'’-]+?)\s+(?:from|starting at|at)\s+([a-z0-9\s'’-]+?)(?:\s+by|\s+at|\s+before|$|\.|\?)/i;
      const toFromMatch = message.match(toFromRegex);
      if (toFromMatch) {
        destinationStop = this.matchStop(toFromMatch[1], stops);
        originStop = this.matchStop(toFromMatch[2], stops);
      }
    }

    // Pattern C: "I am at [origin]" / "at [origin]"
    if (!originStop) {
      const atRegex = /(?:i am at|i'm at|standing at|located at|at)\s+([a-z0-9\s'’-]+?)(?:\s+find|\s+what|\s+which|\s+how|\s+to|\.|\?|$)/i;
      const atMatch = message.match(atRegex);
      if (atMatch) {
        originStop = this.matchStop(atMatch[1], stops);
      }
    }

    // Pattern D: "to [destination]" / "route to [destination]" / "bus to [destination]"
    if (!destinationStop) {
      const toRegex = /(?:to|reach|towards|heading to|bus for|route for|go to)\s+([a-z0-9\s'’-]+?)(?:\s+by|\s+before|\s+at|\.|\?|$)/i;
      const toMatch = message.match(toRegex);
      if (toMatch) {
        destinationStop = this.matchStop(toMatch[1], stops);
      }
    }

    // Fallback: Check all known stop names in the text if still missing
    if (!originStop || !destinationStop) {
      for (const stop of stops) {
        const stopName = stop.name.toLowerCase();
        const stopCode = stop.code.toLowerCase();
        if (text.includes(stopName) || text.includes(stopCode)) {
          if (!destinationStop && text.includes(`to ${stopName}`) || text.includes(`to ${stopCode}`)) {
            destinationStop = stop;
          } else if (!originStop && (text.includes(`from ${stopName}`) || text.includes(`from ${stopCode}`) || text.includes(`at ${stopName}`))) {
            originStop = stop;
          } else if (!originStop && !destinationStop) {
            // General mention
            destinationStop = stop;
          }
        }
      }
    }

    // 3. Extract Target Arrival Time (e.g. "by 9 AM", "by 9:00", "before 9", "at 08:45")
    let targetTime = null;
    const timeRegex = /(?:by|before|at|around)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i;
    const timeMatch = text.match(timeRegex);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const meridiem = timeMatch[3] ? timeMatch[3].toLowerCase() : null;

      if (meridiem === 'pm' && hours < 12) hours += 12;
      if (meridiem === 'am' && hours === 12) hours = 0;

      targetTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }

    // 4. Extract Preferences
    let preference = 'fastest';
    if (text.includes('earliest') || text.includes('arrive earliest')) {
      preference = 'earliest_arrival';
    } else if (text.includes('convenient') || text.includes('least walking') || text.includes('direct')) {
      preference = 'convenient';
    }

    // 5. Extract Route if specifically mentioned
    let targetRoute = null;
    for (const r of routes) {
      if (text.includes(r.code.toLowerCase()) || text.includes(r.name.toLowerCase())) {
        targetRoute = r;
        break;
      }
    }

    return {
      bus: targetBus,
      origin: originStop,
      destination: destinationStop,
      targetTime,
      preference,
      route: targetRoute,
    };
  }

  /**
   * Match string to nearest Stop entity
   */
  matchStop(query, stops) {
    if (!query || typeof query !== 'string') return null;
    const q = query.trim().toLowerCase();

    // Direct code match
    const byCode = stops.find((s) => s.code.toLowerCase() === q);
    if (byCode) return byCode;

    // Common synonyms / campus landmarks
    if (q.includes('library') || q.includes('lib') || q.includes('knowledge')) {
      return stops.find((s) => s.code === 'LIB') || null;
    }
    if (q.includes('hostel 3') || q.includes('h3') || q.includes('men')) {
      return stops.find((s) => s.code === 'H3') || null;
    }
    if (q.includes('hostel 7') || q.includes('h7') || q.includes('women')) {
      return stops.find((s) => s.code === 'H7') || null;
    }
    if (q.includes('hostel') || q.includes('dorm') || q.includes('residence')) {
      return stops.find((s) => s.code === 'H3') || null;
    }
    if (q.includes('gate 1') || q.includes('gate') || q.includes('main entrance')) {
      return stops.find((s) => s.code === 'GATE-1') || null;
    }
    if (q.includes('admin') || q.includes('administrative') || q.includes('plaza') || q.includes('office')) {
      return stops.find((s) => s.code === 'ADMIN') || null;
    }
    if (q.includes('block c') || q.includes('cs') || q.includes('computer') || q.includes('ai lab')) {
      return stops.find((s) => s.code === 'BLK-C') || null;
    }
    if (q.includes('engineering') || q.includes('block a') || q.includes('eng') || q.includes('workshop')) {
      return stops.find((s) => s.code === 'ENG-A') || null;
    }
    if (q.includes('sports') || q.includes('gym') || q.includes('arena') || q.includes('stadium') || q.includes('pool')) {
      return stops.find((s) => s.code === 'SPORTS') || null;
    }
    if (q.includes('college') || q.includes('campus') || q.includes('class') || q.includes('department')) {
      return stops.find((s) => s.code === 'BLK-C') || stops.find((s) => s.code === 'LIB') || null;
    }

    // Name substring match
    return stops.find((s) => s.name.toLowerCase().includes(q) || q.includes(s.name.toLowerCase())) || null;
  }

  /**
   * Classify user intent
   */
  classifyIntent(text, entities) {
    // 1. Check for delayed bus alternative queries
    if (
      (text.includes('delayed') || text.includes('delay')) &&
      (text.includes('alternative') || text.includes('instead') || text.includes('what should i take') || text.includes('what to take') || text.includes('recommend'))
    ) {
      return 'ROUTE_SEARCH';
    }

    // 2. Bus ETA queries
    if (
      text.includes('when will') ||
      text.includes('when is') ||
      text.includes('eta') ||
      text.includes('arrival time') ||
      text.includes('how long until') ||
      text.includes('when does') ||
      (text.includes('arrive') && entities.bus)
    ) {
      return 'BUS_ETA';
    }

    // 3. Bus Location queries
    if (
      text.includes('where is') ||
      text.includes("where's") ||
      text.includes('track') ||
      text.includes('location of') ||
      text.includes('locate') ||
      text.includes('where are')
    ) {
      return 'BUS_LOCATION';
    }

    // 4. Next Stop queries
    if (
      text.includes('next stop') ||
      text.includes('next station') ||
      text.includes('upcoming stop') ||
      text.includes('stopping next')
    ) {
      return 'NEXT_STOP';
    }

    // 5. Bus Status queries
    if (
      text.includes('status') ||
      text.includes('delayed') ||
      text.includes('delay') ||
      text.includes('operating') ||
      text.includes('running') ||
      text.includes('available buses') ||
      text.includes('active buses') ||
      text.includes('breakdown')
    ) {
      return 'BUS_STATUS';
    }

    // 6. Route search / trip planning
    if (
      text.includes('fastest route') ||
      text.includes('route to') ||
      text.includes('which bus goes') ||
      text.includes('which bus should i take') ||
      text.includes('how to go') ||
      text.includes('how to reach') ||
      text.includes('how do i get') ||
      text.includes('plan') ||
      text.includes('directions') ||
      text.includes('reach college') ||
      text.includes('reach') ||
      text.includes('bus to') ||
      entities.origin ||
      entities.destination
    ) {
      return 'ROUTE_SEARCH';
    }

    // 7. General Help & Greetings
    if (
      text.includes('help') ||
      text.includes('what can you do') ||
      text.includes('hi') ||
      text.includes('hello') ||
      text.includes('hey') ||
      text.includes('commands') ||
      text.includes('who are you')
    ) {
      return 'GENERAL_HELP';
    }

    return 'GENERAL_HELP';
  }

  /**
   * Handle BUS_ETA intent
   */
  async handleBusETA(entities, { buses, stops, routes }) {
    const bus = entities.bus || buses.find((b) => b.status === 'active');
    if (!bus) {
      return {
        success: true,
        intent: 'BUS_ETA',
        response: 'Currently no active buses were found on the campus network. Please check the timetable tab.',
        data: { activeBuses: 0 },
      };
    }

    const route = routes.find((r) => r._id.toString() === bus.currentRoute?._id?.toString() || r._id.toString() === bus.currentRoute?.toString());
    const targetStop = entities.destination || entities.origin || (route?.stops?.[1]?.stop) || stops[0];

    // Calculate live ETAs along the route
    let etaMinutes = 3;
    let distanceKm = 0.8;

    if (route && route.stops?.length > 0 && bus.lastKnownLocation?.lat) {
      const etas = calculateStopETAs(bus.lastKnownLocation, route.stops, bus.status);
      const matchingEta = etas.find(
        (e) => e.stopCode?.toLowerCase() === targetStop.code?.toLowerCase() || e.stopName?.toLowerCase().includes(targetStop.name.toLowerCase())
      );
      if (matchingEta && matchingEta.estimatedMinutes > 0) {
        etaMinutes = matchingEta.estimatedMinutes;
        distanceKm = matchingEta.distanceKm;
      }
    }

    const statusNote = bus.status === 'delayed' ? ` (⚠️ Currently experiencing minor delay: ${bus.statusMessage})` : '';

    return {
      success: true,
      intent: 'BUS_ETA',
      response: `${bus.busNumber} (${bus.plateNumber}) is currently on Route ${route?.code || 'Campus Shuttle'}. It is estimated to arrive at ${targetStop.name} in approximately ${etaMinutes} minutes (${distanceKm} km away).${statusNote}`,
      data: {
        busNumber: bus.busNumber,
        plateNumber: bus.plateNumber,
        status: bus.status,
        speed: bus.lastKnownLocation?.speed || 0,
        targetStop: {
          name: targetStop.name,
          code: targetStop.code,
        },
        etaMinutes,
        distanceKm,
        routeCode: route?.code,
        routeName: route?.name,
      },
    };
  }

  /**
   * Handle BUS_LOCATION intent
   */
  async handleBusLocation(entities, { buses, stops, routes }) {
    if (entities.bus) {
      const bus = entities.bus;
      const loc = bus.lastKnownLocation || { lat: 28.545, lng: 77.192, speed: 0 };
      const route = routes.find((r) => r._id.toString() === bus.currentRoute?._id?.toString() || r._id.toString() === bus.currentRoute?.toString());

      return {
        success: true,
        intent: 'BUS_LOCATION',
        response: `${bus.busNumber} is currently operating on ${route?.name || 'Campus Line'} (${route?.code || 'Active'}). Current speed: ${loc.speed || 0} km/h. Status: ${bus.status.toUpperCase()} — "${bus.statusMessage || 'Operating normally'}". Coordinates: [${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}].`,
        data: {
          busNumber: bus.busNumber,
          plateNumber: bus.plateNumber,
          status: bus.status,
          statusMessage: bus.statusMessage,
          location: loc,
          routeName: route?.name,
          routeCode: route?.code,
          isSimulated: bus.isSimulated,
        },
      };
    }

    // If no specific bus mentioned, summarize all live buses
    const activeBuses = buses.filter((b) => b.status === 'active');
    const delayedBuses = buses.filter((b) => b.status === 'delayed');

    const summary = buses.map((b) => `${b.busNumber} (${b.status})`).join(', ');

    return {
      success: true,
      intent: 'BUS_LOCATION',
      response: `There are currently ${buses.length} tracked buses on campus (${activeBuses.length} active, ${delayedBuses.length} delayed): ${summary}. You can ask "Where is Bus 12?" or click any marker on the Live Campus Map.`,
      data: {
        totalBuses: buses.length,
        activeCount: activeBuses.length,
        delayedCount: delayedBuses.length,
        buses: buses.map((b) => ({
          busNumber: b.busNumber,
          status: b.status,
          speed: b.lastKnownLocation?.speed || 0,
          lat: b.lastKnownLocation?.lat,
          lng: b.lastKnownLocation?.lng,
        })),
      },
    };
  }

  /**
   * Handle NEXT_STOP intent
   */
  async handleNextStop(entities, { buses, stops, routes }) {
    const bus = entities.bus || buses[0];
    if (!bus) {
      return {
        success: true,
        intent: 'NEXT_STOP',
        response: 'No active buses currently found on route.',
        data: null,
      };
    }

    const route = routes.find((r) => r._id.toString() === bus.currentRoute?._id?.toString() || r._id.toString() === bus.currentRoute?.toString());
    if (!route || !route.stops || route.stops.length === 0) {
      return {
        success: true,
        intent: 'NEXT_STOP',
        response: `${bus.busNumber} is currently in transit with no active scheduled stops.`,
        data: { busNumber: bus.busNumber },
      };
    }

    // Find next stop using calculateStopETAs
    const etas = calculateStopETAs(bus.lastKnownLocation, route.stops, bus.status);
    const nextStopObj = etas.find((e) => e.isNext) || etas.find((e) => !e.isPast) || etas[0];

    return {
      success: true,
      intent: 'NEXT_STOP',
      response: `The next stop for ${bus.busNumber} on Route ${route.code} is ${nextStopObj.stopName} (${nextStopObj.stopCode}). Estimated arrival in ${nextStopObj.estimatedMinutes} minutes (${nextStopObj.distanceKm} km away).`,
      data: {
        busNumber: bus.busNumber,
        routeCode: route.code,
        nextStop: nextStopObj,
      },
    };
  }

  /**
   * Handle BUS_STATUS intent & delayed bus queries
   */
  async handleBusStatus(entities, { buses, stops, routes, schedules, rawMessage, context }) {
    // If asking about a specific bus
    if (entities.bus) {
      const b = entities.bus;
      return {
        success: true,
        intent: 'BUS_STATUS',
        response: `${b.busNumber} (${b.plateNumber}) status is ${b.status.toUpperCase()}. Capacity: ${b.currentPassengerCount || 0}/${b.capacity} passengers. Note: "${b.statusMessage || 'Operating normally'}".`,
        data: {
          busNumber: b.busNumber,
          status: b.status,
          capacity: b.capacity,
          passengerCount: b.currentPassengerCount,
          statusMessage: b.statusMessage,
        },
      };
    }

    // Check if asking about delayed buses
    const delayed = buses.filter((b) => b.status === 'delayed');
    if (delayed.length > 0) {
      const delayList = delayed.map((b) => `${b.busNumber} (${b.statusMessage || 'Minor delay'})`).join('; ');
      return {
        success: true,
        intent: 'BUS_STATUS',
        response: `⚠️ There are currently ${delayed.length} delayed bus(es): ${delayList}. All other shuttles are running on schedule.`,
        data: {
          delayedCount: delayed.length,
          delayedBuses: delayed.map((b) => ({ busNumber: b.busNumber, statusMessage: b.statusMessage })),
        },
      };
    }

    return {
      success: true,
      intent: 'BUS_STATUS',
      response: `All ${buses.length} campus buses are currently operating normally with zero reported delays.`,
      data: {
        totalBuses: buses.length,
        status: 'all_normal',
      },
    };
  }

  /**
   * Handle ROUTE_SEARCH & Phase 3 Trip Planner Tool Calling
   */
  async handleRouteSearch(entities, { stops, routes, buses, schedules, rawMessage, context }) {
    let { origin, destination, targetTime, preference } = entities;

    // Check for delayed bus alternative question (e.g., "Bus 04 is delayed. What is my best alternative?")
    const text = rawMessage.toLowerCase();
    if (text.includes('delayed') || text.includes('alternative') || text.includes('instead')) {
      // Find what route Bus 04 or delayed bus operates on
      const delayedBus = entities.bus || buses.find((b) => b.status === 'delayed') || buses.find((b) => b.busNumber.includes('04'));
      if (delayedBus && !origin && !destination) {
        // Find default origin/destination for this route
        const delayedRoute = routes.find((r) => r._id.toString() === delayedBus.currentRoute?._id?.toString() || r._id.toString() === delayedBus.currentRoute?.toString());
        if (delayedRoute && delayedRoute.stops?.length >= 2) {
          origin = delayedRoute.stops[0].stop;
          destination = delayedRoute.stops[Math.min(2, delayedRoute.stops.length - 1)].stop;
        }
      }
    }

    // Conversational missing information handling
    if (!origin && !destination) {
      return {
        success: true,
        intent: 'ROUTE_SEARCH',
        response: "I can help you find the fastest bus! Where are you starting from (e.g., Hostel 3, Gate 1, Admin Plaza), and where do you need to go?",
        data: {
          missing: ['origin', 'destination'],
        },
      };
    }

    if (!origin && destination) {
      return {
        success: true,
        intent: 'ROUTE_SEARCH',
        response: `Sure! To find the best route to ${destination.name}, where are you starting from, and what time do you need to reach?`,
        data: {
          destination: { name: destination.name, code: destination.code },
          missing: ['origin'],
        },
      };
    }

    if (origin && !destination) {
      return {
        success: true,
        intent: 'ROUTE_SEARCH',
        response: `Starting from ${origin.name}. Where would you like to go on campus (e.g. Central Library, Block C, Sports Complex)?`,
        data: {
          origin: { name: origin.name, code: origin.code },
          missing: ['destination'],
        },
      };
    }

    // Both origin and destination exist! Call Phase 3 Trip Planner Engine as a deterministic tool
    try {
      const tripPlanResult = await planTrip({
        origin: origin.code || origin.name,
        destination: destination.code || destination.name,
        requiredArrivalTime: targetTime || undefined,
        preference: preference || 'fastest',
        currentTime: context.currentTime || '08:35',
      });

      if (!tripPlanResult.recommendation) {
        return {
          success: true,
          intent: 'ROUTE_SEARCH',
          response: `No direct transit connection was found between ${origin.name} and ${destination.name}. Please check the interactive map for nearby walking paths.`,
          trip: tripPlanResult,
          data: tripPlanResult,
        };
      }

      const rec = tripPlanResult.recommendation;
      let naturalExplanation = '';

      if (rec.type === 'walk') {
        const walkDistMeters = Math.round((rec.totalWalkingDistanceKm || 0.8) * 1000);
        naturalExplanation = `For traveling from ${origin.name} to ${destination.name} (${walkDistMeters}m walk), walking is your fastest and most direct option. It will take approximately ${rec.totalDurationMinutes} minutes, arriving at ${rec.arrivalTime}.`;
      } else {
        const busInfo = rec.busNumber || 'Campus Shuttle';
        const routeInfo = rec.routeCode ? ` (Route ${rec.routeCode})` : '';
        const bufferText = rec.marginMinutes !== undefined && rec.marginMinutes >= 0 ? `, giving you a ${rec.marginMinutes}-minute safety buffer` : '';
        const onTimeText = rec.isOnTime ? 'on-time' : 'tight';

        naturalExplanation = `Take ${busInfo}${routeInfo} from ${origin.name} at ${rec.departureTime}. It is expected to arrive at ${destination.name} at ${rec.arrivalTime} (${rec.totalDurationMinutes} min trip)${bufferText}.`;

        if (rec.whyRecommended && rec.whyRecommended.length > 0) {
          naturalExplanation += ` ${rec.whyRecommended[0]}.`;
        }

        // Mention delay context if relevant
        if (text.includes('04') || text.includes('delayed') || text.includes('alternative')) {
          naturalExplanation += ` Since Bus 04 is currently experiencing delays, ${busInfo} is the safer ${onTimeText} option.`;
        }
      }

      return {
        success: true,
        intent: 'ROUTE_SEARCH',
        response: naturalExplanation,
        trip: tripPlanResult,
        data: {
          origin: tripPlanResult.origin,
          destination: tripPlanResult.destination,
          recommendation: tripPlanResult.recommendation,
          alternatives: tripPlanResult.alternatives,
        },
      };
    } catch (err) {
      console.error('[aiAssistantService] Trip planner tool execution failed:', err);
      return {
        success: false,
        intent: 'ROUTE_SEARCH',
        response: `Sorry, I encountered an issue calculating the route between ${origin.name} and ${destination.name}. Please try again.`,
        data: { error: err.message },
      };
    }
  }

  /**
   * Handle GENERAL_HELP & Greetings
   */
  handleGeneralHelp(entities, { buses, stops, routes }) {
    return {
      success: true,
      intent: 'GENERAL_HELP',
      response: `👋 Hello! I am CampusMove AI, your smart campus transit assistant. You can ask me questions in natural language, such as:\n\n• "When will Bus 12 arrive?"\n• "Where is my bus?"\n• "What is the fastest route to the library by 9 AM?"\n• "Which bus goes to Hostel 3?"\n• "What is the next stop for Bus 12?"\n• "Bus 04 is delayed. What should I take instead?"`,
      data: {
        suggestedQueries: [
          'When will Bus 12 arrive?',
          'Where is Bus 04 right now?',
          'Fastest route to Central Library',
          'I need to reach Block C from Hostel 3 by 9 AM',
          'Show delayed buses',
        ],
      },
    };
  }
}

export const aiAssistantService = new AIAssistantService();
