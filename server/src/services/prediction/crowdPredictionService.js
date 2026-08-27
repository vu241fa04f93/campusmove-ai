import { Bus } from '../../models/Bus.js';
import { PredictionHistory } from '../../models/PredictionHistory.js';
import { loadTrainedModels } from '../../ml/trainModels.js';
import { predictionFeatureService } from './predictionFeatureService.js';

let cachedModels = null;

const getModels = async () => {
  if (!cachedModels) {
    cachedModels = await loadTrainedModels();
  }
  return cachedModels;
};

export const crowdPredictionService = {
  /**
   * Estimate current and upcoming stop passenger load & crowd level
   * @param {Object} params { busId, recordHistory }
   */
  async predictBusCrowd({ busId, recordHistory = false }) {
    const { crowdModel } = await getModels();

    const bus = await Bus.findById(busId)
      .populate('currentDriver', 'name phone')
      .populate({
        path: 'currentRoute',
        populate: { path: 'stops.stop' },
      });

    if (!bus) {
      return { found: false, message: 'Bus not found' };
    }

    const route = bus.currentRoute;
    const capacity = bus.capacity || 40;
    const now = new Date();

    // Extract ML features
    const featureObj = predictionFeatureService.extractCrowdFeatures({
      bus,
      route,
      stopSequence: 3,
      totalStops: route?.stops?.length || 6,
      currentTime: now,
    });

    // Run ML prediction
    const mlPrediction = crowdModel
      ? crowdModel.predictOccupancy(featureObj.vector)
      : { occupancyRatio: 0.5, occupancyPercentage: 50, crowdLevel: 'MODERATE', confidence: 85 };

    // Reconcile with live telemetry if available
    let estimatedPassengers = bus.currentPassengerCount;
    let occupancyPercentage = 0;
    let crowdLevel = 'LOW';
    let predictionSource = 'hybrid_live_ml';

    if (estimatedPassengers !== undefined && estimatedPassengers > 0) {
      occupancyPercentage = Math.min(100, Math.round((estimatedPassengers / capacity) * 100));
      if (occupancyPercentage >= 90) crowdLevel = 'FULL';
      else if (occupancyPercentage >= 70) crowdLevel = 'HIGH';
      else if (occupancyPercentage >= 40) crowdLevel = 'MODERATE';
      else crowdLevel = 'LOW';
    } else {
      // Direct ML estimate
      occupancyPercentage = mlPrediction.occupancyPercentage;
      estimatedPassengers = Math.round((occupancyPercentage / 100) * capacity);
      crowdLevel = mlPrediction.crowdLevel;
      predictionSource = 'ml_model_v1';
    }

    // Determine crowd trend
    let trend = 'stable';
    if (featureObj.metadata.isRushHour) {
      trend = 'increasing';
    } else if (featureObj.metadata.hour > 19) {
      trend = 'decreasing';
    }

    const result = {
      found: true,
      busId: bus._id,
      busNumber: bus.busNumber,
      plateNumber: bus.plateNumber,
      route: route ? { _id: route._id, name: route.name, code: route.code } : null,
      capacity,
      estimatedPassengers,
      occupancyPercentage,
      crowdLevel,
      confidence: mlPrediction.confidence,
      trend,
      availableSeats: Math.max(0, capacity - estimatedPassengers),
      predictionSource,
      isRushHour: featureObj.metadata.isRushHour,
      statusMessage:
        crowdLevel === 'FULL'
          ? 'Bus near maximum capacity — Consider next scheduled shuttle'
          : crowdLevel === 'HIGH'
          ? 'High passenger load — Limited seating available'
          : crowdLevel === 'MODERATE'
          ? 'Moderate crowd — Seats readily available'
          : 'Low crowd — Plentiful seating available',
    };

    if (recordHistory) {
      try {
        await PredictionHistory.create({
          predictionType: 'crowd',
          bus: bus._id,
          route: route?._id,
          baseValue: bus.currentPassengerCount || 0,
          predictedValue: estimatedPassengers,
          adjustment: occupancyPercentage,
          confidence: result.confidence,
          predictionSource,
          inputFeatures: featureObj.metadata,
        });
      } catch (err) {
        console.warn('[crowdPredictionService] History log failed:', err.message);
      }
    }

    return result;
  },
};
