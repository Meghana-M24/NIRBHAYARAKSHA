import { Router } from 'express';
import { register, login, getMe, updateMe } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireJsonObjectBody } from '../middleware/validate.middleware.js';

const router = Router();

router.post('/register', requireJsonObjectBody, register);
router.post('/login', requireJsonObjectBody, login);
router.get('/me', requireAuth, getMe);
router.patch('/me', requireAuth, requireJsonObjectBody, updateMe);

export default router;