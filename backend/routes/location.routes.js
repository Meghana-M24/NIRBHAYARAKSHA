import { Router } from 'express';
import {
  updateMyLocation,
  getMyLocation,
  deleteMyLocation,
  createLocationShare,
  getSharedLocation,
  revokeLocationShare,
} from '../controllers/location.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireJsonObjectBody } from '../middleware/validate.middleware.js';

const router = Router();

router.put('/', requireAuth, requireJsonObjectBody, updateMyLocation);
router.get('/', requireAuth, getMyLocation);
router.delete('/', requireAuth, deleteMyLocation);

router.post('/share', requireAuth, requireJsonObjectBody, createLocationShare);
router.delete('/share', requireAuth, revokeLocationShare);
router.get('/share/:token', getSharedLocation);

export default router;