import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true
    },
    seq: {
      type: Number,
      required: true,
      default: 0
    }
  },
  { timestamps: true }
);

export const Counter = mongoose.models.Counter
  ?? mongoose.model('Counter', counterSchema, 'counters');
