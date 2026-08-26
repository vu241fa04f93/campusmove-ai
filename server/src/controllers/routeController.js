import { Route } from '../models/Route.js';
import { Stop } from '../models/Stop.js';

// Helper to auto-populate path coordinates if not provided
const ensurePathCoordinates = async (routeData) => {
  if (
    (!routeData.pathCoordinates || routeData.pathCoordinates.length === 0) &&
    routeData.stops &&
    routeData.stops.length > 0
  ) {
    const stopIds = routeData.stops.map((s) => s.stop);
    const stopsList = await Stop.find({ _id: { $in: stopIds } });
    const stopMap = {};
    stopsList.forEach((st) => {
      stopMap[st._id.toString()] = st;
    });

    const coords = [];
    routeData.stops.forEach((s) => {
      const stopObj = stopMap[s.stop?.toString()];
      if (stopObj && stopObj.coordinates) {
        coords.push([stopObj.coordinates.lat, stopObj.coordinates.lng]);
      }
    });

    if (coords.length > 0) {
      routeData.pathCoordinates = coords;
    }
  }
  return routeData;
};

// @desc Get all routes
// @route GET /api/routes
export const getAllRoutes = async (req, res, next) => {
  try {
    const routes = await Route.find().populate('stops.stop');
    res.status(200).json({ success: true, count: routes.length, data: routes });
  } catch (error) {
    next(error);
  }
};

// @desc Get single route
// @route GET /api/routes/:id
export const getRouteById = async (req, res, next) => {
  try {
    const route = await Route.findById(req.params.id).populate('stops.stop');
    if (!route) {
      return res.status(404).json({ success: false, message: 'Route not found' });
    }
    res.status(200).json({ success: true, data: route });
  } catch (error) {
    next(error);
  }
};

// @desc Create a route
// @route POST /api/routes (Admin only)
export const createRoute = async (req, res, next) => {
  try {
    const preparedData = await ensurePathCoordinates(req.body);
    const route = await Route.create(preparedData);
    const populatedRoute = await Route.findById(route._id).populate('stops.stop');
    res.status(201).json({ success: true, data: populatedRoute });
  } catch (error) {
    next(error);
  }
};

// @desc Update a route
// @route PUT /api/routes/:id (Admin only)
export const updateRoute = async (req, res, next) => {
  try {
    const preparedData = await ensurePathCoordinates(req.body);
    const route = await Route.findByIdAndUpdate(req.params.id, preparedData, {
      new: true,
      runValidators: true,
    }).populate('stops.stop');

    if (!route) {
      return res.status(404).json({ success: false, message: 'Route not found' });
    }

    res.status(200).json({ success: true, data: route });
  } catch (error) {
    next(error);
  }
};

// @desc Delete a route
// @route DELETE /api/routes/:id (Admin only)
export const deleteRoute = async (req, res, next) => {
  try {
    const route = await Route.findById(req.params.id);
    if (!route) {
      return res.status(404).json({ success: false, message: 'Route not found' });
    }

    await route.deleteOne();
    res.status(200).json({ success: true, message: 'Route deleted successfully' });
  } catch (error) {
    next(error);
  }
};
