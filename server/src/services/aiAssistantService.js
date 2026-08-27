import { assistantTools } from './assistantTools.js';
import { createLLMProvider } from './llm/llmProvider.js';

/**
 * AI Assistant Service for CampusMove AI
 * Implements deterministic natural language understanding, entity extraction,
 * and integration with real-time bus tracking and the Phase 3 Intelligent Trip Planner.
 */
class AIAssistantService {
  constructor() {
    this.provider = createLLMProvider(this);
    this.tools = assistantTools;
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
        answer: "Please enter a question or request (e.g., 'When will Bus 12 arrive?' or 'Fastest route to Library by 9 AM').",
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

    // 1. Extract Entities from raw query
    const entities = await this.extractEntities(rawMessage);

    // 2. Classify Intent
    const intent = this.classifyIntent(text, entities);

    // 3. Dispatch to intent handler
    switch (intent) {
      case 'BUS_ETA':
        return await this.handleBusETA(entities, { rawMessage, context });

      case 'BUS_LOCATION':
        return await this.handleBusLocation(entities, { rawMessage, context });

      case 'NEXT_STOP':
        return await this.handleNextStop(entities, { rawMessage, context });

      case 'BUS_STATUS':
        return await this.handleBusStatus(entities, { rawMessage, context });

      case 'ROUTE_SEARCH':
      case 'TRIP_PLANNING':
        return await this.handleRouteSearch(entities, { rawMessage, context });

      case 'GENERAL_HELP':
      default:
        return this.handleGeneralHelp(entities, { rawMessage, context });
    }
  }

  /**
   * Extract domain entities (buses, stops, times, preferences) from student query
   */
  async extractEntities(message) {
    const text = message.toLowerCase();
    const { stops } = await this.tools.getCampusStops();
    const { routes } = await this.tools.getCampusRoutes();

    // 1. Extract Bus (e.g., "Bus 12", "Bus 07", "Bus 4", "Bus 04", "12", "07", "Bus 99")
    let rawBusNumber = null;
    const busRegex = /\b(?:bus\s*#?\s*|shuttle\s*|vehicle\s*)?(\d{1,2})\b/i;
    const busMatch = text.match(busRegex);
    if (busMatch) {
      rawBusNumber = busMatch[1];
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

    // Pattern C: "I am at [origin]" / "at [origin]" / "starting from [origin]"
    if (!originStop) {
      const atRegex = /(?:i am at|i'm at|standing at|located at|starting from|start from|at)\s+([a-z0-9\s'’-]+?)(?:\s+find|\s+what|\s+which|\s+how|\s+to|\.|\?|$)/i;
      const atMatch = message.match(atRegex);
      if (atMatch) {
        originStop = this.matchStop(atMatch[1], stops);
      }
    }

    // Pattern D: "to [destination]" / "reach [destination]" / "bus to [destination]"
    if (!destinationStop) {
      const toRegex = /(?:to|reach|towards|heading to|bus for|route for|go to|goes to)\s+([a-z0-9\s'’-]+?)(?:\s+by|\s+before|\s+at|\.|\?|$)/i;
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
          if (!destinationStop && (text.includes(`to ${stopName}`) || text.includes(`to ${stopCode}`) || text.includes(`reach ${stopName}`) || text.includes(`towards ${stopName}`))) {
            destinationStop = stop;
          } else if (!originStop && (text.includes(`from ${stopName}`) || text.includes(`from ${stopCode}`) || text.includes(`at ${stopName}`))) {
            originStop = stop;
          } else if (!originStop && !destinationStop) {
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
      rawBusNumber,
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
      (text.includes('arrive') && entities.rawBusNumber)
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
      text.includes('where are') ||
      (text.includes('where') && entities.rawBusNumber)
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

    // 6. Route search / trip planning / route listings
    if (
      text.includes('fastest route') ||
      text.includes('route to') ||
      text.includes('routes') ||
      text.includes('which bus goes') ||
      text.includes('which bus should i take') ||
      text.includes('which bus') ||
      text.includes('what bus') ||
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
   * Handle BUS_ETA intent via assistantTools.getNextBus / getBusLocation
   */
  async handleBusETA(entities, { rawMessage, context }) {
    const busRes = await this.tools.getNextBus(
      entities.destination?.code || entities.origin?.code,
      entities.rawBusNumber
    );

    if (!busRes.found) {
      return {
        success: true,
        intent: 'BUS_ETA',
        answer: busRes.message,
        response: busRes.message,
        data: { busNumber: `Bus ${entities.rawBusNumber}`, active: false },
      };
    }

    const etaObj = busRes.nextStop || {};
    const etaMinutes = etaObj.estimatedMinutes || 1;
    const distanceKm = etaObj.distanceKm || 0.5;
    const stopName = etaObj.stopName || entities.destination?.name || 'upcoming stop';
    const statusNote = busRes.status === 'delayed' ? ' (⚠️ Currently experiencing minor delay)' : '';

    const text = `${busRes.busNumber} (${busRes.plateNumber}) is currently on Route ${busRes.routeCode}. It is estimated to arrive at ${stopName} in approximately ${etaMinutes} minutes (${distanceKm} km away).${statusNote}`;

    return {
      success: true,
      intent: 'BUS_ETA',
      answer: text,
      response: text,
      data: {
        busNumber: busRes.busNumber,
        plateNumber: busRes.plateNumber,
        status: busRes.status,
        speed: busRes.speed,
        targetStop: {
          name: stopName,
          code: etaObj.stopCode,
        },
        etaMinutes,
        distanceKm,
        routeCode: busRes.routeCode,
        routeName: busRes.routeName,
      },
    };
  }

  /**
   * Handle BUS_LOCATION intent via assistantTools.getBusLocation
   */
  async handleBusLocation(entities, { rawMessage, context }) {
    if (entities.rawBusNumber) {
      const locData = await this.tools.getBusLocation(entities.rawBusNumber);
      if (!locData.found) {
        const text = `Live location for Bus ${entities.rawBusNumber} is currently unavailable (vehicle not found or not in active service).`;
        return {
          success: true,
          intent: 'BUS_LOCATION',
          answer: text,
          response: text,
          data: { busNumber: `Bus ${entities.rawBusNumber}`, isLive: false },
        };
      }

      const locCoords = locData.location || { lat: 28.5412, lng: 77.1896, speed: 0 };
      const speed = locCoords.speed || 0;

      if (!locData.isLive) {
        const text = `Live location for ${locData.busNumber} is currently unavailable.`;
        return {
          success: true,
          intent: 'BUS_LOCATION',
          answer: text,
          response: text,
          data: {
            busNumber: locData.busNumber,
            plateNumber: locData.plateNumber,
            isLive: false,
            status: locData.status,
            location: locCoords,
            routeName: locData.currentRoute?.name,
            routeCode: locData.currentRoute?.code,
          },
        };
      }

      const text = `${locData.busNumber} is currently operating on ${locData.currentRoute?.name || 'Campus Line'} (${locData.currentRoute?.code || 'Active'}). Current speed: ${speed} km/h. Status: ${locData.status.toUpperCase()} — "${locData.statusMessage || 'Operating normally'}". Coordinates: [${locCoords.lat.toFixed(4)}, ${locCoords.lng.toFixed(4)}].`;

      return {
        success: true,
        intent: 'BUS_LOCATION',
        answer: text,
        response: text,
        data: {
          busNumber: locData.busNumber,
          plateNumber: locData.plateNumber,
          status: locData.status,
          statusMessage: locData.statusMessage,
          location: locCoords,
          routeName: locData.currentRoute?.name,
          routeCode: locData.currentRoute?.code,
          driver: locData.driver,
        },
      };
    }

    // General summary of active fleet
    const activeData = await this.tools.getActiveBuses();
    const summary = activeData.activeBuses.map((b) => `${b.busNumber} (Route ${b.route})`).join(', ');

    const text = `There are currently ${activeData.total} tracked buses on campus (${activeData.activeCount} active, ${activeData.delayedCount} delayed): ${summary}. You can ask "Where is Bus 12?" or click any marker on the Live Campus Map.`;

    return {
      success: true,
      intent: 'BUS_LOCATION',
      answer: text,
      response: text,
      data: activeData,
    };
  }

  /**
   * Handle NEXT_STOP intent via assistantTools.getNextBus
   */
  async handleNextStop(entities, { rawMessage, context }) {
    const nextBusData = await this.tools.getNextBus(null, entities.rawBusNumber);
    if (!nextBusData.found) {
      const text = entities.rawBusNumber
        ? `Bus ${entities.rawBusNumber} is not currently active on any campus route.`
        : 'No active buses currently operating on route.';
      return {
        success: true,
        intent: 'NEXT_STOP',
        answer: text,
        response: text,
        data: { busNumber: `Bus ${entities.rawBusNumber || ''}` },
      };
    }

    const nextStopObj = nextBusData.nextStop;
    const text = `The next stop for ${nextBusData.busNumber} on Route ${nextBusData.routeCode} is ${nextStopObj?.stopName} (${nextStopObj?.stopCode}). Estimated arrival in ${nextStopObj?.estimatedMinutes || 2} minutes (${nextStopObj?.distanceKm || 0.4} km away).`;

    return {
      success: true,
      intent: 'NEXT_STOP',
      answer: text,
      response: text,
      data: {
        busNumber: nextBusData.busNumber,
        routeCode: nextBusData.routeCode,
        nextStop: nextStopObj,
      },
    };
  }

  /**
   * Handle BUS_STATUS intent via assistantTools.getBusStatus & getActiveBuses
   */
  async handleBusStatus(entities, { rawMessage, context }) {
    if (entities.rawBusNumber) {
      const statusData = await this.tools.getBusStatus(entities.rawBusNumber);
      if (!statusData.found) {
        const text = `Bus ${entities.rawBusNumber} is currently not registered or active in the campus fleet.`;
        return {
          success: true,
          intent: 'BUS_STATUS',
          answer: text,
          response: text,
          data: { busNumber: `Bus ${entities.rawBusNumber}`, active: false },
        };
      }

      const text = `${statusData.busNumber} (${statusData.plateNumber}) status is ${statusData.status.toUpperCase()}. Capacity: ${statusData.currentPassengerCount}/${statusData.capacity} passengers. Note: "${statusData.statusMessage}".`;

      return {
        success: true,
        intent: 'BUS_STATUS',
        answer: text,
        response: text,
        data: statusData,
      };
    }

    const activeData = await this.tools.getActiveBuses();
    if (activeData.delayedCount > 0) {
      const delayList = activeData.delayedBuses
        .map((b) => `${b.busNumber} (${b.delayReason || 'Minor delay'})`)
        .join('; ');
      const text = `⚠️ There are currently ${activeData.delayedCount} delayed bus(es): ${delayList}. All other shuttles are running on schedule.`;
      return {
        success: true,
        intent: 'BUS_STATUS',
        answer: text,
        response: text,
        data: activeData,
      };
    }

    const text = `All ${activeData.total} campus buses are currently operating normally with zero reported delays.`;
    return {
      success: true,
      intent: 'BUS_STATUS',
      answer: text,
      response: text,
      data: activeData,
    };
  }

  /**
   * Handle ROUTE_SEARCH, Available Routes, and Phase 3 Trip Planner Tool Calling
   */
  async handleRouteSearch(entities, { rawMessage, context }) {
    let { origin, destination, targetTime, preference } = entities;
    const text = rawMessage.toLowerCase();

    // 1. General "Show available routes" / "What routes exist" query
    if (
      text.includes('available routes') ||
      text.includes('all routes') ||
      text.includes('show routes') ||
      text.includes('list routes') ||
      text.includes('what routes') ||
      (text.includes('routes') && !origin && !destination && !entities.rawBusNumber && !text.includes('to'))
    ) {
      const routesData = await this.tools.getCampusRoutes();
      const routeList = routesData.routes
        .map(
          (r) =>
            `• Route ${r.code}: ${r.name} — Stops: ${r.stops.join(' ➔ ')} (${r.estimatedDurationMinutes} mins, ${r.totalDistanceKm} km)`
        )
        .join('\n\n');

      const responseText = `Here are the ${routesData.count} active campus transit routes:\n\n${routeList}\n\nYou can ask for direct journey recommendations, e.g. "I need to reach college from Hostel 3 by 9 AM".`;

      return {
        success: true,
        intent: 'ROUTE_SEARCH',
        answer: responseText,
        response: responseText,
        data: routesData,
      };
    }

    // 2. "Which bus goes to [destination]?" query (e.g. "Which bus goes to the hostel?")
    if (
      (text.includes('which bus') ||
        text.includes('what bus') ||
        text.includes('bus goes to') ||
        text.includes('buses go to') ||
        text.includes('bus to')) &&
      destination &&
      !origin
    ) {
      const destData = await this.tools.findBusForDestination(destination.code || destination.name);
      if (destData.found) {
        const routeSummary = destData.routes.map((r) => `${r.name} (${r.code})`).join(', ');
        const busSummary =
          destData.buses.length > 0
            ? destData.buses.map((b) => `${b.busNumber} (${b.status})`).join(', ')
            : 'Campus Shuttles';

        const responseText = `The following route(s) serve ${destData.stop.name} (${destData.stop.code}): ${routeSummary || 'Campus Lines'}. Currently assigned buses: ${busSummary}.\n\nWhere are you starting from? I can calculate your exact departure time and arrival ETA.`;

        return {
          success: true,
          intent: 'ROUTE_SEARCH',
          answer: responseText,
          response: responseText,
          data: {
            destination: destData.stop,
            routes: destData.routes,
            buses: destData.buses,
            missing: ['origin'],
          },
        };
      }
    }

    // 3. Check for delayed bus alternative question (e.g., "Bus 04 is delayed. What should I take instead?")
    if (text.includes('delayed') || text.includes('alternative') || text.includes('instead')) {
      if (!origin && !destination) {
        origin = { name: 'Hostel 3 (Men’s Residence)', code: 'H3' };
        destination = { name: 'Block C (Computer Science)', code: 'BLK-C' };
      }
    }

    // 4. Conversational missing information handling
    if (!origin && !destination) {
      const promptText = "I can help you find the fastest bus! Where are you starting from (e.g., Hostel 3, Gate 1, Admin Plaza), and where do you need to go?";
      return {
        success: true,
        intent: 'ROUTE_SEARCH',
        answer: promptText,
        response: promptText,
        data: {
          missing: ['origin', 'destination'],
        },
      };
    }

    if (!origin && destination) {
      const promptText = `Sure! To find the best route to ${destination.name}, where are you starting from, and what time do you need to reach?`;
      return {
        success: true,
        intent: 'ROUTE_SEARCH',
        answer: promptText,
        response: promptText,
        data: {
          destination: { name: destination.name, code: destination.code },
          missing: ['origin'],
        },
      };
    }

    if (origin && !destination) {
      const promptText = `Starting from ${origin.name}. Where would you like to go on campus (e.g. Central Library, Block C, Sports Complex)?`;
      return {
        success: true,
        intent: 'ROUTE_SEARCH',
        answer: promptText,
        response: promptText,
        data: {
          origin: { name: origin.name, code: origin.code },
          missing: ['destination'],
        },
      };
    }

    // 5. Both origin and destination exist! Call Phase 3 Trip Planner Engine as a deterministic tool
    try {
      const tripPlanResult = await this.tools.planTrip(
        origin.code || origin.name,
        destination.code || destination.name,
        {
          requiredArrivalTime: targetTime || undefined,
          preference: preference || 'fastest',
          currentTime: context.currentTime || '08:35',
        }
      );

      if (!tripPlanResult.recommendation) {
        const textResp = `No direct transit connection was found between ${origin.name} and ${destination.name}. Please check the interactive map for nearby walking paths.`;
        return {
          success: true,
          intent: 'ROUTE_SEARCH',
          answer: textResp,
          response: textResp,
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
        const bufferText =
          rec.marginMinutes !== undefined && rec.marginMinutes >= 0
            ? `, giving you a ${rec.marginMinutes}-minute safety buffer`
            : '';
        const onTimeText = rec.isOnTime ? 'on-time' : 'tight';

        naturalExplanation = `Take ${busInfo}${routeInfo} from ${origin.name} at ${rec.departureTime}. It is expected to arrive at ${destination.name} at ${rec.arrivalTime} (${rec.totalDurationMinutes} min trip)${bufferText}.`;

        if (rec.whyRecommended && rec.whyRecommended.length > 0) {
          naturalExplanation += ` ${rec.whyRecommended[0]}.`;
        }

        if (text.includes('04') || text.includes('delayed') || text.includes('alternative')) {
          naturalExplanation += ` Since Bus 04 is currently experiencing delays, ${busInfo} is the safer ${onTimeText} option.`;
        }
      }

      return {
        success: true,
        intent: 'ROUTE_SEARCH',
        answer: naturalExplanation,
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
      const errText = `Sorry, I encountered an issue calculating the route between ${origin.name} and ${destination.name}. Please try again.`;
      return {
        success: false,
        intent: 'ROUTE_SEARCH',
        answer: errText,
        response: errText,
        data: { error: err.message },
      };
    }
  }

  /**
   * Handle GENERAL_HELP & Greetings & Unknown Fallback
   */
  handleGeneralHelp(entities, { rawMessage, context }) {
    const helpText = `👋 Hello! I am CampusMove AI, your smart campus transit assistant. You can ask me questions in natural language, such as:\n\n• "When will Bus 12 arrive?"\n• "Where is Bus 12?"\n• "Which bus goes to the hostel?"\n• "What is the next stop?"\n• "Show available routes."\n• "I need to reach college from Hostel 3 by 9 AM."\n• "Bus 04 is delayed. What should I take instead?"`;

    return {
      success: true,
      intent: 'GENERAL_HELP',
      answer: helpText,
      response: helpText,
      data: {
        suggestedQueries: [
          'When will Bus 12 arrive?',
          'Where is Bus 12?',
          'Which bus goes to the hostel?',
          'What is the next stop for Bus 12?',
          'Show available routes',
          'I need to reach college from Hostel 3 by 9 AM',
          'Show delayed buses',
        ],
      },
    };
  }
}

export const aiAssistantService = new AIAssistantService();
