import { Stop } from '../models/Stop.js';

// @desc Get all stops
// @route GET /api/stops
export const getAllStops = async (req, res, next) => {
  try {
    const stops = await Stop.find().sort({ campusZone: 1, name: 1 });
    res.status(200).json({ success: true, count: stops.length, data: stops });
  } catch (error) {
    next(error);
  }
};

// @desc Get single stop
// @route GET /api/stops/:id
export const getStopById = async (req, res, next) => {
  try {
    const stop = await Stop.findById(req.params.id);
    if (!stop) {
      return res.status(404).json({ success: false, message: 'Stop not found' });
    }
    res.status(200).json({ success: true, data: stop });
  } catch (error) {
    next(error);
  }
};

// @desc Create a stop
// @route POST /api/stops (Admin only)
export const createStop = async (req, res, next) => {
  try {
    const stop = await Stop.create(req.body);
    res.status(201).json({ success: true, data: stop });
  } catch (error) {
    next(error);
  }
};

// @desc Update a stop
// @route PUT /api/stops/:id (Admin only)
export const updateStop = async (req, res, next) => {
  try {
    const stop = await Stop.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!stop) {
      return res.status(404).json({ success: false, message: 'Stop not found' });
    }

    res.status(200).json({ success: true, data: stop });
  } catch (error) {
    next(error);
  }
};

// @desc Delete a stop
// @route DELETE /api/stops/:id (Admin only)
export const deleteStop = async (req, res, next) => {
  try {
    const stop = await Stop.findById(req.params.id);
    if (!stop) {
      return res.status(404).json({ success: false, message: 'Stop not found' });
    }

    await stop.deleteOne();
    res.status(200).json({ success: true, message: 'Stop deleted successfully' });
  } catch (error) {
    next(error);
  }
};
