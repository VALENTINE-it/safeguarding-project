const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Staff = require('../models/Staff');

const JWT_SECRET = process.env.JWT_SECRET || 'safeguarding_secret_key_2026';

router.post(
  '/register',
  [
    body('username').trim().notEmpty().withMessage('Username is required').isLength({ min: 3, max: 50 }),
    body('email').trim().isEmail().withMessage('A valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
    body('staffId').optional({ checkFalsy: true }).isMongoId().withMessage('Invalid staff selection'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const { username, email, password, staffId } = req.body;

    try {
      const existing = await Admin.findOne({ $or: [{ username }, { email: email.toLowerCase() }] });
      if (existing) {
        return res.status(409).json({ error: 'Username or email already exists.' });
      }

      const adminCount = await Admin.countDocuments();
      if (adminCount >= 3) {
        return res.status(403).json({ error: 'Admin registration limit reached. Maximum of 3 administrator accounts allowed.' });
      }

      let resolvedStaffId = null;
      if (staffId) {
        const staffMember = await Staff.findById(staffId);
        if (!staffMember) {
          return res.status(400).json({ error: 'Selected staff member could not be found.' });
        }

        const alreadyLinked = await Admin.findOne({ staffId });
        if (alreadyLinked) {
          return res.status(409).json({ error: 'That staff member is already linked to another admin account.' });
        }

        resolvedStaffId = staffId;
      }

      const admin = new Admin({ username, email: email.toLowerCase(), staffId: resolvedStaffId });
      admin.setPassword(password);
      await admin.save();

      const token = jwt.sign({ id: admin._id }, JWT_SECRET, { expiresIn: '1d' });

      return res.status(201).json({ success: true, token, admin: admin.toJSON() });
    } catch (err) {
      console.error('Admin registration error:', err);
      return res.status(500).json({ error: 'Unable to register admin account.' });
    }
  }
);

router.post(
  '/login',
  [
    body('username').trim().notEmpty().withMessage('Username or email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    try {
      const admin = await Admin.findOne({
        $or: [{ username }, { email: username.toLowerCase() }],
      });

      if (!admin || !admin.checkPassword(password)) {
        return res.status(401).json({ error: 'Invalid username/email or password.' });
      }

      if (!admin.loginHistory) admin.loginHistory = [];
      admin.loginHistory.push({
        ip: req.ip,
        userAgent: req.get('User-Agent') || 'unknown',
      });
      await admin.save();

      const token = jwt.sign({ id: admin._id }, JWT_SECRET, { expiresIn: '1d' });

      return res.status(200).json({ success: true, token, admin: admin.toJSON() });
    } catch (err) {
      console.error('Admin login error:', err);
      return res.status(500).json({ error: 'Unable to authenticate admin.' });
    }
  }
);

/**
 * GET /api/auth/admins
 * List registered admin accounts and current registration count (max 2)
 */
router.get('/admins', async (req, res) => {
  try {
    const admins = await Admin.find()
      .select('username email staffId createdAt loginHistory')
      .populate('staffId', 'name role');
    
    const adminCount = admins.length;
    const limitReached = adminCount >= 3;

    return res.json({
      success: true,
      count: adminCount,
      limit: 3,
      limitReached,
      admins: admins.map(a => a.toJSON())
    });
  } catch (err) {
    console.error('Error fetching admin accounts:', err);
    return res.status(500).json({ error: 'Failed to fetch admin accounts.' });
  }
});

module.exports = router;
