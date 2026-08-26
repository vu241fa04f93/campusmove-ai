import mongoose from 'mongoose';

const studentProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    studentId: {
      type: String,
      trim: true,
      default: '',
    },
    department: {
      type: String,
      default: 'Computer Science',
    },
    hostel: {
      type: String,
      default: 'Hostel 3',
    },
    savedStops: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Stop',
      },
    ],
    defaultRoute: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route',
    },
  },
  { timestamps: true }
);

export const StudentProfile = mongoose.model('StudentProfile', studentProfileSchema);
