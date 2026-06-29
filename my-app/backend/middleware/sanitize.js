/**
 * sanitize.js
 *
 * Strips HTML tags and trims whitespace from all string fields
 * in req.body before they reach route handlers.
 */
const sanitizeHtml = require('sanitize-html');

const sanitizeBody = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  next();
};

function sanitizeObject(obj) {
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeHtml(value, {
        allowedTags: [],       // strip all HTML
        allowedAttributes: {},
      }).trim();
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

module.exports = sanitizeBody;
