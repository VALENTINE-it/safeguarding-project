const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  topic: String,
  message: String,

  reportedStaff: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    default: null
  },

  threadToken: {
    type: String,
    default: () => new mongoose.Types.ObjectId().toString()
  },

  isRead: {
    type: Boolean,
    default: false
  },

  isDeleted: {
    type: Boolean,
    default: false
  },

  readAt: Date,

  createdAt: {
    type: Date,
    default: Date.now
  }
});

// ✅ THIS LINE IS CRITICAL
module.exports = mongoose.model('Message', messageSchema);