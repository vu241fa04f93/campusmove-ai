import { User } from '../models/User.js';
import { StudentProfile } from '../models/StudentProfile.js';
import { DriverProfile } from '../models/DriverProfile.js';

// @desc Get all users (Admin only)
// @route GET /api/users
export const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    next(error);
  }
};

// @desc Update user role (Admin only)
// @route PUT /api/users/:id/role
export const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['student', 'driver', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role specified' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Ensure corresponding profile exists
    if (role === 'driver') {
      const existing = await DriverProfile.findOne({ user: user._id });
      if (!existing) {
        await DriverProfile.create({ user: user._id });
      }
    } else if (role === 'student') {
      const existing = await StudentProfile.findOne({ user: user._id });
      if (!existing) {
        await StudentProfile.create({ user: user._id });
      }
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};
