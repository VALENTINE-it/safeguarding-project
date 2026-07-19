const request = require('supertest');
const express = require('express');

jest.mock('../models/Message', () => ({
  find: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  create: jest.fn(),
}));

const Message = require('../models/Message');
const messagesRouter = require('../routes/messages');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/messages', messagesRouter);
  return app;
}

describe('admin message inbox endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /api/messages/unread returns unread messages', async () => {
    Message.find.mockReturnValueOnce({
      populate: jest.fn().mockReturnValueOnce({
        sort: jest.fn().mockResolvedValueOnce([
          {
            _id: { toString: () => 'msg-1' },
            topic: 'Safety issue',
            message: 'Needs review',
            isRead: false,
            toJSON: () => ({ topic: 'Safety issue', message: 'Needs review', isRead: false }),
          },
        ]),
      }),
    });

    const response = await request(createApp()).get('/api/messages/unread');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.messages).toHaveLength(1);
    expect(response.body.messages[0].topic).toBe('Safety issue');
  });

  test('PATCH /api/messages/:id/read marks a message as read', async () => {
    Message.findByIdAndUpdate.mockResolvedValueOnce({
      _id: { toString: () => 'msg-2' },
      topic: 'Follow-up',
      message: 'Read now',
      isRead: true,
      readAt: '2026-07-07T00:00:00.000Z',
      toJSON: () => ({ topic: 'Follow-up', message: 'Read now', isRead: true, readAt: '2026-07-07T00:00:00.000Z' }),
    });

    const response = await request(createApp()).patch('/api/messages/msg-2/read');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message.isRead).toBe(true);
  });
});
