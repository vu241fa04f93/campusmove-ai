import mongoose from 'mongoose';

const driverProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    licenseNumber: {
      type: String,
      trim: true,
      default: '',
    },
    assignedBus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bus',
    },
    dutyStatus: {
      type: String,
      enum: ['available', 'on_trip', 'break', 'off_duty'],
      default: 'available',
    },
    emergencyContact: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

export const DriverProfile = mongoose.model('DriverProfile', driverProfileSchema);
