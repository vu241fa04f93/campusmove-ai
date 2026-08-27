import mongoose from 'mongoose';

const alertSubscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    notifyBusDelays: {
      type: Boolean,
      default: true,
    },
    notifyBusArrival: {
      type: Boolean,
      default: true,
    },
    notifyRouteUpdates: {
      type: Boolean,
      default: true,
    },
    notifyGeofence: {
      type: Boolean,
      default: true,
    },
    subscribedStops: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Stop',
      },
    ],
    subscribedBuses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bus',
      },
    ],
    subscribedRoutes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Route',
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const AlertSubscription = mongoose.model(
  'AlertSubscription',
  alertSubscriptionSchema
);
