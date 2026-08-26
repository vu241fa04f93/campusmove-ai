import express from 'express';
import {
  getAllSchedules,
  getScheduleById,
  createSchedule,
  updateSchedule,
  deleteSchedule,
} from '../controllers/scheduleController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(getAllSchedules)
  .post(protect, authorize('admin'), createSchedule);

router.route('/:id')
  .get(getScheduleById)
  .put(protect, authorize('admin'), updateSchedule)
  .delete(protect, authorize('admin'), deleteSchedule);

export default router;
