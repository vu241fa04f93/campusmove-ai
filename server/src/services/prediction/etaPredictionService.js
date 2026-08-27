import { Bus } from '../../models/Bus.js';
import { Route } from '../../models/Route.js';
import { Stop } from '../../models/Stop.js';
import { PredictionHistory } from '../../models/PredictionHistory.js';
import { calculateStopETAs } from '../../utils/geoUtils.js';
import { loadTrainedModels } from '../../ml/trainModels.js';
import { predictionFeatureService } from './predictionFeatureService.js';

let cachedModels = null;

const getModels = async () => {
  if (!cachedModels) {
    cachedModels = await loadTrainedModels();
  }
  return cachedModels;
};

export const etaPredictionService = {
  /**
   * Calculate deterministic base ETA + ML adjustment = Refined ETA
   * @param {Object} params { busId, stopId, recordHistory }
   */
  async predictBusETA({ busId, stopId, recordHistory = false }) {
    const { etaModel } = await getModels();

    const bus = await Bus.findById(busId)
      .populate('currentDriver', 'name email phone')
      .populate({
        path: 'currentRoute',
        populate: { path: 'stops.stop' },
      });

    if (!bus) {
      return { found: false, message: 'Bus not found' };
    }

    const route = bus.currentRoute;
    const routeStops = route?.stops || [];
    const location = bus.lastKnownLocation || { lat: 28.545, lng: 77.192, speed: 20 };

    // 1. Calculate deterministic base ETAs (Preserving Phase 2 logic)
    const baseETAs = calculateStopETAs(location, routeStops, bus.status);

    if (baseETAs.length === 0) {
      return {
        found: true,
        busId: bus._id,
        busNumber: bus.busNumber,
        plateNumber: bus.plateNumber,
        status: bus.status,
        message: 'No route stops assigned for ETA calculation',
        predictionSource: 'deterministic_fallback',
        predictions: [],
      };
    }

    // 2. Compute ML Refined ETA for each upcoming stop
    const now = new Date();
    const refinedStops = baseETAs.map((st, index) => {
      if (st.isPast) {
        return {
          ...st,
          baseETA: 0,
          predictedETA: 0,
          adjustmentMinutes: 0,
          confidence: 95,
          predictionSource: 'ml_model_v1',
          factors: { status: 'passed' },
        };
      }

      const featureObj = predictionFeatureService.extractETAFeatures({
        bus,
        route,
        stop: routeStops[index]?.stop,
        targetStopSequence: index + 1,
        totalStops: routeStops.length,
        currentTime: now,
      });

      // Raw ML adjustment
      const rawAdjustment = etaModel ? etaModel.predictVector(featureObj.vector) : 0;
      const adjustmentMinutes = parseFloat(rawAdjustment.toFixed(1));

      // Base ETA
      const baseETA = st.estimatedMinutes;
      // Refined ETA = Base ETA + ML Adjustment (clamped to min 1 minute for upcoming stops)
      const predictedETA = Math.max(1, Math.round(baseETA + adjustmentMinutes));

      // Confidence score calculation
      let confidence = 90;
      const lastUpdatedMs = bus.lastKnownLocation?.updatedAt
        ? Date.now() - new Date(bus.lastKnownLocation.updatedAt).getTime()
        : 60000;
      if (lastUpdatedMs < 60000) confidence += 4; // Fresh telemetry
      if (bus.status === 'active') confidence += 3;
      if (featureObj.metadata.isRushHour) confidence -= 2; // Higher variance during rush
      confidence = Math.max(75, Math.min(98, confidence));

      return {
        stopId: st.stopId,
        stopName: st.stopName,
        stopCode: st.stopCode,
        sequence: st.sequence,
        distanceKm: st.distanceKm,
        isNext: st.isNext,
        isPast: st.isPast,
        baseETA,
        predictedETA,
        adjustmentMinutes,
        confidence,
        predictionSource: 'ml_model_v1',
        factors: {
          isRushHour: featureObj.metadata.isRushHour,
          isDelayed: featureObj.metadata.isDelayed,
          speedKmH: featureObj.metadata.speedKmH,
          rushMultiplier: featureObj.metadata.rushMultiplier,
        },
      };
    });

    // 3. Find target stop or next upcoming stop
    let targetPrediction = null;
    if (stopId) {
      targetPrediction = refinedStops.find(
        (s) => s.stopId?.toString() === stopId.toString() || s.stopCode?.toLowerCase() === stopId.toLowerCase()
      );
    }
    if (!targetPrediction) {
      targetPrediction = refinedStops.find((s) => s.isNext) || refinedStops.find((s) => !s.isPast) || refinedStops[0];
    }

    // 4. Optionally record prediction history
    if (recordHistory && targetPrediction) {
      try {
        await PredictionHistory.create({
          predictionType: 'eta',
          bus: bus._id,
          route: route?._id,
          stop: targetPrediction.stopId,
          baseValue: targetPrediction.baseETA,
          predictedValue: targetPrediction.predictedETA,
          adjustment: targetPrediction.adjustmentMinutes,
          confidence: targetPrediction.confidence,
          predictionSource: 'ml_model_v1',
          inputFeatures: targetPrediction.factors,
        });
      } catch (err) {
        console.warn('[etaPredictionService] Failed to save prediction history:', err.message);
      }
    }

    return {
      found: true,
      busId: bus._id,
      busNumber: bus.busNumber,
      plateNumber: bus.plateNumber,
      status: bus.status,
      statusMessage: bus.statusMessage,
      route: route
        ? {
            _id: route._id,
            name: route.name,
            code: route.code,
            color: route.color,
          }
        : null,
      targetStop: targetPrediction,
      baseETA: targetPrediction?.baseETA || 0,
      predictedETA: targetPrediction?.predictedETA || 0,
      adjustmentMinutes: targetPrediction?.adjustmentMinutes || 0,
      confidence: targetPrediction?.confidence || 90,
      predictionSource: 'ml_model_v1',
      factors: targetPrediction?.factors || {},
      allStops: refinedStops,
    };
  },
};
