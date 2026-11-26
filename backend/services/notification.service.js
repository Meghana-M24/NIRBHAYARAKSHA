import EmergencyNotification from '../models/EmergencyNotification.js';
import { logger } from '../utils/logger.js';

export async function createSimulatedNotifications(event) {
  if (!event.contacts || event.contacts.length === 0) {
    return [];
  }

  const records = event.contacts.map((contact) => ({
    event: event._id,
    user: event.user,
    contactName: contact.name,
    contactPhone: contact.phone,
    contactRelationship: contact.relationship,
    channel: 'sms',
    status: 'simulated',
    provider: 'simulated',
  }));

  const notifications = await EmergencyNotification.insertMany(
    records
  );

  for (const notification of notifications) {
    const maskedPhone = `******${notification.contactPhone.slice(-4)}`;

    logger.info('simulated SMS notification', {
      eventId: notification.event.toString(),
      contact: maskedPhone,
    });
  }

  return notifications;
}