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

const TEST_EMAIL = `password-test-${Date.now()}-${Math.random().toString(36).slice(2, 10)}@example.com`;
const PLAIN_PASSWORD = 'CorrectHorseBatteryStaple!42';

async function testPasswordHashing() {
  let createdId = null;
  try {
    await connectDB();

    const passwordHash = await User.hashPassword(PLAIN_PASSWORD);

    console.log('Hash is not plaintext:', passwordHash !== PLAIN_PASSWORD);
    console.log('Hash uses bcrypt format:', passwordHash.startsWith('$2'));
    console.log('Hash cost factor:', passwordHash.split('$')[2]);

    const created = await User.create({
      name: 'Password Test User',
      email: TEST_EMAIL,
      passwordHash,
    });
    createdId = created._id;

    console.log(
      'Stored hash equals generated hash:',
      created.passwordHash === passwordHash
    );

    const user = await User.findOne({ _id: createdId }).select('+passwordHash');

    console.log(
      'Correct password matches:',
      await user.comparePassword(PLAIN_PASSWORD)
    );

    console.log(
      'Wrong password matches:',
      await user.comparePassword('wrong-password')
    );

    const normalUser = await User.findOne({ _id: createdId });
    console.log(
      'Normal query hides passwordHash:',
      normalUser.passwordHash === undefined
    );

    console.log(
      'User JSON hides passwordHash:',
      created.toJSON().passwordHash === undefined
    );

    console.log('Password hashing test assertions completed.');
  } catch (error) {
    console.error('Password hashing test failed:', error.message);
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

testPasswordHashing().catch(() => process.exit(1));