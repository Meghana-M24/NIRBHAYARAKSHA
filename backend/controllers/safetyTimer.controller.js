import SafetyTimer from '../models/SafetyTimer.js';
import TrustedContact from '../models/TrustedContact.js';
import User from '../models/User.js';
import { verifyPin } from '../services/pin.service.js';
import { logError } from '../utils/logger.js';

const PIN_PATTERN = /^[0-9]{4}$/;
const MIN_DURATION_MINUTES = 1;
const MAX_DURATION_MINUTES = 1440;

function toTimerDto(timer) {
  const now = Date.now();
  const expiresAt = new Date(timer.expiresAt).getTime();

  return {
    id: timer._id.toString(),
    status: timer.status,
    durationMinutes: timer.durationMinutes,
    message: timer.message,
    startedAt: timer.startedAt,
    expiresAt: timer.expiresAt,
    secondsRemaining:
      timer.status === 'active'
        ? Math.max(0, Math.ceil((expiresAt - now) / 1000))
        : 0,
    checkedInAt: timer.checkedInAt,
    expiredAt: timer.expiredAt,
    contactCount: timer.contacts?.length ?? 0,
    sosEventId: timer.sosEvent
      ? timer.sosEvent.toString()
      : null,
  };
}

export async function startSafetyTimer(req, res) {
  try {
    const { pin, durationMinutes, message } = req.body ?? {};

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

    if (!Number.isInteger(durationMinutes)) {
      return res.status(400).json({
        success: false,
        message: 'Duration must be a whole number of minutes',
      });
    }

    if (
      durationMinutes < MIN_DURATION_MINUTES ||
      durationMinutes > MAX_DURATION_MINUTES
    ) {
      return res.status(400).json({
        success: false,
        message: `Duration must be between ${MIN_DURATION_MINUTES} and ${MAX_DURATION_MINUTES} minutes`,
      });
    }

    if (
      message !== undefined &&
      message !== null &&
      typeof message !== 'string'
    ) {
      return res.status(400).json({
        success: false,
        message: 'Message must be a text value',
      });
    }

    if (typeof message === 'string' && message.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Message cannot exceed 500 characters',
      });
    }

    const existing = await SafetyTimer.findOne({
      user: req.user._id,
      status: 'active',
    }).select('_id');

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An active safety timer already exists',
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

    const contacts = await TrustedContact.find({
      owner: user._id,
    })
      .sort({ createdAt: 1 })
      .select('name phone relationship');

    const contactSnapshot = contacts.map((contact) => ({
      name: contact.name,
      phone: contact.phone,
      relationship: contact.relationship,
    }));

    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + durationMinutes * 60 * 1000
    );

    const timer = await SafetyTimer.create({
      user: user._id,
      status: 'active',
      isDuress: result.duress,
      durationMinutes,
      message:
        typeof message === 'string' ? message.trim() : '',
      contacts: contactSnapshot,
      startedAt: now,
      expiresAt,
    });

    return res.status(201).json({
      success: true,
      data: {
        message: 'Safety timer started',
        timer: toTimerDto(timer),
      },
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An active safety timer already exists',
      });
    }

    logError('Start safety timer error', error, req);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

export async function getActiveSafetyTimer(req, res) {
  try {
    const timer = await SafetyTimer.findOne({
      user: req.user._id,
      status: 'active',
    }).sort({ createdAt: -1 });

    if (!timer) {
      return res.status(404).json({
        success: false,
        message: 'No active safety timer',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        timer: toTimerDto(timer),
      },
    });
  } catch (error) {
    logError('Get safety timer error', error, req);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

export async function checkInSafetyTimer(req, res) {
  try {
    const now = new Date();

    const timer = await SafetyTimer.findOneAndUpdate(
      {
        user: req.user._id,
        status: 'active',
        expiresAt: { $gt: now },
      },
      {
        $set: {
          status: 'checked_in',
          checkedInAt: now,
        },
      },
      { returnDocument: 'after' }
    );

    if (!timer) {
      const expired = await SafetyTimer.findOne({
        user: req.user._id,
        status: 'active',
        expiresAt: { $lte: now },
      }).select('_id');

      if (expired) {
        return res.status(409).json({
          success: false,
          message: 'Safety timer has already expired',
        });
      }

      return res.status(404).json({
        success: false,
        message: 'No active safety timer',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        message: 'Safety timer checked in',
        timer: toTimerDto(timer),
      },
    });
  } catch (error) {
    logError('Check in safety timer error', error, req);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}