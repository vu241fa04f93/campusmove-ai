import mongoose from 'mongoose';

const predictionHistorySchema = new mongoose.Schema(
  {
    predictionType: {
      type: String,
      enum: ['eta', 'crowd', 'demand', 'summary'],
      required: true,
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
    inputFeatures: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    baseValue: {
      type: mongoose.Schema.Types.Mixed,
    },
    predictedValue: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    adjustment: {
      type: mongoose.Schema.Types.Mixed,
    },
    confidence: {
      type: Number,
      default: 90,
    },
    predictionSource: {
      type: String,
      default: 'ml_model_v1',
    },
  },
  { timestamps: true }
);

export const PredictionHistory = mongoose.model('PredictionHistory', predictionHistorySchema);
