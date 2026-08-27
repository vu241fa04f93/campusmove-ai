import mongoose from 'mongoose';

const incidentSchema = new mongoose.Schema(
  {
    incidentNumber: {
      type: String,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Incident title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Incident description is required'],
    },
    type: {
      type: String,
      enum: ['accident', 'breakdown', 'traffic', 'safety', 'medical', 'other'],
      default: 'other',
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
      index: true,
    },
    bus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bus',
    },
    route: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route',
    },
    location: {
      lat: { type: Number },
      lng: { type: Number },
      address: { type: String, default: '' },
      description: { type: String, default: '' },
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['reported', 'investigating', 'resolved', 'closed'],
      default: 'reported',
      index: true,
    },
    resolutionNotes: {
      type: String,
      default: '',
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    resolvedAt: {
      type: Date,
    },
    closedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to auto-generate human-readable incident number
incidentSchema.pre('validate', function (next) {
  if (!this.incidentNumber) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    this.incidentNumber = `INC-${dateStr}-${randomSuffix}`;
  }
  next();
});

export const Incident = mongoose.model('Incident', incidentSchema);
