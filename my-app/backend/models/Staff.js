const mongoose = require('mongoose');

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
