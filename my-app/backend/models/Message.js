const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

/**
 * Message schema
 *
 * Each new safeguarding message gets a unique `threadToken`
 * so the sender can follow up later without revealing their identity.
 *
 * `isRead` and `readAt` support the "self-destruct after read" feature.
 */
const messageSchema = new mongoose.Schema(
  {
    topic: {
      type: String,
      required: [true, 'Topic is required'],
      trim: true,
      maxlength: [200, 'Topic must be 200 characters or fewer'],
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      maxlength: [5000, 'Message must be 5000 characters or fewer'],
    },
    // Token used to retrieve/follow up on this thread — never stored in browser
    threadToken: {
      type: String,
      unique: true,
      default: () => uuidv4(),
      index: true,
    },
    // Optional: the staff member this report concerns. If set, and the
    // report concerns a staff member who is also an admin, that admin
    // must be excluded from ever seeing this message (see routes/messages.js).
    reportedStaff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      default: null,
      index: true,
    },
    // Chain of follow-up replies
    replies: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Reply',
      },
    ],
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
    // Soft-delete: message is marked deleted after being read (self-destruct)
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Never return the internal _id or __v to clients
messageSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    // Do not expose the actual message content once deleted
    if (ret.isDeleted) {
      ret.topic = '[deleted]';
      ret.message = '[deleted]';
    }
    return ret;
  },
});

module.exports = mongoose.model('Message', messageSchema);
