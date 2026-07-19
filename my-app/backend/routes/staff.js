const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const Staff = require('../models/Staff');
const Admin = require('../models/Admin');

/**
 * GET /api/staff
 * List all staff members. Used both by the "Manage Staff" admin page
 * and by the public reporting form (so a reporter can optionally
 * select who their report concerns).
 */
router.get('/', async (req, res) => {
  try {
    const staff = await Staff.find().sort({ name: 1 });
    return res.status(200).json({
      success: true,
      staff: staff.map((member) => member.toJSON()),
    });
  } catch (err) {
    console.error('Error fetching staff:', err);
    return res.status(500).json({ error: 'Failed to load staff list.' });
  }
});

/**
 * POST /api/staff
 * Add a new staff member. Intended to be used by the organisation
 * (e.g. HR/admin) to keep the staff directory up to date.
 */
router.post(
  '/',
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Staff name is required')
      .isLength({ max: 200 })
      .withMessage('Name must be 200 characters or fewer'),
    body('role')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 100 })
      .withMessage('Role must be 100 characters or fewer'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    try {
      const { name, role } = req.body;
      const staff = await Staff.create({ name, role: role || '' });
      return res.status(201).json({ success: true, staff: staff.toJSON() });
    } catch (err) {
      console.error('Error creating staff member:', err);
      return res.status(500).json({ error: 'Failed to add staff member.' });
    }
  }
);

/**
 * DELETE /api/staff/:id
 * Remove a staff member from the directory. Any admin account linked
 * to this staff member is unlinked (their staffId is cleared) so the
 * account isn't left pointing at a deleted record.
 */
router.delete(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid staff id')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;
      const staff = await Staff.findByIdAndDelete(id);

      if (!staff) {
        return res.status(404).json({ error: 'Staff member not found.' });
      }

      await Admin.updateMany({ staffId: id }, { $set: { staffId: null } });

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('Error deleting staff member:', err);
      return res.status(500).json({ error: 'Failed to remove staff member.' });
    }
  }
);

module.exports = router;
