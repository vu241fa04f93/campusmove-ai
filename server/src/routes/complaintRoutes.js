import express from 'express';
import {
  createComplaint,
  getMyComplaints,
  getComplaintById,
  getAllComplaints,
  updateComplaint,
  resolveComplaint,
  confirmResolution,
  reopenComplaint,
} from '../controllers/complaintController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Student routes
router.get('/my', protect, authorize('student'), getMyComplaints);

// Specific action routes
router.patch('/:id/resolve', protect, authorize('admin'), resolveComplaint);
router.patch('/:id/confirm', protect, authorize('student'), confirmResolution);
router.patch('/:id/reopen', protect, authorize('student'), reopenComplaint);

// Standard REST routes
router
  .route('/')
  .post(protect, authorize('student'), createComplaint)
  .get(protect, authorize('admin'), getAllComplaints);

router
  .route('/:id')
  .get(protect, getComplaintById)
  .patch(protect, authorize('admin'), updateComplaint);

export default router;
