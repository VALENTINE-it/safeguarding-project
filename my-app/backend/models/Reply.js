const mongoose = require('mongoose');

/**
 * Reply schema
 *
 * A reply is attached to an existing thread via `threadToken`.
 * Replies can come from either the original sender or an admin respondent.
 */
const replySchema = new mongoose.Schema(
  {
    threadToken: {
      type: String,
      required: [true, 'Thread token is required'],
      index: true,
    },
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
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

replySchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    if (ret.isDeleted) {
      ret.topic = '[deleted]';
      ret.message = '[deleted]';
    }
    return ret;
  },
});

module.exports = mongoose.model('Reply', replySchema);
