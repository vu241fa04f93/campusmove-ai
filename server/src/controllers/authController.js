import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { StudentProfile } from '../models/StudentProfile.js';
import { DriverProfile } from '../models/DriverProfile.js';

// Helper to sign JWT
const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'campusmove_super_secret_jwt_key_2026_phase1_foundation',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// @desc Register user
// @route POST /api/auth/register
export const register = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, studentId, department, hostel, licenseNumber } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'student',
      phone: phone || '',
    });

    // Create corresponding profile
    if (user.role === 'student') {
      await StudentProfile.create({
        user: user._id,
        studentId: studentId || '',
        department: department || 'General Sciences',
        hostel: hostel || 'Hostel 3',
      });
    } else if (user.role === 'driver') {
      await DriverProfile.create({
        user: user._id,
        licenseNumber: licenseNumber || '',
      });
    }

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc Login user
// @route POST /api/auth/login
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = generateToken(user._id);

    // Fetch profile info if student/driver
    let profile = null;
    if (user.role === 'student') {
      profile = await StudentProfile.findOne({ user: user._id });
    } else if (user.role === 'driver') {
      profile = await DriverProfile.findOne({ user: user._id }).populate('assignedBus');
    }

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        profile,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get current logged in user
// @route GET /api/auth/me
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    let profile = null;

    if (user.role === 'student') {
      profile = await StudentProfile.findOne({ user: user._id }).populate('savedStops defaultRoute');
    } else if (user.role === 'driver') {
      profile = await DriverProfile.findOne({ user: user._id }).populate('assignedBus');
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        profile,
      },
    });
  } catch (error) {
    next(error);
  }
};
