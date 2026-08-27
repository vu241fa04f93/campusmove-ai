import mongoose from 'mongoose';
import { etaPredictionService } from '../services/prediction/etaPredictionService.js';
import { crowdPredictionService } from '../services/prediction/crowdPredictionService.js';
import { demandForecastService } from '../services/prediction/demandForecastService.js';
import { predictionSummaryService } from '../services/prediction/predictionSummaryService.js';
import { trainAllModels } from '../ml/trainModels.js';

// @desc Get Refined ML ETA for a bus (and optional stop)
// @route GET /api/predictions/eta/:busId
export const getBusEtaPrediction = async (req, res, next) => {
  try {
    const { busId } = req.params;
    const { stopId, recordHistory } = req.query;

    if (!mongoose.Types.ObjectId.isValid(busId)) {
      return res.status(404).json({ success: false, message: 'Invalid bus identifier' });
    }

    const result = await etaPredictionService.predictBusETA({
      busId,
      stopId,
      recordHistory: recordHistory === 'true',
    });

    if (!result.found) {
      return res.status(404).json({ success: false, message: result.message || 'Bus not found' });
    }

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// @desc Get Passenger Load / Crowd Estimation for a bus
// @route GET /api/predictions/crowd/:busId
export const getBusCrowdPrediction = async (req, res, next) => {
  try {
    const { busId } = req.params;
    const { recordHistory } = req.query;

    if (!mongoose.Types.ObjectId.isValid(busId)) {
      return res.status(404).json({ success: false, message: 'Invalid bus identifier' });
    }

    const result = await crowdPredictionService.predictBusCrowd({
      busId,
      recordHistory: recordHistory === 'true',
    });

    if (!result.found) {
      return res.status(404).json({ success: false, message: result.message || 'Bus not found' });
    }

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// @desc Get Transport Demand Forecast across routes/stops
// @route GET /api/predictions/demand
export const getDemandForecast = async (req, res, next) => {
  try {
    const { routeId, stopId, date, hour } = req.query;

    const result = await demandForecastService.forecastDemand({
      routeId,
      stopId,
      date,
      hour,
    });

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// @desc Get Fleet-wide Prediction Overview and Analytics
// @route GET /api/predictions/summary
export const getPredictionSummary = async (req, res, next) => {
  try {
    const result = await predictionSummaryService.getFleetSummary();
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// @desc Retrain ML Prediction Models (Admin only)
// @route POST /api/predictions/train
export const retrainModels = async (req, res, next) => {
  try {
    const { trainingReport } = await trainAllModels(true);
    res.status(200).json({
      success: true,
      message: 'CampusMove AI Prediction Models successfully retrained and persisted',
      data: trainingReport,
    });
  } catch (error) {
    next(error);
  }
};
