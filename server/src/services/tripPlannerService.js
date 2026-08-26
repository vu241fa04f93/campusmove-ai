import { Stop } from '../models/Stop.js';
import { Route } from '../models/Route.js';
import { Bus } from '../models/Bus.js';
import { Schedule } from '../models/Schedule.js';
import { calculateHaversineDistance, calculateStopETAs } from '../utils/geoUtils.js';

/**
 * Convert "HH:MM" (24h) string to minutes from midnight
 */
export const timeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return 0;
  const hours = parseInt(parts[0], 10) || 0;
  const mins = parseInt(parts[1], 10) || 0;
  return hours * 60 + mins;
};

/**
 * Convert minutes from midnight to "HH:MM" 24h string
 */
export const minutesToTime = (totalMinutes) => {
  if (isNaN(totalMinutes)) return '00:00';
  let normalized = Math.round(totalMinutes) % (24 * 60);
  if (normalized < 0) normalized += 24 * 60;
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

/**
 * Calculate walking duration in minutes at standard campus walking speed (4.8 km/h = 80m/min)
 */
export const calculateWalkDurationMinutes = (distanceKm) => {
  if (!distanceKm || distanceKm <= 0) return 0;
  // 4.8 km/h = 0.08 km/min
  return Math.max(1, Math.round((distanceKm / 4.8) * 60));
};

/**
 * Resolve Stop entity by MongoDB ObjectId, exact stop code, or name matching
 */
const resolveStop = (stopInput, allStops) => {
  if (!stopInput) return null;
  const inputStr = String(stopInput).trim();

  // 1. Direct ID match
  const byId = allStops.find((s) => s._id.toString() === inputStr);
  if (byId) return byId;

  // 2. Exact code match (e.g. "H3", "BLK-C", "LIB")
  const byCode = allStops.find((s) => s.code.toLowerCase() === inputStr.toLowerCase());
  if (byCode) return byCode;

  // 3. Name match
  const byNameExact = allStops.find((s) => s.name.toLowerCase() === inputStr.toLowerCase());
  if (byNameExact) return byNameExact;

  const byNameSubstring = allStops.find(
    (s) =>
      s.name.toLowerCase().includes(inputStr.toLowerCase()) ||
      inputStr.toLowerCase().includes(s.name.toLowerCase())
  );
  if (byNameSubstring) return byNameSubstring;

  return null;
};

/**
 * Core Trip Planner Engine
 * Evaluates origin, destination, arrival time targets, live bus telemetry, routes, and schedules.
 *
 * @param {Object} params
 * @param {string|ObjectId} params.origin Origin stop ID, code, or name
 * @param {string|ObjectId} params.destination Destination stop ID, code, or name
 * @param {string} [params.requiredArrivalTime] Target arrival time "HH:MM" (e.g. "09:00")
 * @param {string} [params.preference] 'fastest' | 'earliest_arrival' | 'convenient'
 * @param {string} [params.currentTime] Optional reference time "HH:MM" (defaults to current time)
 * @returns {Promise<Object>} Recommendation, alternatives, and trip metrics
 */
export const planTrip = async ({
  origin,
  destination,
  requiredArrivalTime,
  preference = 'fastest',
  currentTime,
}) => {
  // 1. Load Data
  const [allStops, allRoutes, allBuses, allSchedules] = await Promise.all([
    Stop.find().lean(),
    Route.find({ active: true }).populate('stops.stop').lean(),
    Bus.find().populate('currentDriver', 'name email phone').populate('currentRoute').lean(),
    Schedule.find({ active: true }).populate('route').populate('bus').lean(),
  ]);

  // 2. Resolve Origin & Destination Stops
  const originStop = resolveStop(origin, allStops);
  const destinationStop = resolveStop(destination, allStops);

  if (!originStop) {
    return {
      success: false,
      message: `Origin stop '${origin}' could not be identified on campus map.`,
    };
  }

  if (!destinationStop) {
    return {
      success: false,
      message: `Destination stop '${destination}' could not be identified on campus map.`,
    };
  }

  // 3. Determine Planning Time Context
  let currentMins;
  if (currentTime) {
    currentMins = timeToMinutes(currentTime);
  } else {
    const now = new Date();
    currentMins = now.getHours() * 60 + now.getMinutes();
  }

  const targetArrivalMins = requiredArrivalTime ? timeToMinutes(requiredArrivalTime) : null;

  // Handle case where origin and destination are identical
  if (originStop._id.toString() === destinationStop._id.toString()) {
    return {
      success: true,
      origin: originStop,
      destination: destinationStop,
      isSameStop: true,
      message: `You are already at ${originStop.name}.`,
      recommendation: {
        type: 'walk',
        mode: 'Direct Walk',
        title: 'Already at Destination',
        totalDurationMinutes: 0,
        departureTime: minutesToTime(currentMins),
        arrivalTime: minutesToTime(currentMins),
        isOnTime: true,
        summary: `You are currently at ${originStop.name}. No bus ride needed.`,
      },
      alternatives: [],
    };
  }

  // 4. Calculate Direct Walking Baseline Option
  const directWalkDistanceKm = calculateHaversineDistance(
    originStop.coordinates.lat,
    originStop.coordinates.lng,
    destinationStop.coordinates.lat,
    destinationStop.coordinates.lng
  );
  const directWalkDurationMins = calculateWalkDurationMinutes(directWalkDistanceKm);
  const directWalkArrivalMins = currentMins + directWalkDurationMins;
  const directWalkIsOnTime = targetArrivalMins ? directWalkArrivalMins <= targetArrivalMins : true;
  const directWalkMargin = targetArrivalMins ? targetArrivalMins - directWalkArrivalMins : 0;

  const directWalkOption = {
    id: 'option-direct-walk',
    type: 'walk',
    mode: 'Campus Walk',
    title: 'Direct Campus Walk',
    routeCode: 'WALK',
    routeColor: '#64748b', // slate
    busNumber: null,
    isLiveGPS: false,
    isSimulated: false,
    dataSource: 'walking_path',
    originStop,
    destinationStop,
    boardingStop: originStop,
    dropoffStop: destinationStop,
    walkToBoardingMinutes: 0,
    walkToBoardingDistanceKm: 0,
    transitDurationMinutes: 0,
    transitDistanceKm: 0,
    walkFromDropoffMinutes: directWalkDurationMins,
    walkFromDropoffDistanceKm: parseFloat(directWalkDistanceKm.toFixed(2)),
    totalWalkingMinutes: directWalkDurationMins,
    totalWalkingDistanceKm: parseFloat(directWalkDistanceKm.toFixed(2)),
    safetyBufferMinutes: 3,
    departureTime: minutesToTime(currentMins),
    arrivalTime: minutesToTime(directWalkArrivalMins),
    totalDurationMinutes: directWalkDurationMins,
    requiredArrivalTime: requiredArrivalTime || null,
    isOnTime: directWalkIsOnTime,
    marginMinutes: directWalkMargin,
    stopsCount: 0,
    status: 'active',
    statusMessage: 'Direct pedestrian walkway',
    score: 0,
    steps: [
      {
        stepIndex: 1,
        type: 'walk',
        instruction: `Walk from ${originStop.name} along campus pedestrian pathway to ${destinationStop.name}`,
        distance: `${Math.round(directWalkDistanceKm * 1000)} m`,
        durationMinutes: directWalkDurationMins,
      },
      {
        stepIndex: 2,
        type: 'arrive',
        instruction: `Arrive at destination: ${destinationStop.name}`,
        durationMinutes: 0,
        arrivalTime: minutesToTime(directWalkArrivalMins),
      },
    ],
    whyRecommended: [
      `Direct walking distance of ${Math.round(directWalkDistanceKm * 1000)} meters takes only ~${directWalkDurationMins} minutes.`,
      `Zero waiting time for transit.`,
      targetArrivalMins
        ? directWalkIsOnTime
          ? `Guarantees arrival at ${minutesToTime(directWalkArrivalMins)} (${directWalkMargin} mins before your ${requiredArrivalTime} target).`
          : `Arrives at ${minutesToTime(directWalkArrivalMins)} (Misses ${requiredArrivalTime} target by ${Math.abs(directWalkMargin)} mins).`
        : `Arrival at ~${minutesToTime(directWalkArrivalMins)}.`,
    ],
  };

  // 5. Evaluate Transit Route Options
  const candidateOptions = [];

  for (const route of allRoutes) {
    if (!route.stops || route.stops.length === 0) continue;

    // Find origin & destination stops on this route
    let originStopIndex = -1;
    let destStopIndex = -1;

    route.stops.forEach((st, idx) => {
      const stopObj = st.stop;
      if (!stopObj) return;
      if (stopObj._id.toString() === originStop._id.toString()) {
        originStopIndex = idx;
      }
      if (stopObj._id.toString() === destinationStop._id.toString()) {
        destStopIndex = idx;
      }
    });

    // Check for direct stop match
    if (originStopIndex !== -1 && destStopIndex !== -1 && originStopIndex < destStopIndex) {
      const boardingSequence = route.stops[originStopIndex];
      const dropoffSequence = route.stops[destStopIndex];

      const boardingOffsetMinutes = boardingSequence.estimatedMinutesFromStart || 0;
      const dropoffOffsetMinutes = dropoffSequence.estimatedMinutesFromStart || 0;
      const nominalTransitMinutes = Math.max(2, dropoffOffsetMinutes - boardingOffsetMinutes);
      const transitDistanceKm = parseFloat(
        (dropoffSequence.distanceFromStartKm - boardingSequence.distanceFromStartKm || 1.5).toFixed(2)
      );
      const intermediateStopsCount = destStopIndex - originStopIndex;

      // Find buses assigned to this route
      const routeBuses = allBuses.filter(
        (b) =>
          b.currentRoute &&
          (b.currentRoute._id?.toString() === route._id.toString() ||
            b.currentRoute.toString() === route._id.toString()) &&
          b.status !== 'breakdown' &&
          b.status !== 'out_of_service'
      );

      // 5A. Live GPS Bus Runs on this route
      for (const bus of routeBuses) {
        if (bus.isTripActive && bus.lastKnownLocation) {
          const liveETAs = calculateStopETAs(bus.lastKnownLocation, route.stops, bus.status);
          const boardingStopETAObj = liveETAs[originStopIndex];

          // If bus has not passed origin stop yet
          if (boardingStopETAObj && !boardingStopETAObj.isPast) {
            const boardingWaitMinutes = boardingStopETAObj.estimatedMinutes || 1;
            const departureMins = currentMins + boardingWaitMinutes;
            const delayBuffer = bus.status === 'delayed' ? 4 : 0;
            const transitMinutes = nominalTransitMinutes + delayBuffer;
            const arrivalMins = departureMins + transitMinutes;
            const safetyBufferMins = 5 + delayBuffer;
            const totalJourneyMins = boardingWaitMinutes + transitMinutes;
            const isOnTime = targetArrivalMins ? arrivalMins <= targetArrivalMins : true;
            const margin = targetArrivalMins ? targetArrivalMins - arrivalMins : 0;

            candidateOptions.push({
              id: `option-live-${bus._id}`,
              type: 'transit',
              mode: 'Live Campus Bus',
              title: `${bus.busNumber} (${route.name})`,
              routeId: route._id,
              routeName: route.name,
              routeCode: route.code,
              routeColor: route.color || '#2563eb',
              busId: bus._id,
              busNumber: bus.busNumber,
              plateNumber: bus.plateNumber,
              busStatus: bus.status,
              statusMessage: bus.statusMessage || 'Operating normally',
              isLiveGPS: true,
              isSimulated: !!bus.isSimulated,
              dataSource: bus.isSimulated ? 'simulated_gps' : 'live_gps',
              originStop,
              destinationStop,
              boardingStop: originStop,
              dropoffStop: destinationStop,
              walkToBoardingMinutes: 0,
              walkToBoardingDistanceKm: 0,
              boardingWaitMinutes,
              transitDurationMinutes: transitMinutes,
              transitDistanceKm,
              walkFromDropoffMinutes: 0,
              walkFromDropoffDistanceKm: 0,
              totalWalkingMinutes: 0,
              totalWalkingDistanceKm: 0,
              safetyBufferMinutes: safetyBufferMins,
              departureTime: minutesToTime(departureMins),
              arrivalTime: minutesToTime(arrivalMins),
              totalDurationMinutes: totalJourneyMins,
              requiredArrivalTime: requiredArrivalTime || null,
              isOnTime,
              marginMinutes: margin,
              stopsCount: intermediateStopsCount,
              steps: [
                {
                  stepIndex: 1,
                  type: 'wait',
                  instruction: `Wait at ${originStop.name} for ${bus.busNumber}`,
                  durationMinutes: boardingWaitMinutes,
                  details: `Bus is currently ~${boardingWaitMinutes} min away (${bus.status})`,
                },
                {
                  stepIndex: 2,
                  type: 'bus',
                  instruction: `Board ${bus.busNumber} (${route.code} ${route.name}) to ${destinationStop.name}`,
                  durationMinutes: transitMinutes,
                  stopsCount: intermediateStopsCount,
                  distance: `${transitDistanceKm} km`,
                  departureTime: minutesToTime(departureMins),
                  dropoffTime: minutesToTime(arrivalMins),
                },
                {
                  stepIndex: 3,
                  type: 'arrive',
                  instruction: `Alight at ${destinationStop.name}`,
                  durationMinutes: 0,
                  arrivalTime: minutesToTime(arrivalMins),
                },
              ],
              whyRecommended: [
                `Live GPS verified: ${bus.busNumber} is on-route and arrives at ${originStop.name} in ~${boardingWaitMinutes} mins.`,
                `Direct route along ${route.name} with ${intermediateStopsCount} stops in ~${transitMinutes} mins.`,
                targetArrivalMins
                  ? isOnTime
                    ? `Arrives safely at ${minutesToTime(arrivalMins)} with a ${margin} min buffer before your ${requiredArrivalTime} target.`
                    : `⚠️ Arrives at ${minutesToTime(arrivalMins)} (Misses ${requiredArrivalTime} target by ${Math.abs(margin)} mins due to delay/schedule).`
                  : `Total estimated travel time: ~${totalJourneyMins} mins.`,
              ],
            });
          }
        }
      }

      // 5B. Timetabled Scheduled Departures for this route
      const routeSchedules = allSchedules.filter(
        (sch) => sch.route && sch.route._id?.toString() === route._id.toString()
      );

      for (const sch of routeSchedules) {
        const schedDepMins = timeToMinutes(sch.departureTime);
        const boardingDepMins = schedDepMins + boardingOffsetMinutes;

        // Consider scheduled departures within a realistic window (past 5 min to next 2.5 hours)
        if (boardingDepMins >= currentMins - 5 && boardingDepMins <= currentMins + 150) {
          const waitMins = Math.max(1, boardingDepMins - currentMins);
          const arrivalMins = boardingDepMins + nominalTransitMinutes;
          const totalJourneyMins = waitMins + nominalTransitMinutes;
          const isOnTime = targetArrivalMins ? arrivalMins <= targetArrivalMins : true;
          const margin = targetArrivalMins ? targetArrivalMins - arrivalMins : 0;
          const busNumber = sch.bus?.busNumber || `${route.code} Shuttle`;

          candidateOptions.push({
            id: `option-sched-${sch._id}`,
            type: 'transit',
            mode: 'Scheduled Campus Bus',
            title: `${busNumber} (${route.name})`,
            routeId: route._id,
            routeName: route.name,
            routeCode: route.code,
            routeColor: route.color || '#2563eb',
            busId: sch.bus?._id || null,
            busNumber,
            plateNumber: sch.bus?.plateNumber || '',
            busStatus: 'active',
            statusMessage: `Scheduled departure at ${sch.departureTime}`,
            isLiveGPS: false,
            isSimulated: false,
            dataSource: 'scheduled_timetable',
            originStop,
            destinationStop,
            boardingStop: originStop,
            dropoffStop: destinationStop,
            walkToBoardingMinutes: 0,
            walkToBoardingDistanceKm: 0,
            boardingWaitMinutes: waitMins,
            transitDurationMinutes: nominalTransitMinutes,
            transitDistanceKm,
            walkFromDropoffMinutes: 0,
            walkFromDropoffDistanceKm: 0,
            totalWalkingMinutes: 0,
            totalWalkingDistanceKm: 0,
            safetyBufferMinutes: 6,
            departureTime: minutesToTime(boardingDepMins),
            arrivalTime: minutesToTime(arrivalMins),
            totalDurationMinutes: totalJourneyMins,
            requiredArrivalTime: requiredArrivalTime || null,
            isOnTime,
            marginMinutes: margin,
            stopsCount: intermediateStopsCount,
            steps: [
              {
                stepIndex: 1,
                type: 'wait',
                instruction: `Wait at ${originStop.name} for scheduled ${busNumber}`,
                durationMinutes: waitMins,
                details: `Scheduled departure from stop at ${minutesToTime(boardingDepMins)}`,
              },
              {
                stepIndex: 2,
                type: 'bus',
                instruction: `Board ${busNumber} to ${destinationStop.name}`,
                durationMinutes: nominalTransitMinutes,
                stopsCount: intermediateStopsCount,
                distance: `${transitDistanceKm} km`,
                departureTime: minutesToTime(boardingDepMins),
                dropoffTime: minutesToTime(arrivalMins),
              },
              {
                stepIndex: 3,
                type: 'arrive',
                instruction: `Alight at ${destinationStop.name}`,
                durationMinutes: 0,
                arrivalTime: minutesToTime(arrivalMins),
              },
            ],
            whyRecommended: [
              `Official campus timetable: ${busNumber} departs ${originStop.name} at ${minutesToTime(boardingDepMins)}.`,
              `Direct transit on ${route.name} (${intermediateStopsCount} stops, ~${nominalTransitMinutes} mins).`,
              targetArrivalMins
                ? isOnTime
                  ? `Arrives at ${minutesToTime(arrivalMins)} (${margin} mins before your ${requiredArrivalTime} deadline).`
                  : `⚠️ Arrives at ${minutesToTime(arrivalMins)} (Misses ${requiredArrivalTime} deadline by ${Math.abs(margin)} mins).`
                : `Expected arrival at ${minutesToTime(arrivalMins)}.`,
            ],
          });
        }
      }
    }
  }

  // Always include direct walk option in candidate list for short campus distances (< 1.5 km)
  if (directWalkDistanceKm < 2.0) {
    candidateOptions.push(directWalkOption);
  }

  // 6. Score and Rank Options
  candidateOptions.forEach((opt) => {
    let score = 1000;

    // A. On-Time Feasibility (Highest Weight)
    if (targetArrivalMins) {
      if (opt.isOnTime) {
        score += 600;
        // Reward healthy buffer (3 to 15 min buffer before class)
        if (opt.marginMinutes >= 3 && opt.marginMinutes <= 15) {
          score += 150;
        } else if (opt.marginMinutes > 30) {
          // Arriving too early (e.g. 40 mins early) gets small penalty
          score -= (opt.marginMinutes - 30) * 3;
        }
      } else {
        // Late arrival heavily penalized
        score -= 2000 + Math.abs(opt.marginMinutes) * 50;
      }
    }

    // B. Total Travel Duration Penalty
    score -= opt.totalDurationMinutes * 12;

    // C. Live GPS Confidence & Transit Comfort
    if (opt.type === 'transit') {
      score += 150; // Transit preference bonus for vehicular campus corridors
    }

    if (opt.isLiveGPS) {
      score += 180;
      if (opt.busStatus === 'delayed') {
        score -= 140; // Penalty for delayed bus
      }
    }

    // D. Walking Distance Penalty
    score -= opt.totalWalkingMinutes * 8;

    // E. Preference Adjustments
    if (preference === 'fastest') {
      score -= opt.totalDurationMinutes * 15;
    } else if (preference === 'earliest_arrival') {
      const arrivalMinVal = timeToMinutes(opt.arrivalTime);
      score += (24 * 60 - arrivalMinVal) * 3;
    } else if (preference === 'convenient') {
      score -= opt.totalWalkingMinutes * 25;
      if (opt.type === 'transit') score += 100;
    }

    opt.score = score;
  });

  // Sort descending by score
  candidateOptions.sort((a, b) => b.score - a.score);

  // De-duplicate candidate options
  const uniqueOptions = [];
  const seenKeys = new Set();

  for (const opt of candidateOptions) {
    const key = `${opt.type}-${opt.busNumber}-${opt.departureTime}-${opt.arrivalTime}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueOptions.push(opt);
    }
  }

  if (uniqueOptions.length === 0) {
    // If no transit routes served, return direct walk
    return {
      success: true,
      origin: originStop,
      destination: destinationStop,
      recommendation: directWalkOption,
      alternatives: [],
      warning: 'No direct bus routes currently operating between these two stops. Campus walk recommended.',
    };
  }

  const recommendation = uniqueOptions[0];
  const alternatives = uniqueOptions.slice(1, 4);

  // Generate crisp summary explanation
  let summaryText = '';
  if (recommendation.type === 'walk') {
    summaryText = `Walk directly from ${originStop.name} to ${destinationStop.name} (~${recommendation.totalDurationMinutes} mins, ${Math.round(recommendation.totalWalkingDistanceKm * 1000)}m). Expected arrival: ${recommendation.arrivalTime}.`;
  } else {
    summaryText = `Take ${recommendation.busNumber} (${recommendation.routeCode} ${recommendation.routeName}) from ${recommendation.boardingStop.name} at ${recommendation.departureTime}. Arrives at ${recommendation.dropoffStop.name} at ${recommendation.arrivalTime} (${recommendation.totalDurationMinutes} min trip).`;
  }

  // Detect if a delayed bus caused rerouting
  let delayNotice = null;
  const delayedLiveOption = candidateOptions.find(
    (opt) => opt.isLiveGPS && opt.busStatus === 'delayed' && !opt.isOnTime
  );
  if (delayedLiveOption && recommendation.id !== delayedLiveOption.id) {
    delayNotice = `${delayedLiveOption.busNumber} is currently delayed and expected to arrive at ${delayedLiveOption.arrivalTime} (past your ${requiredArrivalTime} target). The system automatically routed you to ${recommendation.busNumber} to guarantee an on-time arrival.`;
  }

  return {
    success: true,
    origin: originStop,
    destination: destinationStop,
    requiredArrivalTime: requiredArrivalTime || null,
    preference,
    currentTime: minutesToTime(currentMins),
    summary: summaryText,
    delayNotice,
    recommendation,
    alternatives,
    totalOptionsEvaluated: uniqueOptions.length,
  };
};
