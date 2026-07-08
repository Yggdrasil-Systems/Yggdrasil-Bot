import mongoose from 'mongoose';

const migrationSchema = new mongoose.Schema(
  {
    version: {
      type: Number,
      required: true,
      unique: true
    },
    name: {
      type: String,
      required: true
    },
    appliedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: false }
);

export const Migration = mongoose.models.Migration ?? mongoose.model('Migration', migrationSchema, 'migrations');
