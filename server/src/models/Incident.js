import mongoose from 'mongoose';

const incidentSchema = new mongoose.Schema(
  {
    bus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bus',
    },
    route: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route',
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['Breakdown', 'Severe Delay', 'Route Blockage', 'Accident', 'Weather Disruption', 'Other'],
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    severity: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Medium',
    },
    resolved: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export const Incident = mongoose.model('Incident', incidentSchema);
