const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const Message = require('../models/Message');
const Reply = require('../models/Reply');

/**
 * GET /api/threads/:threadToken
 * Retrieve a thread (original message + all replies) by token.
 * Marks the message as read on first access (self-destruct trigger).
 */
router.get(
  '/:threadToken',
  [
    param('threadToken')
      .isUUID()
      .withMessage('Invalid thread token format'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    try {
      const { threadToken } = req.params;

      const thread = await Message.findOne({ threadToken }).populate('replies');

      if (!thread) {
        return res.status(404).json({ error: 'Thread not found. Check your token.' });
      }

      // Mark as read on first access
      if (!thread.isRead) {
        thread.isRead = true;
        thread.readAt = new Date();
        await thread.save();
      }

      return res.json({
        success: true,
        thread: {
          threadToken: thread.threadToken,
          topic: thread.isDeleted ? '[deleted]' : thread.topic,
          message: thread.isDeleted ? '[deleted]' : thread.message,
          isDeleted: thread.isDeleted,
          isRead: thread.isRead,
          readAt: thread.readAt,
          createdAt: thread.createdAt,
          replies: thread.replies,
        },
      });
    } catch (err) {
      console.error('Error fetching thread:', err);
      return res.status(500).json({ error: 'Failed to retrieve thread.' });
    }
  }
);

/**
 * POST /api/threads/:threadToken/reply
 * Add a follow-up message to an existing thread.
 */
router.post(
  '/:threadToken/reply',
  [
    param('threadToken')
      .isUUID()
      .withMessage('Invalid thread token format'),
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
      const { threadToken } = req.params;
      const { topic, message } = req.body;

      const thread = await Message.findOne({ threadToken });

      if (!thread) {
        return res.status(404).json({ error: 'Thread not found. Check your token.' });
      }

      if (thread.isDeleted) {
        return res.status(410).json({ error: 'This thread has been deleted.' });
      }

      // Create the reply
      const reply = await Reply.create({ threadToken, topic, message });

      // Link reply to thread
      thread.replies.push(reply._id);
      await thread.save();

      return res.status(201).json({
        success: true,
        message: 'Your follow-up has been sent securely.',
        reply: {
          topic: reply.topic,
          createdAt: reply.createdAt,
        },
      });
    } catch (err) {
      console.error('Error adding reply:', err);
      return res.status(500).json({ error: 'Failed to send follow-up. Please try again.' });
    }
  }
);

module.exports = router;
