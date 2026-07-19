const request = require('supertest');
const express = require('express');

jest.mock('../models/Message', () => ({
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  create: jest.fn(),
}));

jest.mock('../models/Admin', () => ({
  findById: jest.fn(),
}));

const Message = require('../models/Message');
const Admin = require('../models/Admin');
const messagesRouter = require('../routes/messages');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/messages', messagesRouter);
  return app;
}

describe('hiding messages reported against the logged-in admin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /api/messages excludes reports about the admin\'s own staff record', async () => {
    Admin.findById.mockReturnValueOnce({
      select: jest.fn().mockResolvedValueOnce({ staffId: 'staff-123' }),
    });

    const sortMock = jest.fn().mockResolvedValueOnce([]);
    const populateMock = jest.fn().mockReturnValueOnce({ sort: sortMock });
    Message.find.mockReturnValueOnce({ populate: populateMock });

    const response = await request(createApp()).get('/api/messages?adminId=admin-1');

    expect(response.status).toBe(200);
    // The query passed to Message.find should exclude the admin's own staffId
    expect(Message.find).toHaveBeenCalledWith(
      expect.objectContaining({ reportedStaff: { $ne: 'staff-123' } })
    );
  });

  test('GET /api/messages/:id returns 404 when the message reports the requesting admin', async () => {
    Admin.findById.mockReturnValueOnce({
      select: jest.fn().mockResolvedValueOnce({ staffId: 'staff-123' }),
    });

    Message.findById.mockReturnValueOnce({
      populate: jest.fn().mockResolvedValueOnce({
        isDeleted: false,
        reportedStaff: { _id: { toString: () => 'staff-123' } },
      }),
    });

    const response = await request(createApp()).get('/api/messages/msg-1?adminId=admin-1');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });

  test('GET /api/messages/:id returns the message when it reports a different staff member', async () => {
    Admin.findById.mockReturnValueOnce({
      select: jest.fn().mockResolvedValueOnce({ staffId: 'staff-123' }),
    });

    Message.findById.mockReturnValueOnce({
      populate: jest.fn().mockResolvedValueOnce({
        _id: { toString: () => 'msg-1' },
        isDeleted: false,
        reportedStaff: { _id: { toString: () => 'staff-999' }, name: 'Someone Else' },
        toJSON: () => ({ topic: 'Concern', message: 'Details' }),
      }),
    });

    const response = await request(createApp()).get('/api/messages/msg-1?adminId=admin-1');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
