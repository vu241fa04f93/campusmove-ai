import express from 'express';
import {
  getAllRoutes,
  getRouteById,
  createRoute,
  updateRoute,
  deleteRoute,
} from '../controllers/routeController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(getAllRoutes)
  .post(protect, authorize('admin'), createRoute);

router.route('/:id')
  .get(getRouteById)
  .put(protect, authorize('admin'), updateRoute)
  .delete(protect, authorize('admin'), deleteRoute);

export default router;
