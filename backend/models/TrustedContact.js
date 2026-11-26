import mongoose from 'mongoose';

export const RELATIONSHIPS = [
  'Family',
  'Friend',
  'Relative',
  'Colleague',
  'Other',
];

const trustedContactSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    name: {
      type: String,
      required: [true, 'Contact name is required'],
      trim: true,
      maxlength: [100, 'Contact name cannot exceed 100 characters'],
    },

    phone: {
      type: String,
      required: [true, 'Contact phone number is required'],
      trim: true,
      match: [/^[0-9]{10}$/, 'Phone number must be exactly 10 digits'],
    },

    relationship: {
      type: String,
      required: [true, 'Relationship is required'],
      trim: true,
      enum: {
        values: RELATIONSHIPS,
        message:
          'Relationship must be Family, Friend, Relative, Colleague, or Other',
      },
    },

    // Contact priority for NIRBHAYA RAKSHA escalation/order (1 = highest).
    // Optional for now to avoid breaking existing API flows; when set, must be 1,2, or 3
    // and unique per owner (enforced by a sparse unique index below).
    priority: {
      type: Number,
      enum: {
        values: [1, 2, 3],
        message: 'Priority must be 1, 2, or 3',
      },
    },
  },
  {
    timestamps: true,
  }
);

trustedContactSchema.index({ owner: 1, createdAt: 1 });
// Prevent duplicate priorities per user only when priority is set (number). Multiple contacts without priority are allowed.
trustedContactSchema.index(
  { owner: 1, priority: 1 },
  {
    unique: true,
    partialFilterExpression: { priority: { $type: 'number' } },
    name: 'unique_owner_priority_when_set',
  }
);

trustedContactSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.owner;
    delete ret.__v;
    return ret;
  },
});

const TrustedContact = mongoose.model(
  'TrustedContact',
  trustedContactSchema
);

export default TrustedContact;