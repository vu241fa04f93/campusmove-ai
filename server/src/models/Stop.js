import mongoose from 'mongoose';

const stopSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Stop name is required'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Stop code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    coordinates: {
      lat: {
        type: Number,
        required: [true, 'Latitude is required'],
      },
      lng: {
        type: Number,
        required: [true, 'Longitude is required'],
      },
    },
    campusZone: {
      type: String,
      enum: ['Hostels', 'Academic Zone', 'Administrative', 'Recreational', 'Main Entrance', 'Outer Campus'],
      default: 'Academic Zone',
    },
    amenities: [
      {
        type: String,
        trim: true,
      },
    ],
    orderIndex: {
      type: Number,
      default: 0,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export const Stop = mongoose.model('Stop', stopSchema);
