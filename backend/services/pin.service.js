import bcrypt from 'bcryptjs';
import User from '../models/User.js';

export const MAX_PIN_ATTEMPTS = 5;
export const PIN_LOCK_MINUTES = 15;

const PIN_LOCK_MS = PIN_LOCK_MINUTES * 60 * 1000;

export async function verifyPin(user, pin) {
  const now = new Date();

  const lockUntil = user.pinLockedUntil
    ? new Date(user.pinLockedUntil)
    : null;

  if (lockUntil && lockUntil > now) {
    return {
      status: 'locked',
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((lockUntil.getTime() - now.getTime()) / 1000)
      ),
    };
  }

  if (!user.normalPinHash) {
    return { status: 'not_configured' };
  }

  const normalMatches = await bcrypt.compare(
    pin,
    user.normalPinHash
  );

  const duressMatches = user.duressPinHash
    ? await bcrypt.compare(pin, user.duressPinHash)
    : false;

  if (normalMatches || duressMatches) {
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          failedPinAttempts: 0,
          pinLockedUntil: null,
        },
      }
    );

    return {
      status: 'valid',
      duress: duressMatches,
    };
  }

  const previousAttempts =
    lockUntil && lockUntil <= now
      ? 0
      : user.failedPinAttempts || 0;

  const attempts = previousAttempts + 1;

  if (attempts >= MAX_PIN_ATTEMPTS) {
    const lockedUntil = new Date(
      now.getTime() + PIN_LOCK_MS
    );

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          failedPinAttempts: attempts,
          pinLockedUntil: lockedUntil,
        },
      }
    );

    return {
      status: 'locked',
      retryAfterSeconds: PIN_LOCK_MINUTES * 60,
    };
  }

  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        failedPinAttempts: attempts,
        pinLockedUntil: null,
      },
    }
  );

  return {
    status: 'invalid',
    attemptsRemaining: MAX_PIN_ATTEMPTS - attempts,
  };
}