import { Bus } from '../models/Bus.js';
import { DriverProfile } from '../models/DriverProfile.js';

// @desc Get all buses
// @route GET /api/buses
export const getAllBuses = async (req, res, next) => {
  try {
    const buses = await Bus.find()
      .populate('currentDriver', 'name email phone')
      .populate({
        path: 'currentRoute',
        populate: { path: 'stops.stop', select: 'name code coordinates campusZone' },
      });
    res.status(200).json({ success: true, count: buses.length, data: buses });
  } catch (error) {
    next(error);
  }
};

// @desc Get single bus
// @route GET /api/buses/:id
export const getBusById = async (req, res, next) => {
  try {
    const bus = await Bus.findById(req.params.id)
      .populate('currentDriver', 'name email phone')
      .populate({
        path: 'currentRoute',
        populate: { path: 'stops.stop', select: 'name code coordinates campusZone' },
      });

    if (!bus) {
      return res.status(404).json({ success: false, message: 'Bus not found' });
    }

    res.status(200).json({ success: true, data: bus });
  } catch (error) {
    next(error);
  }
};

// @desc Create a bus
// @route POST /api/buses (Admin only)
export const createBus = async (req, res, next) => {
  try {
    const bus = await Bus.create(req.body);

    if (bus.currentDriver) {
      await DriverProfile.findOneAndUpdate(
        { user: bus.currentDriver },
        { assignedBus: bus._id }
      );
    }

    res.status(201).json({ success: true, data: bus });
  } catch (error) {
    next(error);
  }
};

// @desc Update a bus
// @route PUT /api/buses/:id (Admin or Assigned Driver)
export const updateBus = async (req, res, next) => {
  try {
    const bus = await Bus.findById(req.params.id);
    if (!bus) {
      return res.status(404).json({ success: false, message: 'Bus not found' });
    }

    // Check permissions: Admin can edit anything; Driver can only edit their assigned bus status
    if (req.user.role === 'driver') {
      if (bus.currentDriver && bus.currentDriver.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Cannot modify a bus not assigned to you' });
      }
    }

    const updatedBus = await Bus.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate('currentDriver', 'name email phone')
      .populate('currentRoute');

    // Update driver profile if driver assignment changed
    if (req.body.currentDriver) {
      await DriverProfile.findOneAndUpdate(
        { user: req.body.currentDriver },
        { assignedBus: updatedBus._id }
      );
    }

    res.status(200).json({ success: true, data: updatedBus });
  } catch (error) {
    next(error);
  }
};

// @desc Delete a bus
// @route DELETE /api/buses/:id (Admin only)
export const deleteBus = async (req, res, next) => {
  try {
    const bus = await Bus.findById(req.params.id);
    if (!bus) {
      return res.status(404).json({ success: false, message: 'Bus not found' });
    }

    await bus.deleteOne();
    res.status(200).json({ success: true, message: 'Bus removed successfully' });
  } catch (error) {
    next(error);
  }
};
