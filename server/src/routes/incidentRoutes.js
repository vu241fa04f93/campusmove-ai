import express from 'express';
import {
  createIncident,
  getAllIncidents,
  getIncidentById,
  updateIncident,
  resolveIncident,
  closeIncident,
} from '../controllers/incidentController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Specific action routes
router.patch('/:id/resolve', protect, authorize('admin'), resolveIncident);
router.patch('/:id/close', protect, authorize('admin'), closeIncident);

// Standard REST routes
router
  .route('/')
  .post(protect, authorize('admin', 'driver'), createIncident)
  .get(protect, authorize('admin', 'driver'), getAllIncidents);

router
  .route('/:id')
  .get(protect, getIncidentById)
  .patch(protect, authorize('admin'), updateIncident);

export default router;
