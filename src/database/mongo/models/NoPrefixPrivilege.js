import mongoose from 'mongoose';

const noPrefixPrivilegeSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true
    },
    active: {
      type: Boolean,
      default: true,
      index: true
    },
    addedBy: {
      type: String,
      required: true
    },
    removedBy: {
      type: String,
      default: null
    },
    reason: {
      type: String,
      default: null
    },
    removedReason: {
      type: String,
      default: null
    },
    removedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

export const NoPrefixPrivilege =
  mongoose.models.NoPrefixPrivilege ??
  mongoose.model('NoPrefixPrivilege', noPrefixPrivilegeSchema, 'no_prefix_privileges');
