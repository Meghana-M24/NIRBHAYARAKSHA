import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';

const TEST_EMAIL = 'model-test@example.com';

async function testUserModel() {
  try {
    await connectDB();

    await User.deleteOne({ email: TEST_EMAIL });

    const created = await User.create({
      name: 'Model Test User',
      email: TEST_EMAIL,
      passwordHash: 'dummy-hash-not-a-real-password',
      phone: '9999999999',
    });

    console.log('Created user:', created.toJSON());

    const found = await User.findOne({ email: TEST_EMAIL });

    console.log(
      'passwordHash selected by default:',
      found?.passwordHash
    );

    const foundWithSecret = await User.findOne({
      email: TEST_EMAIL,
    }).select('+passwordHash');

    console.log(
      'passwordHash exists when explicitly selected:',
      Boolean(foundWithSecret?.passwordHash)
    );

    await User.deleteOne({ email: TEST_EMAIL });

    console.log('Test user deleted.');
  } catch (error) {
    console.error('User model test failed:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
  }
}

testUserModel();