import { Incident } from '../models/Incident.js';
import { getIO } from '../realtime/socket.js';

// Safe Socket.IO emission helper
const emitSocketEvent = (event, data) => {
  try {
    const io = getIO();
    io.emit(event, data);
  } catch {
    // Socket.IO may be inactive in some test environments
  }
};

/**
 * @desc Report a transport incident (Driver / Admin)
 * @route POST /api/incidents
 * @access Private (Driver / Admin)
 */
export const createIncident = async (req, res, next) => {
  try {
    const { title, description, type, severity, bus, route, location } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Title and description are required for incident report.',
      });
    }

    const incident = await Incident.create({
      title: title.trim(),
      description: description.trim(),
      type: type || 'other',
      severity: severity || 'medium',
      bus: bus || null,
      route: route || null,
      location: location || {},
      reportedBy: req.user._id,
      status: 'reported',
    });

    const populated = await Incident.findById(incident._id)
      .populate('reportedBy', 'name email role phone')
      .populate('bus', 'busNumber plateNumber status')
      .populate('route', 'name code')
      .lean();

    emitSocketEvent('incident:created', populated);

    res.status(201).json({
      success: true,
      message: 'Incident reported successfully',
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get all incidents (Admin / Driver)
 * @route GET /api/incidents
 * @access Private (Admin / Driver / Authorized)
 */
export const getAllIncidents = async (req, res, next) => {
  try {
    const { status, severity, type, busId, routeId, limit = 50, page = 1 } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (severity) filter.severity = severity;
    if (type) filter.type = type;
    if (busId) filter.bus = busId;
    if (routeId) filter.route = routeId;

    // If driver, only show their reported incidents or unclosed incidents
    if (req.user.role === 'driver') {
      filter.$or = [{ reportedBy: req.user._id }, { status: { $ne: 'closed' } }];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [incidents, total] = await Promise.all([
      Incident.find(filter)
        .populate('reportedBy', 'name email role phone')
        .populate('bus', 'busNumber plateNumber status')
        .populate('route', 'name code')
        .populate('resolvedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
      Incident.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: incidents.length,
      total,
      data: incidents,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get single incident details
 * @route GET /api/incidents/:id
 * @access Private (Admin / Driver / Student read-only)
 */
export const getIncidentById = async (req, res, next) => {
  try {
    const incident = await Incident.findById(req.params.id)
      .populate('reportedBy', 'name email role phone')
      .populate('bus', 'busNumber plateNumber status')
      .populate('route', 'name code')
      .populate('resolvedBy', 'name email')
      .lean();

    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    res.status(200).json({
      success: true,
      data: incident,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Update incident status / details (Admin)
 * @route PATCH /api/incidents/:id
 * @access Private (Admin)
 */
export const updateIncident = async (req, res, next) => {
  try {
    const { status, severity, resolutionNotes, description } = req.body;

    const incident = await Incident.findByIdAndUpdate(
      req.params.id,
      {
        ...(status && { status }),
        ...(severity && { severity }),
        ...(resolutionNotes && { resolutionNotes }),
        ...(description && { description }),
      },
      { new: true, runValidators: true }
    )
      .populate('reportedBy', 'name email role')
      .populate('bus', 'busNumber plateNumber status')
      .populate('route', 'name code')
      .populate('resolvedBy', 'name email')
      .lean();

    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    emitSocketEvent('incident:updated', incident);

    res.status(200).json({
      success: true,
      message: 'Incident updated successfully',
      data: incident,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Resolve incident (Admin)
 * @route PATCH /api/incidents/:id/resolve
 * @access Private (Admin)
 */
export const resolveIncident = async (req, res, next) => {
  try {
    const { resolutionNotes, notes } = req.body;
    const resolutionMessage = resolutionNotes || notes || 'Incident investigated and resolved.';

    const incident = await Incident.findByIdAndUpdate(
      req.params.id,
      {
        status: 'resolved',
        resolutionNotes: resolutionMessage,
        resolvedBy: req.user._id,
        resolvedAt: new Date(),
      },
      { new: true, runValidators: true }
    )
      .populate('reportedBy', 'name email role')
      .populate('bus', 'busNumber plateNumber status')
      .populate('route', 'name code')
      .populate('resolvedBy', 'name email')
      .lean();

    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    emitSocketEvent('incident:updated', incident);

    res.status(200).json({
      success: true,
      message: 'Incident resolved successfully',
      data: incident,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Close incident (Admin)
 * @route PATCH /api/incidents/:id/close
 * @access Private (Admin)
 */
export const closeIncident = async (req, res, next) => {
  try {
    const incident = await Incident.findByIdAndUpdate(
      req.params.id,
      {
        status: 'closed',
        closedAt: new Date(),
      },
      { new: true, runValidators: true }
    )
      .populate('reportedBy', 'name email role')
      .populate('bus', 'busNumber plateNumber status')
      .populate('route', 'name code')
      .populate('resolvedBy', 'name email')
      .lean();

    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    emitSocketEvent('incident:updated', incident);

    res.status(200).json({
      success: true,
      message: 'Incident closed and archived',
      data: incident,
    });
  } catch (error) {
    next(error);
  }
};
