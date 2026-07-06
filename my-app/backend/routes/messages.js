const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Message = require('../models/Message');

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

// Mark all unread messages as read
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
