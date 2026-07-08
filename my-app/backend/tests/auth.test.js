const request = require('supertest');
const express = require('express');

const mockSave = jest.fn();
const mockSetPassword = jest.fn();
const mockToJSON = jest.fn();

jest.mock('../models/Admin', () => {
  const Admin = jest.fn().mockImplementation(function (data) {
    this.username = data?.username;
    this.email = data?.email;
    this.save = mockSave;
    this.setPassword = mockSetPassword;
    this.toJSON = mockToJSON;
  });

  Admin.findOne = jest.fn();
  Admin.countDocuments = jest.fn();

  return Admin;
});

const Admin = require('../models/Admin');
const authRouter = require('../routes/auth');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  return app;
}

describe('admin registration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSave.mockReset();
    mockSetPassword.mockReset();
    mockToJSON.mockReset();
  });

  test('rejects registration when three admins already exist', async () => {
    Admin.findOne.mockResolvedValueOnce(null);
    Admin.countDocuments.mockResolvedValueOnce(3);

    const response = await request(createApp()).post('/api/auth/register').send({
      username: 'admin4',
      email: 'admin4@example.com',
      password: 'strongpass123',
    });

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Admin registration limit reached. Only 3 admin accounts are allowed.');
  });
});
