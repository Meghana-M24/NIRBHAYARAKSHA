import { Router } from 'express';
import {
  startSafetyTimer,
  getActiveSafetyTimer,
  checkInSafetyTimer,
} from '../controllers/safetyTimer.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireJsonObjectBody } from '../middleware/validate.middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/', getActiveSafetyTimer);
router.post('/', requireJsonObjectBody, startSafetyTimer);
router.patch('/check-in', checkInSafetyTimer);

export default router;