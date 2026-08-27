import { Complaint } from '../models/Complaint.js';
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
 * @desc Create new transport complaint (Student)
 * @route POST /api/complaints
 * @access Private (Student)
 */
export const createComplaint = async (req, res, next) => {
  try {
    const { title, description, category, priority, bus, route, stop } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Title and description are required.',
      });
    }

    const complaint = await Complaint.create({
      student: req.user._id,
      title: title.trim(),
      description: description.trim(),
      category: category || 'other',
      priority: priority || 'medium',
      bus: bus || null,
      route: route || null,
      stop: stop || null,
      status: 'open',
      history: [
        {
          action: 'created',
          newStatus: 'open',
          message: 'Complaint submitted by student',
          performedBy: req.user._id,
          timestamp: new Date(),
        },
      ],
    });

    const populated = await Complaint.findById(complaint._id)
      .populate('student', 'name email hostel department')
      .populate('bus', 'busNumber plateNumber')
      .populate('route', 'name code')
      .populate('stop', 'name code')
      .lean();

    emitSocketEvent('complaint:created', populated);

    res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully',
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get current student's complaints
 * @route GET /api/complaints/my
 * @access Private (Student)
 */
export const getMyComplaints = async (req, res, next) => {
  try {
    const { status, category, priority } = req.query;
    const filter = { student: req.user._id };

    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;

    const complaints = await Complaint.find(filter)
      .populate('bus', 'busNumber plateNumber')
      .populate('route', 'name code')
      .populate('stop', 'name code')
      .populate('resolvedBy', 'name email')
      .populate('history.performedBy', 'name role')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: complaints.length,
      data: complaints,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get single complaint by ID (Student can view own, Admin can view any)
 * @route GET /api/complaints/:id
 * @access Private (Student/Admin)
 */
export const getComplaintById = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('student', 'name email hostel department phone')
      .populate('bus', 'busNumber plateNumber')
      .populate('route', 'name code')
      .populate('stop', 'name code')
      .populate('resolvedBy', 'name email')
      .populate('history.performedBy', 'name role email')
      .lean();

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    // RBAC: Check ownership if student
    if (req.user.role === 'student' && complaint.student._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own complaints.',
      });
    }

    res.status(200).json({
      success: true,
      data: complaint,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get all complaints with filters (Admin)
 * @route GET /api/complaints
 * @access Private (Admin)
 */
export const getAllComplaints = async (req, res, next) => {
  try {
    const { status, category, priority, studentId, search, limit = 50, page = 1 } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;
    if (studentId) filter.student = studentId;

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { ticketId: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [complaints, total] = await Promise.all([
      Complaint.find(filter)
        .populate('student', 'name email hostel department')
        .populate('bus', 'busNumber plateNumber')
        .populate('route', 'name code')
        .populate('stop', 'name code')
        .populate('resolvedBy', 'name email')
        .populate('history.performedBy', 'name role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
      Complaint.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: complaints.length,
      total,
      data: complaints,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Update complaint status/priority (Admin)
 * @route PATCH /api/complaints/:id
 * @access Private (Admin)
 */
export const updateComplaint = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    const previousStatus = complaint.status;
    const { status, priority, category, resolutionNotes } = req.body;

    if (status && status !== previousStatus) {
      complaint.status = status;
      complaint.history.push({
        action: 'status_changed',
        previousStatus,
        newStatus: status,
        message: req.body.message || `Status updated to ${status}`,
        performedBy: req.user._id,
        timestamp: new Date(),
      });
    }

    if (priority) complaint.priority = priority;
    if (category) complaint.category = category;
    if (resolutionNotes) complaint.resolutionNotes = resolutionNotes;

    await complaint.save();

    const populated = await Complaint.findById(complaint._id)
      .populate('student', 'name email hostel department')
      .populate('bus', 'busNumber plateNumber')
      .populate('route', 'name code')
      .populate('stop', 'name code')
      .populate('resolvedBy', 'name email')
      .populate('history.performedBy', 'name role')
      .lean();

    emitSocketEvent('complaint:updated', populated);

    res.status(200).json({
      success: true,
      message: 'Complaint updated successfully',
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Resolve complaint (Admin)
 * @route PATCH /api/complaints/:id/resolve
 * @access Private (Admin)
 */
export const resolveComplaint = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    const previousStatus = complaint.status;
    const { resolutionNotes, resolutionMessage } = req.body;
    const message = resolutionNotes || resolutionMessage || 'Complaint resolved by transport administration.';

    complaint.status = 'resolved';
    complaint.resolutionNotes = message;
    complaint.resolvedBy = req.user._id;
    complaint.resolvedAt = new Date();

    complaint.history.push({
      action: 'resolved',
      previousStatus,
      newStatus: 'resolved',
      message,
      performedBy: req.user._id,
      timestamp: new Date(),
    });

    await complaint.save();

    const populated = await Complaint.findById(complaint._id)
      .populate('student', 'name email hostel department')
      .populate('bus', 'busNumber plateNumber')
      .populate('route', 'name code')
      .populate('stop', 'name code')
      .populate('resolvedBy', 'name email')
      .populate('history.performedBy', 'name role')
      .lean();

    emitSocketEvent('complaint:resolved', populated);
    emitSocketEvent('complaint:updated', populated);

    res.status(200).json({
      success: true,
      message: 'Complaint marked as resolved',
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Confirm resolution (Student)
 * @route PATCH /api/complaints/:id/confirm
 * @access Private (Student)
 */
export const confirmResolution = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    // RBAC: Verify student ownership
    if (complaint.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only confirm resolution for your own complaints.',
      });
    }

    if (complaint.status !== 'resolved') {
      return res.status(400).json({
        success: false,
        message: `Cannot confirm resolution on complaint with status '${complaint.status}'. It must be in 'resolved' state.`,
      });
    }

    const previousStatus = complaint.status;
    complaint.status = 'confirmed';
    complaint.confirmedAt = new Date();

    complaint.history.push({
      action: 'confirmed',
      previousStatus,
      newStatus: 'confirmed',
      message: req.body.feedback || 'Student confirmed satisfaction with resolution',
      performedBy: req.user._id,
      timestamp: new Date(),
    });

    await complaint.save();

    const populated = await Complaint.findById(complaint._id)
      .populate('student', 'name email hostel department')
      .populate('bus', 'busNumber plateNumber')
      .populate('route', 'name code')
      .populate('stop', 'name code')
      .populate('resolvedBy', 'name email')
      .populate('history.performedBy', 'name role')
      .lean();

    emitSocketEvent('complaint:updated', populated);

    res.status(200).json({
      success: true,
      message: 'Resolution confirmed successfully',
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Reopen resolved complaint (Student)
 * @route PATCH /api/complaints/:id/reopen
 * @access Private (Student)
 */
export const reopenComplaint = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    // RBAC: Verify student ownership
    if (complaint.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only reopen your own complaints.',
      });
    }

    const { reopenReason, reason } = req.body;
    const reasonText = reopenReason || reason || 'Issue was not adequately resolved.';

    const previousStatus = complaint.status;
    complaint.status = 'open';
    complaint.reopenReason = reasonText;
    complaint.reopenedAt = new Date();

    complaint.history.push({
      action: 'reopened',
      previousStatus,
      newStatus: 'open',
      message: reasonText,
      performedBy: req.user._id,
      timestamp: new Date(),
    });

    await complaint.save();

    const populated = await Complaint.findById(complaint._id)
      .populate('student', 'name email hostel department')
      .populate('bus', 'busNumber plateNumber')
      .populate('route', 'name code')
      .populate('stop', 'name code')
      .populate('resolvedBy', 'name email')
      .populate('history.performedBy', 'name role')
      .lean();

    emitSocketEvent('complaint:updated', populated);

    res.status(200).json({
      success: true,
      message: 'Complaint reopened and set to open status',
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};
