/**
 * Calculate the great-circle distance between two points on the Earth's surface
 * using the Haversine formula.
 * @param {number} lat1 Latitude of point 1 (in degrees)
 * @param {number} lon1 Longitude of point 1 (in degrees)
 * @param {number} lat2 Latitude of point 2 (in degrees)
 * @param {number} lon2 Longitude of point 2 (in degrees)
 * @returns {number} Distance in kilometers
 */
export const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Calculate deterministic distance and ETA from current bus location to downstream stops.
 * @param {Object} busLocation { lat: number, lng: number, speed: number }
 * @param {Array} routeStops Array of { stop: { _id, name, code, coordinates: { lat, lng } }, sequence: number }
 * @param {string|number} busStatus Current bus status ('active', 'delayed', etc.)
 * @returns {Array} Array of stops with distanceKm, estimatedMinutes, and formatted ETA
 */
export const calculateStopETAs = (busLocation, routeStops = [], busStatus = 'active') => {
  if (!busLocation || !busLocation.lat || !busLocation.lng || !routeStops || routeStops.length === 0) {
    return [];
  }

  // Average campus transit speed in km/h (default: 20 km/h if current speed is <= 2 km/h due to stopping)
  const currentSpeed = busLocation.speed && busLocation.speed > 3 ? busLocation.speed : 20;
  const speedKmPerMin = currentSpeed / 60;
  const dwellTimeMinutesPerStop = 0.75; // 45 seconds average passenger boarding time per stop
  const delayBufferMinutes = busStatus === 'delayed' ? 4 : 0;

  // Find nearest stop to current bus location to determine progress
  let nearestStopIndex = 0;
  let minDistance = Infinity;

  routeStops.forEach((st, index) => {
    if (st.stop?.coordinates?.lat && st.stop?.coordinates?.lng) {
      const dist = calculateHaversineDistance(
        busLocation.lat,
        busLocation.lng,
        st.stop.coordinates.lat,
        st.stop.coordinates.lng
      );
      if (dist < minDistance) {
        minDistance = dist;
        nearestStopIndex = index;
      }
    }
  });

  let cumulativeDistanceKm = 0;
  let prevLat = busLocation.lat;
  let prevLng = busLocation.lng;

  return routeStops.map((st, index) => {
    const stopCoords = st.stop?.coordinates;
    if (!stopCoords?.lat || !stopCoords?.lng) {
      return {
        stopId: st.stop?._id,
        stopName: st.stop?.name || `Stop ${index + 1}`,
        stopCode: st.stop?.code || '',
        distanceKm: 0,
        estimatedMinutes: 0,
        isPast: index < nearestStopIndex,
        isNext: index === nearestStopIndex,
      };
    }

    // Accumulate distance along the path from current bus location
    if (index >= nearestStopIndex) {
      const segmentDistance = calculateHaversineDistance(prevLat, prevLng, stopCoords.lat, stopCoords.lng);
      cumulativeDistanceKm += segmentDistance;
      prevLat = stopCoords.lat;
      prevLng = stopCoords.lng;
    }

    const stopsAheadCount = Math.max(0, index - nearestStopIndex);
    const travelTimeMinutes = cumulativeDistanceKm / speedKmPerMin;
    const totalMinutes = Math.max(
      1,
      Math.round(travelTimeMinutes + stopsAheadCount * dwellTimeMinutesPerStop + delayBufferMinutes)
    );

    return {
      stopId: st.stop?._id,
      stopName: st.stop?.name || `Stop ${index + 1}`,
      stopCode: st.stop?.code || '',
      sequence: st.sequence || index + 1,
      distanceKm: parseFloat(cumulativeDistanceKm.toFixed(2)),
      estimatedMinutes: index < nearestStopIndex ? 0 : totalMinutes,
      isPast: index < nearestStopIndex,
      isNext: index === nearestStopIndex,
    };
  });
};
