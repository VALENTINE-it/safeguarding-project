const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Message = require('../models/Message');

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
