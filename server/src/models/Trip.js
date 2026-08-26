import mongoose from 'mongoose';

const tripSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    originStop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Stop',
      required: true,
    },
    destinationStop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Stop',
      required: true,
    },
    requiredArrivalTime: {
      type: String, // e.g. "09:00"
    },
    recommendedBus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bus',
    },
    recommendedRoute: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route',
    },
    status: {
      type: String,
      enum: ['planned', 'active', 'completed', 'cancelled'],
      default: 'planned',
    },
    estimatedWalkingTimeMinutes: {
      type: Number,
      default: 5,
    },
    safetyBufferMinutes: {
      type: Number,
      default: 8,
    },
    aiExplanation: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

export const Trip = mongoose.model('Trip', tripSchema);
