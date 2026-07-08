const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Admin = require('../models/Admin');

router.post(
  '/register',
  [
    body('username').trim().notEmpty().withMessage('Username is required').isLength({ min: 3, max: 50 }),
    body('email').trim().isEmail().withMessage('A valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;

    try {
      const existing = await Admin.findOne({ $or: [{ username }, { email }] });
      if (existing) {
        return res.status(409).json({ error: 'Username or email already exists.' });
      }

      const admin = new Admin({ username, email });
      admin.setPassword(password);
      await admin.save();

      return res.status(201).json({ success: true, admin: admin.toJSON() });
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

      admin.loginHistory.push({
        ip: req.ip,
        userAgent: req.get('User-Agent') || 'unknown',
      });
      await admin.save();

      return res.status(200).json({ success: true, admin: admin.toJSON() });
    } catch (err) {
      console.error('Admin login error:', err);
      return res.status(500).json({ error: 'Unable to authenticate admin.' });
    }
  }
);

module.exports = router;
