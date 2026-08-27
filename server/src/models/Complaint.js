import mongoose from 'mongoose';

const complaintHistorySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
    },
    previousStatus: {
      type: String,
    },
    newStatus: {
      type: String,
    },
    message: {
      type: String,
      default: '',
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const complaintSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      unique: true,
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Complaint title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Complaint description is required'],
      trim: true,
    },
    category: {
      type: String,
      enum: [
        'bus_delay',
        'driver_behavior',
        'overcrowding',
        'safety',
        'route_issue',
        'cleanliness',
        'other',
      ],
      default: 'other',
      index: true,
    },
    priority: {
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
    stop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Stop',
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'confirmed'],
      default: 'open',
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
    reopenReason: {
      type: String,
      default: '',
    },
    reopenedAt: {
      type: Date,
    },
    confirmedAt: {
      type: Date,
    },
    history: [complaintHistorySchema],
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to auto-generate human-readable ticket ID if not provided
complaintSchema.pre('validate', function (next) {
  if (!this.ticketId) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    this.ticketId = `CMP-${dateStr}-${randomSuffix}`;
  }
  next();
});

export const Complaint = mongoose.model('Complaint', complaintSchema);
