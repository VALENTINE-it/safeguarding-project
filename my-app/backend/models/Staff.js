const mongoose = require('mongoose');

/**
 * Staff schema
 *
 * Represents a staff member of the organisation. This list is
 * maintained by the organisation (via the admin "Manage Staff" page)
 * and is shown to reporters so they can optionally indicate that
 * their report concerns a specific staff member.
 *
 * If an admin account is linked to a staff record (Admin.staffId),
 * that admin will never be shown messages where `reportedStaff`
 * matches their own staff record — see routes/messages.js.
 */
const staffSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Staff name is required'],
      trim: true,
      maxlength: [200, 'Name must be 200 characters or fewer'],
    },
    role: {
      type: String,
      trim: true,
      maxlength: [100, 'Role must be 100 characters or fewer'],
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

staffSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Staff', staffSchema);
