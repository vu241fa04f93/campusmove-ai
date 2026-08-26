import express from 'express';
import {
  getAllStops,
  getStopById,
  createStop,
  updateStop,
  deleteStop,
} from '../controllers/stopController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(getAllStops)
  .post(protect, authorize('admin'), createStop);

router.route('/:id')
  .get(getStopById)
  .put(protect, authorize('admin'), updateStop)
  .delete(protect, authorize('admin'), deleteStop);

export default router;
