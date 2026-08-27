import { Alert } from '../models/Alert.js';
import { AlertSubscription } from '../models/AlertSubscription.js';
import { getIO } from '../realtime/socket.js';

/**
 * @desc Get alerts (filtered by user preferences & read status)
 * @route GET /api/alerts
 * @access Public / Authenticated
 */
export const getAlerts = async (req, res, next) => {
  try {
    const { unreadOnly, type, severity, busId, routeId, limit = 50 } = req.query;
    const userId = req.user?._id;
    const userRole = req.user?.role || 'student';

    const query = { active: true };

    // Audience filter
    if (userRole === 'student') {
      query.targetAudience = { $in: ['all', 'students'] };
    } else if (userRole === 'driver') {
      query.targetAudience = { $in: ['all', 'drivers'] };
    }

    if (type) query.type = type;
    if (severity) query.severity = severity;
    if (busId) query.bus = busId;
    if (routeId) query.route = routeId;

    if (unreadOnly === 'true' && userId) {
      query['readBy.user'] = { $ne: userId };
    }

    const alerts = await Alert.find(query)
      .populate('bus', 'busNumber plateNumber status statusMessage')
      .populate('stop', 'name code campusZone')
      .populate('route', 'name code color')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10))
      .lean();

    // Calculate unread count for the current user
    let unreadCount = 0;
    if (userId) {
      unreadCount = await Alert.countDocuments({
        active: true,
        targetAudience: { $in: ['all', userRole === 'driver' ? 'drivers' : 'students'] },
        'readBy.user': { $ne: userId },
      });
    }

    // Attach isRead flag
    const formattedAlerts = alerts.map((a) => ({
      ...a,
      isRead: userId ? a.readBy?.some((r) => r.user?.toString() === userId.toString()) : false,
    }));

    res.status(200).json({
      success: true,
      count: formattedAlerts.length,
      unreadCount,
      data: formattedAlerts,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get single alert by ID
 * @route GET /api/alerts/:id
 * @access Public / Authenticated
 */
export const getAlertById = async (req, res, next) => {
  try {
    const alert = await Alert.findById(req.params.id)
      .populate('bus', 'busNumber plateNumber status')
      .populate('stop', 'name code campusZone')
      .populate('route', 'name code color')
      .lean();

    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    const userId = req.user?._id;
    const isRead = userId ? alert.readBy?.some((r) => r.user?.toString() === userId.toString()) : false;

    res.status(200).json({
      success: true,
      data: { ...alert, isRead },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Create manual alert (Admin or Driver broadcast)
 * @route POST /api/alerts
 * @access Private (Admin / Driver)
 */
export const createAlert = async (req, res, next) => {
  try {
    const { title, message, type, severity, bus, route, stop, targetAudience, metadata } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Title and message are required.',
      });
    }

    const alert = await Alert.create({
      title,
      message,
      type: type || 'general',
      severity: severity || 'info',
      bus: bus || null,
      route: route || null,
      stop: stop || null,
      targetAudience: targetAudience || 'all',
      metadata: metadata || {},
    });

    const populated = await Alert.findById(alert._id)
      .populate('bus', 'busNumber plateNumber status')
      .populate('stop', 'name code campusZone')
      .populate('route', 'name code color')
      .lean();

    // Broadcast in real-time
    try {
      const io = getIO();
      io.emit('alert:new', populated);
    } catch {
      // socket might be off in certain standalone testing environments
    }

    res.status(201).json({
      success: true,
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Mark alert as read by current user
 * @route PATCH /api/alerts/:id/read
 * @access Private (Authenticated)
 */
export const markAlertAsRead = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const alertId = req.params.id;

    const alert = await Alert.findById(alertId);
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    const alreadyRead = alert.readBy.some((r) => r.user.toString() === userId.toString());
    if (!alreadyRead) {
      alert.readBy.push({ user: userId, readAt: new Date() });
      await alert.save();
    }

    res.status(200).json({
      success: true,
      message: 'Alert marked as read',
      data: { alertId, isRead: true },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Mark all active alerts as read for current user
 * @route POST /api/alerts/mark-all-read
 * @access Private (Authenticated)
 */
export const markAllAlertsAsRead = async (req, res, next) => {
  try {
    const userId = req.user._id;

    await Alert.updateMany(
      { active: true, 'readBy.user': { $ne: userId } },
      { $push: { readBy: { user: userId, readAt: new Date() } } }
    );

    res.status(200).json({
      success: true,
      message: 'All alerts marked as read',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Update alert (Admin management)
 * @route PATCH /api/alerts/:id
 * @access Private (Admin)
 */
export const updateAlert = async (req, res, next) => {
  try {
    const alert = await Alert.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate('bus', 'busNumber plateNumber status')
      .populate('stop', 'name code campusZone')
      .populate('route', 'name code color')
      .lean();

    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    res.status(200).json({
      success: true,
      data: alert,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get user's notification preferences
 * @route GET /api/alerts/preferences
 * @access Private (Authenticated)
 */
export const getPreferences = async (req, res, next) => {
  try {
    let sub = await AlertSubscription.findOne({ user: req.user._id })
      .populate('subscribedStops', 'name code')
      .populate('subscribedBuses', 'busNumber plateNumber')
      .populate('subscribedRoutes', 'name code')
      .lean();

    if (!sub) {
      sub = await AlertSubscription.create({ user: req.user._id });
    }

    res.status(200).json({
      success: true,
      data: sub,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Update user's notification preferences
 * @route PUT /api/alerts/preferences
 * @access Private (Authenticated)
 */
export const updatePreferences = async (req, res, next) => {
  try {
    const sub = await AlertSubscription.findOneAndUpdate(
      { user: req.user._id },
      { ...req.body, user: req.user._id },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Preferences updated successfully',
      data: sub,
    });
  } catch (error) {
    next(error);
  }
};
