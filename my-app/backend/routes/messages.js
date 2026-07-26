const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const { body, validationResult } = require('express-validator');

const Message = require('../models/Message');
const Admin = require('../models/Admin');

/**
 * Get staffId linked to admin
 */
async function getExcludedStaffId(req) {
  try {
    const adminId = req.query.adminId;

    if (!adminId) return null;

    const admin = await Admin.findById(adminId).select('staffId');

    if (admin && admin.staffId) {
      return admin.staffId.toString();
    }

    return null;
  } catch (err) {
    console.error('Error resolving staffId:', err);
    return null;
  }
}

/**
 * Populate helper
 */
function withReportedStaffPopulated(query) {
  return query.populate('reportedStaff', 'name role');
}

/**
 * HARD FILTER (final protection)
 */
function filterOutOwnReports(messages, excludedStaffId) {
  if (!excludedStaffId) return messages;

  return messages.filter(msg => {
    if (!msg.reportedStaff) return true;

    return msg.reportedStaff._id.toString() !== excludedStaffId;
  });
}

/**
 * BUILD SAFE QUERY
 */
function buildSafeQuery(baseQuery, excludedStaffId) {
  if (!excludedStaffId) return baseQuery;

  return {
    ...baseQuery,
    $or: [
      { reportedStaff: null }, // ✅ include null
      {
        reportedStaff: {
          $ne: new mongoose.Types.ObjectId(excludedStaffId)
        }
      }
    ]
  };
}

/**
 * GET ALL MESSAGES
 */
router.get('/', async (req, res) => {
  try {
    const { threadToken, filter, date } = req.query;

    let baseQuery = { isDeleted: false };

    const excludedStaffId = await getExcludedStaffId(req);

    if (threadToken) {
      baseQuery.threadToken = threadToken;
    }

    if (date) {
      const start = new Date(date);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      baseQuery.createdAt = { $gte: start, $lt: end };
    }

    if (filter) {
      const now = new Date();
      let startDate;

      if (filter === 'today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (filter === 'last7') {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
      } else if (filter === 'last30') {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
      }

      if (startDate) {
        baseQuery.createdAt = { $gte: startDate };
      }
    }

    const query = buildSafeQuery(baseQuery, excludedStaffId);

    let messages = await withReportedStaffPopulated(
      Message.find(query).sort({ createdAt: -1 })
    );

    messages = filterOutOwnReports(messages, excludedStaffId);

    return res.json({
      success: true,
      messages: messages.map(m => ({
        ...m.toJSON(),
        id: m._id.toString()
      }))
    });

  } catch (err) {
    console.error('GET messages error:', err);
    res.status(500).json({ error: 'Failed to load messages.' });
  }
});

/**
 * GET UNREAD
 */
router.get('/unread', async (req, res) => {
  try {
    let baseQuery = { isRead: false, isDeleted: false };

    const excludedStaffId = await getExcludedStaffId(req);

    const query = buildSafeQuery(baseQuery, excludedStaffId);

    let messages = await withReportedStaffPopulated(
      Message.find(query).sort({ createdAt: -1 })
    );

    messages = filterOutOwnReports(messages, excludedStaffId);

    res.json({
      success: true,
      messages: messages.map(m => ({
        ...m.toJSON(),
        id: m._id.toString()
      }))
    });

  } catch (err) {
    console.error('Unread error:', err);
    res.status(500).json({ error: 'Failed to load unread messages.' });
  }
});

/**
 * GET ONE MESSAGE
 */
router.get('/:id', async (req, res) => {
  try {
    const excludedStaffId = await getExcludedStaffId(req);

    let message = await withReportedStaffPopulated(
      Message.findById(req.params.id)
    );

    if (!message || message.isDeleted) {
      return res.status(404).json({ error: 'Message not found.' });
    }

    if (
      excludedStaffId &&
      message.reportedStaff &&
      message.reportedStaff._id.toString() === excludedStaffId
    ) {
      return res.status(404).json({ error: 'Message not found.' });
    }

    res.json({
      success: true,
      message: {
        ...message.toJSON(),
        id: message._id.toString()
      }
    });

  } catch (err) {
    console.error('Get one error:', err);
    res.status(500).json({ error: 'Failed to load message.' });
  }
});

/**
 * MARK ALL UNREAD MESSAGES AS READ
 */
router.patch('/mark-all-read', async (req, res) => {
  try {
    let baseQuery = { isRead: false, isDeleted: false };
    const excludedStaffId = await getExcludedStaffId(req);
    const query = buildSafeQuery(baseQuery, excludedStaffId);

    const result = await Message.updateMany(query, { isRead: true, readAt: new Date() });
    const modified = result.modifiedCount ?? result.nModified ?? 0;

    return res.json({
      success: true,
      modifiedCount: modified
    });
  } catch (err) {
    console.error('Mark all as read error:', err);
    res.status(500).json({ error: 'Failed to mark messages as read.' });
  }
});

/**
 * MARK ONE MESSAGE AS READ
 */
router.patch('/:id/read', async (req, res) => {
  try {
    const excludedStaffId = await getExcludedStaffId(req);
    if (excludedStaffId) {
      const existing = await Message.findById(req.params.id).select('reportedStaff');
      if (existing && existing.reportedStaff && existing.reportedStaff.toString() === excludedStaffId) {
        return res.status(404).json({ error: 'Message not found.' });
      }
    }

    const updatedMessage = await withReportedStaffPopulated(
      Message.findByIdAndUpdate(
        req.params.id,
        { isRead: true, readAt: new Date() },
        { new: true }
      )
    );

    if (!updatedMessage) {
      return res.status(404).json({ error: 'Message not found.' });
    }

    res.json({
      success: true,
      message: {
        ...updatedMessage.toJSON(),
        id: updatedMessage._id.toString()
      }
    });

  } catch (err) {
    console.error('Mark read error:', err);
    res.status(500).json({ error: 'Failed to mark message as read.' });
  }
});

/**
 * CREATE MESSAGE
 */
router.post(
  '/',
  [
    body('topic').notEmpty(),
    body('message').notEmpty(),
    body('reportedStaff').optional().isMongoId(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
      }

      const { topic, message, reportedStaff } = req.body;

      const newMessage = new Message({
        topic,
        message,
        reportedStaff: reportedStaff || null,
      });

      await newMessage.save();

      res.status(201).json({
        success: true,
        threadToken: newMessage.threadToken
      });

    } catch (err) {
      console.error('Create error:', err);
      res.status(500).json({ error: 'Failed to send message.' });
    }
  }
);

module.exports = router;