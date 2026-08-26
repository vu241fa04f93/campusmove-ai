import express from 'express';
import {
  getAllBuses,
  getBusById,
  getBusLiveLocation,
  createBus,
  updateBus,
  deleteBus,
} from '../controllers/busController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(getAllBuses)
  .post(protect, authorize('admin'), createBus);

router.route('/:id/live')
  .get(getBusLiveLocation);

router.route('/:id')
  .get(getBusById)
  .put(protect, authorize('admin', 'driver'), updateBus)
  .delete(protect, authorize('admin'), deleteBus);

export default router;
