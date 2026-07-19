const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Message = require('../models/Message');
const Admin = require('../models/Admin');

/**
 * Resolve the requesting admin's linked staffId (if any) from an
 * `adminId` query param sent by the frontend. Returns null if no
 * admin was identified or the admin isn't linked to a staff record.
 *
 * NOTE: this app currently has no session/JWT layer — admin identity
 * is passed by the client the same way the rest of this codebase
 * already handles it (no auth middleware on any /api/messages route).
 * That means this check is a data-hiding safeguard, not a security
 * boundary: it stops a linked admin's own dashboard from ever
 * displaying a report about them, but a determined client could
 * still omit/alter adminId. Adding real authenticated sessions is a
 * good follow-up but is out of scope for this change.
 */
async function getExcludedStaffId(req) {
  const { adminId } = req.query;
  if (!adminId) return null;

  try {
    const admin = await Admin.findById(adminId).select('staffId');
    return admin && admin.staffId ? admin.staffId.toString() : null;
  } catch (err) {
    // Invalid/unknown adminId — treat as "no admin identified"
    return null;
  }
}

function withReportedStaffPopulated(query) {
  return query.populate('reportedStaff', 'name role');
}

router.get('/', async (req, res) => {
  try {
    const { threadToken, filter, date } = req.query;
    const query = { isDeleted: false };

    const excludedStaffId = await getExcludedStaffId(req);
    if (excludedStaffId) {
      query.reportedStaff = { $ne: excludedStaffId };
    }

    if (threadToken) {
      query.threadToken = threadToken;
    }

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      query.createdAt = { $gte: startDate, $lt: endDate };
    } else if (filter) {
      const now = new Date();
      let startDate;

      if (filter === 'today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (filter === 'last7') {
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
      } else if (filter === 'last30') {
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 30);
      } else if (filter === 'year') {
        startDate = new Date(now.getFullYear(), 0, 1);
      }

      if (startDate) {
        query.createdAt = { $gte: startDate };
      }
    }

    const messages = await withReportedStaffPopulated(Message.find(query)).sort({ createdAt: -1 });
    const formattedMessages = messages.map((message) => ({
      ...message.toJSON(),
      id: message._id.toString(),
    }));

    return res.status(200).json({
      success: true,
      messages: formattedMessages,
    });
  } catch (err) {
    console.error('Error fetching messages:', err);
    return res.status(500).json({ error: 'Failed to load messages.' });
  }
});

router.get('/unread', async (req, res) => {
  try {
    const query = { isRead: false, isDeleted: false };

    const excludedStaffId = await getExcludedStaffId(req);
    if (excludedStaffId) {
      query.reportedStaff = { $ne: excludedStaffId };
    }

    const messages = await withReportedStaffPopulated(Message.find(query)).sort({ createdAt: -1 });
    const formattedMessages = messages.map((message) => ({
      ...message.toJSON(),
      id: message._id.toString(),
    }));

    return res.status(200).json({
      success: true,
      messages: formattedMessages,
    });
  } catch (err) {
    console.error('Error fetching unread messages:', err);
    return res.status(500).json({ error: 'Failed to load unread messages.' });
  }
});

// Mark all unread messages as read (must come before /:id/read)
router.patch('/mark-all-read', async (req, res) => {
  try {
    const query = { isRead: false, isDeleted: false };

    const excludedStaffId = await getExcludedStaffId(req);
    if (excludedStaffId) {
      // Never touch (or even acknowledge) messages reported against
      // this admin's own staff record.
      query.reportedStaff = { $ne: excludedStaffId };
    }

    const result = await Message.updateMany(query, { isRead: true, readAt: new Date() });

    // Mongoose returned object shape varies by version — prefer modifiedCount
    const modified = result.modifiedCount ?? result.nModified ?? 0;

    return res.status(200).json({
      success: true,
      modifiedCount: modified,
    });
  } catch (err) {
    console.error('Error marking all messages as read:', err);
    return res.status(500).json({ error: 'Failed to mark messages as read.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const message = await withReportedStaffPopulated(Message.findById(req.params.id));
    if (!message || message.isDeleted) {
      return res.status(404).json({ success: false, error: 'Message not found.' });
    }

    const excludedStaffId = await getExcludedStaffId(req);
    if (
      excludedStaffId &&
      message.reportedStaff &&
      message.reportedStaff._id.toString() === excludedStaffId
    ) {
      // Respond the same way as "not found" — an admin who was
      // reported in a message should never learn that a report
      // about them exists.
      return res.status(404).json({ success: false, error: 'Message not found.' });
    }

    return res.status(200).json({
      success: true,
      message: {
        ...message.toJSON(),
        id: message._id.toString(),
      },
    });
  } catch (err) {
    console.error('Error fetching message by id:', err);
    return res.status(500).json({ success: false, error: 'Failed to load message.' });
  }
});

router.patch('/:id/read', async (req, res) => {
  try {
    const excludedStaffId = await getExcludedStaffId(req);
    if (excludedStaffId) {
      const existing = await Message.findById(req.params.id).select('reportedStaff');
      if (existing && existing.reportedStaff && existing.reportedStaff.toString() === excludedStaffId) {
        return res.status(404).json({ error: 'Message not found.' });
      }
    }

    const updatedMessage = await Message.findByIdAndUpdate(
      req.params.id,
      {
        isRead: true,
        readAt: new Date(),
      },
      { new: true }
    );

    if (!updatedMessage) {
      return res.status(404).json({ error: 'Message not found.' });
    }

    return res.status(200).json({
      success: true,
      message: {
        ...updatedMessage.toJSON(),
        id: updatedMessage._id.toString(),
      },
    });
  } catch (err) {
    console.error('Error marking message as read:', err);
    return res.status(500).json({ error: 'Failed to mark message as read.' });
  }
});

/**
 * POST /api/messages
 * Submit a new anonymous safeguarding message.
 * Optionally names a staff member the report concerns via `reportedStaff`.
 * Returns a threadToken the sender can use to follow up.
 */
router.post(
  '/',
  [
    body('topic')
      .trim()
      .notEmpty()
      .withMessage('Topic is required')
      .isLength({ max: 200 })
      .withMessage('Topic must be 200 characters or fewer'),
    body('message')
      .trim()
      .notEmpty()
      .withMessage('Message is required')
      .isLength({ max: 5000 })
      .withMessage('Message must be 5000 characters or fewer'),
    body('reportedStaff')
      .optional({ checkFalsy: true })
      .isMongoId()
      .withMessage('Invalid staff selection'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    try {
      const { topic, message, reportedStaff } = req.body;

      const newMessage = await Message.create({
        topic,
        message,
        reportedStaff: reportedStaff || null,
      });

      // Return the thread token so the sender can follow up anonymously
      return res.status(201).json({
        success: true,
        threadToken: newMessage.threadToken,
        message: 'Your message has been sent securely.',
      });
    } catch (err) {
      console.error('Error creating message:', err);
      return res.status(500).json({ error: 'Failed to send message. Please try again.' });
    }
  }
);

module.exports = router;
