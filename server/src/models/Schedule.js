import mongoose from 'mongoose';

const scheduleSchema = new mongoose.Schema(
  {
    route: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route',
      required: [true, 'Route reference is required'],
    },
    bus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bus',
      required: [true, 'Bus reference is required'],
    },
    departureTime: {
      type: String,
      required: [true, 'Departure time is required (e.g. 08:30)'],
    },
    estimatedArrivalTime: {
      type: String,
      default: '',
    },
    frequencyMinutes: {
      type: Number,
      default: 15,
    },
    daysOfWeek: {
      type: [Number], // 1 = Monday, ..., 7 = Sunday
      default: [1, 2, 3, 4, 5, 6],
    },
    direction: {
      type: String,
      enum: ['outbound', 'inbound', 'circular'],
      default: 'outbound',
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export const Schedule = mongoose.model('Schedule', scheduleSchema);
