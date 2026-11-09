import TrustedContact from '../models/TrustedContact.js';
import EmergencyEvent from '../models/EmergencyEvent.js';
import User from '../models/User.js';
import { verifyPin } from '../services/pin.service.js';
import { createSimulatedNotifications } from '../services/notification.service.js';
import EmergencyNotification from '../models/EmergencyNotification.js';
import { logError } from '../utils/logger.js';

const PIN_PATTERN = /^[0-9]{4}$/;

function validateLocation(location) {
  if (location === undefined || location === null) {
    return { value: null };
  }

  if (typeof location !== 'object' || Array.isArray(location)) {
    return { error: 'Location must be an object' };
  }

  const { latitude, longitude, accuracy } = location;

  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return {
      error: 'Location must include numeric latitude and longitude',
    };
  }

  if (latitude < -90 || latitude > 90) {
    return { error: 'Latitude must be between -90 and 90' };
  }

  if (longitude < -180 || longitude > 180) {
    return { error: 'Longitude must be between -180 and 180' };
  }

  if (
    accuracy !== undefined &&
    accuracy !== null &&
    (typeof accuracy !== 'number' ||
      !Number.isFinite(accuracy) ||
      accuracy < 0)
  ) {
    return { error: 'Accuracy must be a non-negative number' };
  }

  return {
    value: {
      latitude,
      longitude,
      accuracy: accuracy ?? null,
    },
  };
}
function toEventDto(event) {
  return {
    id: event._id.toString(),
    status: event.status,
    triggeredAt: event.triggeredAt,
    cancelledAt: event.cancelledAt ?? null,
    hasLocation: Boolean(event.location),
    location: event.location
      ? {
          latitude: event.location.latitude,
          longitude: event.location.longitude,
          accuracy: event.location.accuracy,
        }
      : null,
    message: event.message,
    contactCount: event.contacts?.length ?? 0,
  };
}
function maskPhone(phone) {
  return `******${phone.slice(-4)}`;
}

export async function triggerSos(req, res) {
  try {
    const { pin, location, message } = req.body ?? {};

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

    const locationResult = validateLocation(location);

    if (locationResult.error) {
      return res.status(400).json({
        success: false,
        message: locationResult.error,
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

    const event = await EmergencyEvent.create({
      user: user._id,
      status: 'active',
      isDuress: result.duress,
      location: locationResult.value,
      message: message?.trim() ?? '',
      contacts: contactSnapshot,
    });

    let notifications = [];
    let notificationStatus = 'created';

    try {
      notifications = await createSimulatedNotifications(event);
    } catch (notificationError) {
      notificationStatus = 'failed';

      logError('SOS notification creation error', notificationError, req);
    }

    // Never return isDuress to the client.
    return res.status(201).json({
      success: true,
      data: {
        message: 'SOS triggered',
        event: toEventDto(event),
        notifications: {
          simulated: true,
          status: notificationStatus,
          count: notifications.length,
        },
      },
    });
  } catch (error) {
    logError('SOS trigger error', error, req);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

export async function listSosEvents(req, res) {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);

    if (!Number.isInteger(page) || page < 1) {
      return res.status(400).json({
        success: false,
        message: 'Page must be a positive integer',
      });
    }

    if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
      return res.status(400).json({
        success: false,
        message: 'Limit must be between 1 and 50',
      });
    }

    const filter = { user: req.user._id };
    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      EmergencyEvent.find(filter)
        .select('-isDuress')
        .sort({ triggeredAt: -1 })
        .skip(skip)
        .limit(limit),
      EmergencyEvent.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        events: events.map(toEventDto),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logError('List SOS events error', error, req);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

export async function getSosEvent(req, res) {
  try {
    const event = await EmergencyEvent.findOne({
      _id: req.params.id,
      user: req.user._id,
    }).select('-isDuress');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'SOS event not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        event: toEventDto(event),
      },
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'SOS event not found',
      });
    }

    logError('Get SOS event error', error, req);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

export async function cancelSosEvent(req, res) {
  try {
    const event = await EmergencyEvent.findOne({
      _id: req.params.id,
      user: req.user._id,
    }).select('-isDuress');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'SOS event not found',
      });
    }

    if (event.status !== 'active') {
      return res.status(409).json({
        success: false,
        message: 'Only active SOS events can be cancelled',
      });
    }

    event.status = 'cancelled';
    event.cancelledAt = new Date();

    await event.save();

    return res.status(200).json({
      success: true,
      data: {
        message: 'SOS cancelled',
        event: toEventDto(event),
      },
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'SOS event not found',
      });
    }

    logError('Cancel SOS event error', error, req);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

export async function listEventNotifications(req, res) {
  try {
    const event = await EmergencyEvent.findOne({
      _id: req.params.id,
      user: req.user._id,
    }).select('_id');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'SOS event not found',
      });
    }

    const notifications = await EmergencyNotification.find({
      event: event._id,
      user: req.user._id,
    }).sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      data: {
        notifications: notifications.map((notification) => ({
          id: notification._id.toString(),
          contactName: notification.contactName,
          contactPhoneMasked: maskPhone(
            notification.contactPhone
          ),
          contactRelationship: notification.contactRelationship,
          channel: notification.channel,
          status: notification.status,
          provider: notification.provider,
          sentAt: notification.sentAt,
          createdAt: notification.createdAt,
          error: notification.error,
        })),
        count: notifications.length,
      },
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'SOS event not found',
      });
    }

    logError('List event notifications error', error, req);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}