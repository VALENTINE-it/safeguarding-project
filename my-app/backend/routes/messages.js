const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Message = require('../models/Message');

router.get('/', async (req, res) => {
  try {
    const { threadToken, filter, date } = req.query;
    const query = { isDeleted: false };

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

    const messages = await Message.find(query).sort({ createdAt: -1 });
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
    const messages = await Message.find({ isRead: false, isDeleted: false }).sort({ createdAt: -1 });
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
    const result = await Message.updateMany({ isRead: false, isDeleted: false }, { isRead: true, readAt: new Date() });

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
    const message = await Message.findById(req.params.id);
    if (!message || message.isDeleted) {
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
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    try {
      const { topic, message } = req.body;

      const newMessage = await Message.create({ topic, message });

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
