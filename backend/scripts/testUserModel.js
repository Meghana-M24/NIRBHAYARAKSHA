// Minimal env for model/DB tests (avoids requiring full app env beyond what's needed by loaded modules)
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-at-least-32-characters-long!!';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';
process.env.CORS_ORIGINS = process.env.CORS_ORIGINS || 'http://localhost:5173';
process.env.TRUST_PROXY = process.env.TRUST_PROXY || 'false';
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'error';

await import('dotenv/config');
const { default: mongoose } = await import('mongoose');
const { connectDB } = await import('../config/db.js');
const { default: User } = await import('../models/User.js');

const TEST_EMAIL = `model-test-${Date.now()}-${Math.random().toString(36).slice(2, 10)}@example.com`;

async function testUserModel() {
  let createdId = null;
  try {
    await connectDB();

    const created = await User.create({
      name: 'Model Test User',
      email: TEST_EMAIL,
      passwordHash: 'dummy-hash-not-a-real-password',
      phone: '9999999999',
    });
    createdId = created._id;

    console.log('Created user:', created.toJSON());

    const found = await User.findOne({ _id: createdId });

    console.log(
      'passwordHash selected by default:',
      found?.passwordHash
    );

    const foundWithSecret = await User.findOne({ _id: createdId }).select(
      '+passwordHash'
    );

    console.log(
      'passwordHash exists when explicitly selected:',
      Boolean(foundWithSecret?.passwordHash)
    );

    console.log('Test assertions completed.');
  } catch (error) {
    console.error('User model test failed:', error.message);
    throw error;
  } finally {
    if (createdId) {
      try {
        await User.deleteOne({ _id: createdId });
        console.log('Cleaned up test user by _id.');
      } catch (cleanupErr) {
        console.error('Cleanup failed:', cleanupErr.message);
      }
    }
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
  }
}

testUserModel().catch(() => process.exit(1));