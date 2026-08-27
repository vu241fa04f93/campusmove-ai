import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Alert title is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Alert message is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: [
        'bus_delayed',
        'bus_arriving',
        'trip_started',
        'trip_ended',
        'geofence_entered',
        'general',
      ],
      default: 'general',
      index: true,
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical'],
      default: 'info',
      index: true,
    },
    bus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bus',
      index: true,
    },
    route: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route',
      index: true,
    },
    stop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Stop',
      index: true,
    },
    targetAudience: {
      type: String,
      enum: ['all', 'students', 'drivers', 'admins'],
      default: 'all',
    },
    readBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    expiresAt: {
      type: Date,
      index: { expires: 0 }, // TTL index if set
    },
  },
  {
    timestamps: true,
  }
);

export const Alert = mongoose.model('Alert', alertSchema);
