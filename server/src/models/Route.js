import mongoose from 'mongoose';

const routeStopSchema = new mongoose.Schema(
  {
    stop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Stop',
      required: true,
    },
    sequence: {
      type: Number,
      required: true,
    },
    distanceFromStartKm: {
      type: Number,
      default: 0,
    },
    estimatedMinutesFromStart: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const routeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Route name is required'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Route code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    color: {
      type: String,
      default: '#2563eb', // Blue default
    },
    stops: [routeStopSchema],
    pathCoordinates: [
      {
        type: [Number], // [lat, lng]
      },
    ],
    totalDistanceKm: {
      type: Number,
      default: 0,
    },
    estimatedDurationMinutes: {
      type: Number,
      default: 15,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export const Route = mongoose.model('Route', routeSchema);
