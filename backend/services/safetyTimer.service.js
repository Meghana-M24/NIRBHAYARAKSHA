import SafetyTimer from '../models/SafetyTimer.js';
import EmergencyEvent from '../models/EmergencyEvent.js';
import { createSimulatedNotifications } from './notification.service.js';
import { logError, logger } from '../utils/logger.js';

const SWEEP_INTERVAL_MS = 15 * 1000;
const MAX_TIMERS_PER_SWEEP = 100;

function buildExpiredMessage(message) {
  const note =
    typeof message === 'string' ? message.trim() : '';

  const base = 'Safety timer expired';

  return note
    ? `${base}: ${note}`.slice(0, 500)
    : base;
}

export async function expireDueSafetyTimers() {
  const now = new Date();

  const dueTimers = await SafetyTimer.find({
    status: 'active',
    expiresAt: { $lte: now },
  })
    .select('+isDuress')
    .limit(MAX_TIMERS_PER_SWEEP);

  let expiredCount = 0;

  for (const dueTimer of dueTimers) {
    const timer = await SafetyTimer.findOneAndUpdate(
      {
        _id: dueTimer._id,
        status: 'active',
        expiresAt: { $lte: now },
      },
      {
        $set: {
          status: 'expired',
          expiredAt: now,
        },
      },
      { returnDocument: 'after' }
    ).select('+isDuress');

    if (!timer) {
      continue;
    }

    let event;

    try {
      event = await EmergencyEvent.create({
        user: timer.user,
        status: 'active',
        isDuress: timer.isDuress,
        location: null,
        message: buildExpiredMessage(timer.message),
        contacts: timer.contacts.map((contact) => ({
          name: contact.name,
          phone: contact.phone,
          relationship: contact.relationship,
        })),
      });
    } catch (error) {
      logError('Safety timer event creation error', error);

      try {
        await SafetyTimer.updateOne(
          {
            _id: timer._id,
            status: 'expired',
            sosEvent: null,
          },
          {
            $set: {
              status: 'active',
              expiredAt: null,
            },
          }
        );
      } catch (revertError) {
        logError('Safety timer revert error', revertError);
      }

      continue;
    }

    try {
      await createSimulatedNotifications(event);
    } catch (error) {
      logError('Safety timer notification error', error);
    }

    try {
      await SafetyTimer.updateOne(
        { _id: timer._id },
        { $set: { sosEvent: event._id } }
      );
    } catch (error) {
      logError('Safety timer link error', error);
    }

    expiredCount += 1;

    logger.info('safety timer expired', {
      timerId: String(timer._id),
      eventId: String(event._id),
      contacts: event.contacts.length,
    });
  }

  return expiredCount;
}

export async function startSafetyTimerWorker() {
  await SafetyTimer.init();

  let sweepRunning = false;

  async function runSweep() {
    if (sweepRunning) {
      return;
    }

    sweepRunning = true;

    try {
      await expireDueSafetyTimers();
    } catch (error) {
      logError('Safety timer sweep error', error);
    } finally {
      sweepRunning = false;
    }
  }

  await runSweep();

  const interval = setInterval(() => {
    runSweep();
  }, SWEEP_INTERVAL_MS);

  interval.unref?.();

  return interval;
}