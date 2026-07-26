const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const SuperAdmin = require('../models/SuperAdmin');

const JWT_SECRET = process.env.JWT_SECRET || 'safeguarding_secret_key_2026';

/**
 * POST /api/super-auth/register
 * Register a Super Admin account
 */
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
      const existing = await SuperAdmin.findOne({
        $or: [{ username }, { email: email.toLowerCase() }],
      });
      if (existing) {
        return res.status(409).json({ error: 'Super Admin username or email already exists.' });
      }

      const superAdmin = new SuperAdmin({
        username,
        email: email.toLowerCase(),
      });
      superAdmin.setPassword(password);
      await superAdmin.save();

      const token = jwt.sign({ id: superAdmin._id, role: 'superadmin' }, JWT_SECRET, { expiresIn: '1d' });

      return res.status(201).json({
        success: true,
        token,
        superAdmin: superAdmin.toJSON(),
      });
    } catch (err) {
      console.error('Super Admin registration error:', err);
      return res.status(500).json({ error: 'Unable to register Super Admin account.' });
    }
  }
);

/**
 * POST /api/super-auth/login
 * Super Admin login
 */
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
      const superAdmin = await SuperAdmin.findOne({
        $or: [{ username }, { email: username.toLowerCase() }],
      });

      if (!superAdmin || !superAdmin.checkPassword(password)) {
        return res.status(401).json({ error: 'Invalid Super Admin credentials.' });
      }

      if (!superAdmin.loginHistory) superAdmin.loginHistory = [];
      superAdmin.loginHistory.push({
        ip: req.ip,
        userAgent: req.get('User-Agent') || 'unknown',
      });
      await superAdmin.save();

      const token = jwt.sign({ id: superAdmin._id, role: 'superadmin' }, JWT_SECRET, { expiresIn: '1d' });

      return res.status(200).json({
        success: true,
        token,
        superAdmin: superAdmin.toJSON(),
      });
    } catch (err) {
      console.error('Super Admin login error:', err);
      return res.status(500).json({ error: 'Unable to authenticate Super Admin.' });
    }
  }
);

module.exports = router;
