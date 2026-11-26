import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { verifyPin } from '../services/pin.service.js';
import { logError } from '../utils/logger.js';

const PIN_PATTERN = /^[0-9]{4}$/;

export async function setupPin(req, res) {
  try {
    const { password, pin, duressPin } = req.body ?? {};

    if (!password || !pin) {
      return res.status(400).json({
        success: false,
        message: 'Password and PIN are required',
      });
    }

    if (typeof password !== 'string' || typeof pin !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Password and PIN must be text values',
      });
    }

    if (!PIN_PATTERN.test(pin)) {
      return res.status(400).json({
        success: false,
        message: 'PIN must be exactly 4 digits',
      });
    }

    if (
      duressPin !== undefined &&
      duressPin !== null &&
      duressPin !== '' &&
      typeof duressPin !== 'string'
    ) {
      return res.status(400).json({
        success: false,
        message: 'Duress PIN must be a text value',
      });
    }

    if (duressPin) {
      if (!PIN_PATTERN.test(duressPin)) {
        return res.status(400).json({
          success: false,
          message: 'Duress PIN must be exactly 4 digits',
        });
      }

      if (duressPin === pin) {
        return res.status(400).json({
          success: false,
          message: 'Duress PIN must be different from the normal PIN',
        });
      }
    }

    const user = await User.findById(req.user._id).select(
      '+passwordHash +normalPinHash'
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const passwordMatches = await user.comparePassword(password);

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password',
      });
    }

    if (user.normalPinHash) {
      return res.status(409).json({
        success: false,
        message: 'PIN is already set. Use the change PIN endpoint.',
      });
    }

    const normalPinHash = await User.hashPin(pin);

    let duressPinHash = null;

    if (duressPin) {
      duressPinHash = await User.hashPin(duressPin);
    }

    user.normalPinHash = normalPinHash;
    user.duressPinHash = duressPinHash;
    user.pinConfigured = true;
    user.failedPinAttempts = 0;
    user.pinLockedUntil = null;

    await user.save();

    return res.status(201).json({
      success: true,
      data: {
        message: 'PIN set successfully',
        hasDuressPin: Boolean(duressPin),
      },
    });
  } catch (error) {
    logError('Setup PIN error', error, req);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

export async function verifyPinHandler(req, res) {
  try {
    const { pin } = req.body ?? {};

    if (!pin || typeof pin !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'PIN is required',
      });
    }

    if (!PIN_PATTERN.test(pin)) {
      return res.status(400).json({
        success: false,
        message: 'PIN must be exactly 4 digits',
      });
    }

    const user = await User.findById(req.user._id).select(
      '+normalPinHash +duressPinHash'
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const result = await verifyPin(user, pin);

    if (result.status === 'not_configured') {
      return res.status(400).json({
        success: false,
        message: 'PIN is not configured',
      });
    }

    if (result.status === 'locked') {
      return res.status(423).json({
        success: false,
        message: 'PIN is locked. Try again later.',
        retryAfterSeconds: result.retryAfterSeconds,
      });
    }

    if (result.status === 'invalid') {
      return res.status(401).json({
        success: false,
        message: 'Invalid PIN',
        attemptsRemaining: result.attemptsRemaining,
      });
    }

    // Duress must remain silent on the client.
    return res.status(200).json({
      success: true,
      data: {
        verified: true,
      },
    });
  } catch (error) {
    logError('Verify PIN error', error, req);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

export async function changePin(req, res) {
  try {
    const { password, pin, duressPin } = req.body ?? {};

    if (!password || !pin) {
      return res.status(400).json({
        success: false,
        message: 'Password and new PIN are required',
      });
    }

    if (typeof password !== 'string' || typeof pin !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Password and new PIN must be text values',
      });
    }

    if (!PIN_PATTERN.test(pin)) {
      return res.status(400).json({
        success: false,
        message: 'PIN must be exactly 4 digits',
      });
    }

    if (
      duressPin !== undefined &&
      duressPin !== null &&
      duressPin !== '' &&
      typeof duressPin !== 'string'
    ) {
      return res.status(400).json({
        success: false,
        message: 'Duress PIN must be a text value',
      });
    }

    if (duressPin) {
      if (!PIN_PATTERN.test(duressPin)) {
        return res.status(400).json({
          success: false,
          message: 'Duress PIN must be exactly 4 digits',
        });
      }

      if (duressPin === pin) {
        return res.status(400).json({
          success: false,
          message: 'Duress PIN must be different from the new PIN',
        });
      }
    }

    const user = await User.findById(req.user._id).select(
      '+passwordHash +normalPinHash +duressPinHash'
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const passwordMatches = await user.comparePassword(password);

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password',
      });
    }

    if (!user.normalPinHash) {
      return res.status(409).json({
        success: false,
        message: 'PIN is not configured. Use the setup endpoint.',
      });
    }

    const removingDuress = duressPin === null || duressPin === '';
    const keepingDuress = duressPin === undefined;
    const settingDuress =
      typeof duressPin === 'string' && duressPin.length > 0;

    if (keepingDuress && user.duressPinHash) {
      const matchesExistingDuress = await bcrypt.compare(
        pin,
        user.duressPinHash
      );

      if (matchesExistingDuress) {
        return res.status(400).json({
          success: false,
          message: 'New PIN is not allowed. Choose a different PIN.',
        });
      }
    }

    const normalPinHash = await User.hashPin(pin);

    let duressPinHash = user.duressPinHash;

    if (removingDuress) {
      duressPinHash = null;
    } else if (settingDuress) {
      duressPinHash = await User.hashPin(duressPin);
    }

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          normalPinHash,
          duressPinHash,
          pinConfigured: true,
          failedPinAttempts: 0,
          pinLockedUntil: null,
        },
      }
    );

    return res.status(200).json({
      success: true,
      data: {
        message: 'PIN updated successfully',
        hasDuressPin: Boolean(duressPinHash),
      },
    });
  } catch (error) {
    logError('Change PIN error', error, req);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}