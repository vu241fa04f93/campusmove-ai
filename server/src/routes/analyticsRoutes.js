import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
  getOverview,
  getFleet,
  getRoutes,
  getComplaints,
  getIncidents,
  getPredictions,
  getTrends,
  getReadiness,
} from '../controllers/analyticsController.js';

const router = express.Router();

// All analytics endpoints are strictly protected for Admin role
router.use(protect);
router.use(authorize('admin'));

router.get('/overview', getOverview);
router.get('/fleet', getFleet);
router.get('/routes', getRoutes);
router.get('/complaints', getComplaints);
router.get('/incidents', getIncidents);
router.get('/predictions', getPredictions);
router.get('/trends', getTrends);
router.get('/pilot-readiness', getReadiness);

export default router;
