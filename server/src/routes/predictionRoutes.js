import express from 'express';
import {
  getBusEtaPrediction,
  getBusCrowdPrediction,
  getDemandForecast,
  getPredictionSummary,
  retrainModels,
} from '../controllers/predictionController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public / Authenticated read routes
router.get('/eta/:busId', getBusEtaPrediction);
router.get('/crowd/:busId', getBusCrowdPrediction);
router.get('/demand', getDemandForecast);
router.get('/summary', getPredictionSummary);

// Admin-only model management
router.post('/train', protect, authorize('admin'), retrainModels);

export default router;
