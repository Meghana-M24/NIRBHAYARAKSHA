import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { logError } from '../utils/logger.js';

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_BYTES = 72;
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function signToken(userId) {
  return jwt.sign(
    { sub: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );
}

export async function register(req, res) {
  try {
    const { name, email, password } = req.body ?? {};

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required',
      });
    }

    if (
      typeof name !== 'string' ||
      typeof email !== 'string' ||
      typeof password !== 'string'
    ) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password must be text values',
      });
    }

    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedName || !normalizedEmail) {
      return res.status(400).json({
        success: false,
        message: 'Name and email cannot be empty',
      });
    }

    if (normalizedName.length > MAX_NAME_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Name cannot exceed ${MAX_NAME_LENGTH} characters`,
      });
    }

    if (normalizedEmail.length > MAX_EMAIL_LENGTH) {
      return res.status(400).json({
        success: false,
        message: 'Email is too long',
      });
    }

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      });
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      });
    }

    if (Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES) {
      return res.status(400).json({
        success: false,
        message: 'Password is too long',
      });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    const passwordHash = await User.hashPassword(password);

    const user = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      passwordHash,
    });

    return res.status(201).json({
      success: true,
      data: {
        user: user.toJSON(),
      },
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    if (error?.name === 'ValidationError') {
      const firstError = Object.values(error.errors)[0];

      return res.status(400).json({
        success: false,
        message: firstError?.message || 'Invalid user data',
      });
    }

    logError('Register error', error, req);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Email and password must be text values',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (
      normalizedEmail.length > MAX_EMAIL_LENGTH ||
      !EMAIL_PATTERN.test(normalizedEmail)
    ) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const user = await User.findOne({
      email: normalizedEmail,
    }).select('+passwordHash');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const passwordMatches = await user.comparePassword(password);

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = signToken(user._id.toString());

    return res.status(200).json({
      success: true,
      data: {
        token,
        user: user.toJSON(),
      },
    });
  } catch (error) {
    logError('Login error', error, req);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

export function getMe(req, res) {
  return res.status(200).json({
    success: true,
    data: {
      user: req.user.toJSON(),
    },
  });
}

export async function updateMe(req, res) {
  try {
    const body = req.body ?? {};

    const updates = {};
    const has = (key) => Object.prototype.hasOwnProperty.call(body, key);

    if (has('name')) {
      if (typeof body.name !== 'string' || !body.name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Name cannot be empty',
        });
      }

      updates.name = body.name.trim();
    }

    if (has('phone')) {
      if (typeof body.phone !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Phone must be a text value',
        });
      }

      updates.phone = body.phone.trim();
    }

    if (has('address')) {
      if (typeof body.address !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Address must be a text value',
        });
      }

      updates.address = body.address.trim();
    }

    if (has('emergencyInfo')) {
      if (typeof body.emergencyInfo !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Emergency information must be a text value',
        });
      }

      updates.emergencyInfo = body.emergencyInfo.trim();
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid profile fields were provided',
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { returnDocument: 'after', runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        user: updatedUser.toJSON(),
      },
    });
  } catch (error) {
    if (error?.name === 'ValidationError') {
      const firstError = Object.values(error.errors)[0];

      return res.status(400).json({
        success: false,
        message: firstError?.message || 'Invalid profile data',
      });
    }

    logError('Update profile error', error, req);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}