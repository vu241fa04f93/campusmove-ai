import express from 'express';
import { getAllUsers, updateUserRole } from '../controllers/userController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, authorize('admin'), getAllUsers);

router.route('/:id/role')
  .put(protect, authorize('admin'), updateUserRole);

export default router;
