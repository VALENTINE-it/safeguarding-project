const mongoose = require('mongoose');
const crypto = require('crypto');

const loginHistorySchema = new mongoose.Schema(
  {
    ip: { type: String },
    userAgent: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const adminSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      trim: true,
      unique: true,
      minlength: [3, 'Username must be at least 3 characters long'],
      maxlength: [50, 'Username must be 50 characters or fewer'],
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      unique: true,
      lowercase: true,
      match: [/.+@.+\..+/, 'Please enter a valid email address'],
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    salt: {
      type: String,
      required: true,
    },
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      default: null,
      sparse: true,
    },
    loginHistory: [loginHistorySchema],
  },
  {
    timestamps: true,
  }
);

adminSchema.methods.setPassword = function (password) {
  this.salt = crypto.randomBytes(16).toString('hex');
  this.passwordHash = crypto
    .pbkdf2Sync(password, this.salt, 100000, 64, 'sha512')
    .toString('hex');
};

adminSchema.methods.checkPassword = function (password) {
  const candidate = crypto
    .pbkdf2Sync(password, this.salt, 100000, 64, 'sha512')
    .toString('hex');
  return this.passwordHash === candidate;
};

adminSchema.methods.toJSON = function () {
  const adminObject = this.toObject();
  delete adminObject.passwordHash;
  delete adminObject.salt;
  delete adminObject.__v;
  return adminObject;
};

module.exports = mongoose.model('Admin', adminSchema);