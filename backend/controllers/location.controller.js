import crypto from 'node:crypto';
import UserLocation from '../models/UserLocation.js';
import LocationShare from '../models/LocationShare.js';
import User from '../models/User.js';
import { logError } from '../utils/logger.js';

const DEFAULT_SHARE_MINUTES = 60;
const MIN_SHARE_MINUTES = 1;
const MAX_SHARE_MINUTES = 1440;

function hashShareToken(token) {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function toLocationDto(location) {
  return {
    latitude: location.latitude,
    longitude: location.longitude,
    accuracy: location.accuracy,
    recordedAt: location.recordedAt,
  };
}

async function upsertLocation(userId, update) {
  const options = {
    upsert: true,
    returnDocument: 'after',
    runValidators: true,
    setDefaultsOnInsert: true,
  };

  try {
    return await UserLocation.findOneAndUpdate(
      { user: userId },
      { $set: update },
      options
    );
  } catch (error) {
    if (error?.code !== 11000) {
      throw error;
    }

    return UserLocation.findOneAndUpdate(
      { user: userId },
      { $set: update },
      {
        returnDocument: 'after',
        runValidators: true,
      }
    );
  }
}

export async function updateMyLocation(req, res) {
  try {
    const { latitude, longitude, accuracy } = req.body ?? {};

    if (
      !isFiniteNumber(latitude) ||
      latitude < -90 ||
      latitude > 90
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Latitude must be a number between -90 and 90',
      });
    }

    if (
      !isFiniteNumber(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Longitude must be a number between -180 and 180',
      });
    }

    if (
      accuracy !== undefined &&
      accuracy !== null &&
      (!isFiniteNumber(accuracy) || accuracy < 0)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Accuracy must be a non-negative number',
      });
    }

    const location = await upsertLocation(req.user._id, {
      latitude,
      longitude,
      accuracy: accuracy ?? null,
      recordedAt: new Date(),
    });

    return res.status(200).json({
      success: true,
      data: {
        message: 'Location updated',
        location: toLocationDto(location),
      },
    });
  } catch (error) {
    logError('Update location error', error, req);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

export async function getMyLocation(req, res) {
  try {
    const location = await UserLocation.findOne({
      user: req.user._id,
    });

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        location: toLocationDto(location),
      },
    });
  } catch (error) {
    logError('Get location error', error, req);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

export async function deleteMyLocation(req, res) {
  try {
    const result = await UserLocation.deleteOne({
      user: req.user._id,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Location not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        message: 'Location deleted',
      },
    });
  } catch (error) {
    logError('Delete location error', error, req);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

export async function createLocationShare(req, res) {
  try {
    const { expiresInMinutes } = req.body ?? {};

    const minutes =
      expiresInMinutes === undefined ||
      expiresInMinutes === null
        ? DEFAULT_SHARE_MINUTES
        : expiresInMinutes;

    if (
      !Number.isInteger(minutes) ||
      minutes < MIN_SHARE_MINUTES ||
      minutes > MAX_SHARE_MINUTES
    ) {
      return res.status(400).json({
        success: false,
        message: `Expires in must be a whole number between ${MIN_SHARE_MINUTES} and ${MAX_SHARE_MINUTES} minutes`,
      });
    }

    const location = await UserLocation.findOne({
      user: req.user._id,
    }).select('_id');

    if (!location) {
      return res.status(400).json({
        success: false,
        message:
          'Save a location before creating a share link',
      });
    }

    await LocationShare.deleteMany({
      user: req.user._id,
    });

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashShareToken(token);

    const expiresAt = new Date(
      Date.now() + minutes * 60 * 1000
    );

    const share = await LocationShare.create({
      user: req.user._id,
      tokenHash,
      expiresAt,
    });

    return res.status(201).json({
      success: true,
      data: {
        message: 'Location share created',
        share: {
          token,
          path: `/api/location/share/${token}`,
          expiresAt: share.expiresAt,
        },
      },
    });
  } catch (error) {
    logError('Create location share error', error, req);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

export async function getSharedLocation(req, res) {
  try {
    const { token } = req.params;

    if (
      typeof token !== 'string' ||
      !/^[a-f0-9]{64}$/.test(token)
    ) {
      return res.status(404).json({
        success: false,
        message: 'Location share not found or expired',
      });
    }

    const tokenHash = hashShareToken(token);
    const now = new Date();

    const share = await LocationShare.findOne({
      tokenHash,
      expiresAt: { $gt: now },
    });

    if (!share) {
      return res.status(404).json({
        success: false,
        message: 'Location share not found or expired',
      });
    }

    const [user, location] = await Promise.all([
      User.findById(share.user).select('name'),
      UserLocation.findOne({ user: share.user }),
    ]);

    if (!user || !location) {
      return res.status(404).json({
        success: false,
        message: 'Location not available',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        owner: {
          name: user.name,
        },
        location: toLocationDto(location),
        expiresAt: share.expiresAt,
      },
    });
  } catch (error) {
    logError('Get shared location error', error, req);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

export async function revokeLocationShare(req, res) {
  try {
    const result = await LocationShare.deleteMany({
      user: req.user._id,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active location share',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        message: 'Location share revoked',
      },
    });
  } catch (error) {
    logError('Revoke location share error', error, req);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}