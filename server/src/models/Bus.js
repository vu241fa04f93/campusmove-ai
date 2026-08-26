import mongoose from 'mongoose';

const busSchema = new mongoose.Schema(
  {
    busNumber: {
      type: String,
      required: [true, 'Bus number is required'],
      unique: true,
      trim: true,
    },
    plateNumber: {
      type: String,
      required: [true, 'Plate number is required'],
      unique: true,
      trim: true,
    },
    model: {
      type: String,
      default: 'Electric Campus Shuttle',
    },
    capacity: {
      type: Number,
      default: 40,
    },
    status: {
      type: String,
      enum: ['active', 'delayed', 'breakdown', 'out_of_service'],
      default: 'active',
    },
    currentDriver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    currentRoute: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route',
    },
    lastKnownLocation: {
      lat: { type: Number, default: 28.545 },
      lng: { type: Number, default: 77.192 },
      speed: { type: Number, default: 0 },
      heading: { type: Number, default: 0 },
      updatedAt: { type: Date, default: Date.now },
    },
    currentPassengerCount: {
      type: Number,
      default: 0,
    },
    statusMessage: {
      type: String,
      default: 'Operating normally',
    },
  },
  { timestamps: true }
);

export const Bus = mongoose.model('Bus', busSchema);
