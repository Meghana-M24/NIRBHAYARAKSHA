import { Router } from 'express';
import {
  setupPin,
  verifyPinHandler,
  changePin,
} from '../controllers/pin.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireJsonObjectBody } from '../middleware/validate.middleware.js';

const router = Router();

router.use(requireAuth);

router.post('/setup', requireJsonObjectBody, setupPin);
router.post('/verify', requireJsonObjectBody, verifyPinHandler);
router.patch('/', requireJsonObjectBody, changePin);

export default router;