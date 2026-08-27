import { calculateHaversineDistance } from '../../utils/geoUtils.js';
import { getRushMultiplier } from '../../ml/datasetGenerator.js';

/**
 * Feature Engineering Service
 * Extracts and transforms live database entities into standardized numeric feature vectors
 */
export const predictionFeatureService = {
  /**
   * Extract features for ETA Prediction
   */
  extractETAFeatures({ bus, route, stop, targetStopSequence = 1, totalStops = 6, currentTime = new Date() }) {
    const date = currentTime instanceof Date ? currentTime : new Date(currentTime);
    const hour = date.getHours() + date.getMinutes() / 60;
    const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay(); // 1=Mon .. 7=Sun
    const isWeekend = dayOfWeek >= 6 ? 1 : 0;

    const busLocation = bus?.lastKnownLocation || { lat: 28.545, lng: 77.192, speed: 20 };
    const stopCoords = stop?.coordinates || { lat: 28.545, lng: 77.192 };

    const distanceKm = calculateHaversineDistance(
      busLocation.lat,
      busLocation.lng,
      stopCoords.lat,
      stopCoords.lng
    );

    const speed = busLocation.speed && busLocation.speed > 2 ? busLocation.speed : 20;
    const isDelayedStatus = bus?.status === 'delayed' ? 1 : 0;
    const weatherDelay = 0; // Default clear campus weather

    const rushMultiplier = getRushMultiplier(hour) * (isWeekend ? 0.6 : 1.0);
    const isRushHour = rushMultiplier > 1.3 ? 1 : 0;

    return {
      vector: [
        parseFloat(distanceKm.toFixed(2)),
        parseFloat(speed.toFixed(1)),
        parseFloat(hour.toFixed(1)),
        dayOfWeek,
        isWeekend,
        targetStopSequence,
        totalStops,
        isDelayedStatus,
        weatherDelay,
        isRushHour,
      ],
      metadata: {
        distanceKm: parseFloat(distanceKm.toFixed(2)),
        speedKmH: speed,
        hour: parseFloat(hour.toFixed(2)),
        dayOfWeek,
        isWeekend: Boolean(isWeekend),
        stopSequence: targetStopSequence,
        totalStops,
        isDelayed: Boolean(isDelayedStatus),
        isRushHour: Boolean(isRushHour),
        rushMultiplier: parseFloat(rushMultiplier.toFixed(2)),
      },
    };
  },

  /**
   * Extract features for Crowd / Passenger Load Estimation
   */
  extractCrowdFeatures({ bus, route, stopSequence = 1, totalStops = 6, currentTime = new Date() }) {
    const date = currentTime instanceof Date ? currentTime : new Date(currentTime);
    const hour = date.getHours() + date.getMinutes() / 60;
    const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay();
    const isWeekend = dayOfWeek >= 6 ? 1 : 0;

    let routeIndex = 1;
    if (route?.code === 'R-102') routeIndex = 2;
    else if (route?.code === 'R-103') routeIndex = 3;

    const baseCapacity = bus?.capacity || 40;
    const rushMultiplier = getRushMultiplier(hour) * (isWeekend ? 0.5 : 1.0);
    const isRushHour = rushMultiplier > 1.3 ? 1 : 0;

    return {
      vector: [
        parseFloat(hour.toFixed(1)),
        dayOfWeek,
        isWeekend,
        routeIndex,
        stopSequence,
        totalStops,
        isRushHour,
        baseCapacity,
      ],
      metadata: {
        hour: parseFloat(hour.toFixed(2)),
        dayOfWeek,
        isWeekend: Boolean(isWeekend),
        routeIndex,
        stopSequence,
        totalStops,
        isRushHour: Boolean(isRushHour),
        baseCapacity,
      },
    };
  },

  /**
   * Extract features for Transport Demand Forecasting
   */
  extractDemandFeatures({ routeIndex = 1, hour = 9, dayOfWeek = 1, isWeekend = 0 }) {
    const rushMultiplier = getRushMultiplier(hour) * (isWeekend ? 0.45 : 1.0);
    const isRushHour = rushMultiplier > 1.3 ? 1 : 0;

    return {
      vector: [hour, dayOfWeek, isWeekend ? 1 : 0, routeIndex, isRushHour],
      metadata: {
        hour,
        dayOfWeek,
        isWeekend: Boolean(isWeekend),
        routeIndex,
        isRushHour: Boolean(isRushHour),
      },
    };
  },
};
