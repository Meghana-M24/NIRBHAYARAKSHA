import { Router } from 'express';
import {
  triggerSos,
  listSosEvents,
  getSosEvent,
  cancelSosEvent,
  listEventNotifications,
} from '../controllers/sos.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  requireJsonObjectBody,
  validateObjectIdParam,
} from '../middleware/validate.middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/', listSosEvents);
router.get(
  '/:id/notifications',
  validateObjectIdParam('id', 'SOS event not found'),
  listEventNotifications
);
router.get(
  '/:id',
  validateObjectIdParam('id', 'SOS event not found'),
  getSosEvent
);
router.post('/', requireJsonObjectBody, triggerSos);
router.patch(
  '/:id/cancel',
  validateObjectIdParam('id', 'SOS event not found'),
  cancelSosEvent
);

export default router;
