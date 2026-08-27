import express from 'express';
import {
  getAlerts,
  getAlertById,
  createAlert,
  markAlertAsRead,
  markAllAlertsAsRead,
  updateAlert,
  getPreferences,
  updatePreferences,
} from '../controllers/alertController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Preferences
router
  .route('/preferences')
  .get(protect, getPreferences)
  .put(protect, updatePreferences);

// Batch read
router.post('/mark-all-read', protect, markAllAlertsAsRead);

// Alert list & create
router
  .route('/')
  .get(protect, getAlerts)
  .post(protect, authorize('admin', 'driver'), createAlert);

// Single alert & mutations
router
  .route('/:id')
  .get(protect, getAlertById)
  .patch(protect, updateAlert);

router.patch('/:id/read', protect, markAlertAsRead);

export default router;
