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

const superAdminSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Super Admin username is required'],
      trim: true,
      unique: true,
      minlength: [3, 'Username must be at least 3 characters long'],
      maxlength: [50, 'Username must be 50 characters or fewer'],
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Super Admin email is required'],
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
    loginHistory: [loginHistorySchema],
  },
  {
    timestamps: true,
  }
);

superAdminSchema.methods.setPassword = function (password) {
  this.salt = crypto.randomBytes(16).toString('hex');
  this.passwordHash = crypto
    .pbkdf2Sync(password, this.salt, 100000, 64, 'sha512')
    .toString('hex');
};

superAdminSchema.methods.checkPassword = function (password) {
  const candidate = crypto
    .pbkdf2Sync(password, this.salt, 100000, 64, 'sha512')
    .toString('hex');
  return this.passwordHash === candidate;
};

superAdminSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.salt;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('SuperAdmin', superAdminSchema);
