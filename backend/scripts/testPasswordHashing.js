import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';

const TEST_EMAIL = 'password-test@example.com';
const PLAIN_PASSWORD = 'CorrectHorseBatteryStaple!42';

async function testPasswordHashing() {
  try {
    await connectDB();

    await User.deleteOne({ email: TEST_EMAIL });

    const passwordHash = await User.hashPassword(PLAIN_PASSWORD);

    console.log('Hash is not plaintext:', passwordHash !== PLAIN_PASSWORD);
    console.log('Hash uses bcrypt format:', passwordHash.startsWith('$2'));
    console.log('Hash cost factor:', passwordHash.split('$')[2]);

    const created = await User.create({
      name: 'Password Test User',
      email: TEST_EMAIL,
      passwordHash,
    });

    console.log(
      'Stored hash equals generated hash:',
      created.passwordHash === passwordHash
    );

    const user = await User.findOne({ email: TEST_EMAIL }).select(
      '+passwordHash'
    );

    console.log(
      'Correct password matches:',
      await user.comparePassword(PLAIN_PASSWORD)
    );

    console.log(
      'Wrong password matches:',
      await user.comparePassword('wrong-password')
    );

    const normalUser = await User.findOne({ email: TEST_EMAIL });
    console.log(
      'Normal query hides passwordHash:',
      normalUser.passwordHash === undefined
    );

    console.log(
      'User JSON hides passwordHash:',
      created.toJSON().passwordHash === undefined
    );

    await User.deleteOne({ email: TEST_EMAIL });
    console.log('Test user deleted.');
  } catch (error) {
    console.error('Password hashing test failed:', error.message);
  } finally {
    await User.deleteOne({ email: TEST_EMAIL }).catch(() => {});
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
  }
}

testPasswordHashing();