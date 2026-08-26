import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    category: {
      type: String,
      enum: ['Delay', 'Overcrowding', 'Driver Behavior', 'Bus Condition', 'Missed Stop', 'Schedule Discrepancy', 'Other'],
      default: 'Delay',
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
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['New', 'In Progress', 'Resolved', 'Reopened'],
      default: 'New',
    },
    adminResponse: {
      type: String,
      default: '',
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    studentFeedback: {
      type: String,
      enum: ['Confirmed Resolved', 'Partially Resolved', 'Not Resolved'],
    },
  },
  { timestamps: true }
);

export const Complaint = mongoose.model('Complaint', complaintSchema);
