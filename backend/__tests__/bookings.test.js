const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app } = require('../server');
const db = require('../db');

const testUser = {
  userId: 1,
  email: 'john@example.com',
  role: 'customer'
};

const testToken = jwt.sign(testUser, process.env.JWT_SECRET || 'test-secret');

describe('POST /api/bookings', () => {
  beforeEach(async () => {
    await db.query('TRUNCATE bookings RESTART IDENTITY CASCADE');
    await db.query(
      "INSERT INTO bookings (user_id, vehicle_id, start_date, end_date, status, total_amount) VALUES ($1, $2, $3, $4, $5, $6)",
      [1, 1, '2025-08-15', '2025-08-18', 'completed', 225]
    );
    await db.query(
      "INSERT INTO bookings (user_id, vehicle_id, start_date, end_date, status, total_amount) VALUES ($1, $2, $3, $4, $5, $6)",
      [1, 2, '2025-08-20', '2025-08-22', 'pending', 130]
    );
  });

  describe('Successful booking creation with valid data', () => {
    test('should create a booking with valid data', async () => {
      const bookingData = {
        vehicleId: 3,
        startDate: '2025-12-01',
        endDate: '2025-12-05'
      };

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${testToken}`)
        .send(bookingData)
        .expect(201);

      expect(response.body.message).toBe('Booking created successfully');
      expect(response.body.booking).toMatchObject({
        vehicle: {
          id: 3,
          make: 'BMW',
          model: 'X3',
          year: 2023
        },
        start_date: '2025-12-01',
        end_date: '2025-12-05',
        status: 'pending',
        total_amount: 480
      });
      expect(response.body.booking.id).toBeDefined();
      expect(response.body.booking.created_at).toBeDefined();
    });

    test('should require authentication', async () => {
      const bookingData = {
        vehicleId: 3,
        startDate: '2025-12-01',
        endDate: '2025-12-05'
      };

      await request(app)
        .post('/api/bookings')
        .send(bookingData)
        .expect(401);
    });
  });

  describe('Failed booking attempt due to date conflict', () => {
    test('should reject booking with overlapping dates', async () => {
      const bookingData = {
        vehicleId: 2,
        startDate: '2025-08-21',
        endDate: '2025-08-23'
      };

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${testToken}`)
        .send(bookingData)
        .expect(409);

      expect(response.body.error).toContain('Vehicle is not available for the selected dates');
      expect(response.body.conflictingBooking).toBeDefined();
      expect(response.body.conflictingBooking.start_date).toBe('2025-08-20');
      expect(response.body.conflictingBooking.end_date).toBe('2025-08-22');
    });

    test('should reject booking that starts during existing booking', async () => {
      const bookingData = {
        vehicleId: 2,
        startDate: '2025-08-21',
        endDate: '2025-08-25'
      };

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${testToken}`)
        .send(bookingData)
        .expect(409);

      expect(response.body.error).toContain('Vehicle is not available for the selected dates');
    });

    test('should reject booking that ends during existing booking', async () => {
      const bookingData = {
        vehicleId: 2,
        startDate: '2025-08-19',
        endDate: '2025-08-21'
      };

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${testToken}`)
        .send(bookingData)
        .expect(409);

      expect(response.body.error).toContain('Vehicle is not available for the selected dates');
    });

    test('should allow booking that ends exactly when another starts', async () => {
      const bookingData = {
        vehicleId: 2,
        startDate: '2025-08-18',
        endDate: '2025-08-20'
      };

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${testToken}`)
        .send(bookingData)
        .expect(201);

      expect(response.body.message).toBe('Booking created successfully');
    });
  });

  describe('Failed booking attempt due to invalid input', () => {
    test('should reject booking with non-existent vehicle ID', async () => {
      const bookingData = {
        vehicleId: 999,
        startDate: '2025-12-01',
        endDate: '2025-12-05'
      };

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${testToken}`)
        .send(bookingData)
        .expect(404);

      expect(response.body.error).toBe('Vehicle not found');
    });

    test('should reject booking with missing required fields', async () => {
      const bookingData = {
        vehicleId: 3
      };

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${testToken}`)
        .send(bookingData)
        .expect(400);

      expect(response.body.error).toBe('Vehicle ID, start date, and end date are required');
    });

    test('should reject booking with invalid date format', async () => {
      const bookingData = {
        vehicleId: 3,
        startDate: '12/01/2025',
        endDate: '2025-12-05'
      };

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${testToken}`)
        .send(bookingData)
        .expect(400);

      expect(response.body.error).toBe('Dates must be in YYYY-MM-DD format');
    });

    test('should reject booking with end date before start date', async () => {
      const bookingData = {
        vehicleId: 3,
        startDate: '2025-12-05',
        endDate: '2025-12-01'
      };

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${testToken}`)
        .send(bookingData)
        .expect(400);

      expect(response.body.error).toBe('End date must be after start date');
    });

    test('should reject booking with start date in the past', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const pastDate = yesterday.toISOString().split('T')[0];

      const bookingData = {
        vehicleId: 3,
        startDate: pastDate,
        endDate: '2025-12-05'
      };

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${testToken}`)
        .send(bookingData)
        .expect(400);

      expect(response.body.error).toBe('Start date cannot be in the past');
    });

    test('should reject booking with invalid vehicle ID format', async () => {
      const bookingData = {
        vehicleId: 'invalid',
        startDate: '2025-12-01',
        endDate: '2025-12-05'
      };

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${testToken}`)
        .send(bookingData)
        .expect(400);

      expect(response.body.error).toBe('Vehicle ID must be a valid number');
    });
  });
});
