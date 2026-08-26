import { Schedule } from '../models/Schedule.js';

// @desc Get all schedules
// @route GET /api/schedules
export const getAllSchedules = async (req, res, next) => {
  try {
    const { routeId, busId } = req.query;
    const query = {};
    if (routeId) query.route = routeId;
    if (busId) query.bus = busId;

    const schedules = await Schedule.find(query)
      .populate({
        path: 'route',
        populate: { path: 'stops.stop' },
      })
      .populate('bus')
      .sort({ departureTime: 1 });

    res.status(200).json({ success: true, count: schedules.length, data: schedules });
  } catch (error) {
    next(error);
  }
};

// @desc Get single schedule
// @route GET /api/schedules/:id
export const getScheduleById = async (req, res, next) => {
  try {
    const schedule = await Schedule.findById(req.params.id)
      .populate('route')
      .populate('bus');

    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }

    res.status(200).json({ success: true, data: schedule });
  } catch (error) {
    next(error);
  }
};

// @desc Create a schedule
// @route POST /api/schedules (Admin only)
export const createSchedule = async (req, res, next) => {
  try {
    const schedule = await Schedule.create(req.body);
    const populated = await Schedule.findById(schedule._id)
      .populate('route')
      .populate('bus');
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

// @desc Update a schedule
// @route PUT /api/schedules/:id (Admin only)
export const updateSchedule = async (req, res, next) => {
  try {
    const schedule = await Schedule.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate('route')
      .populate('bus');

    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }

    res.status(200).json({ success: true, data: schedule });
  } catch (error) {
    next(error);
  }
};

// @desc Delete a schedule
// @route DELETE /api/schedules/:id (Admin only)
export const deleteSchedule = async (req, res, next) => {
  try {
    const schedule = await Schedule.findById(req.params.id);
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }

    await schedule.deleteOne();
    res.status(200).json({ success: true, message: 'Schedule deleted successfully' });
  } catch (error) {
    next(error);
  }
};
