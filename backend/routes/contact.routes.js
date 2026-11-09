import { Router } from 'express';
import {
  listContacts,
  createContact,
  updateContact,
  deleteContact,
} from '../controllers/contact.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  requireJsonObjectBody,
  validateObjectIdParam,
} from '../middleware/validate.middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/', listContacts);
router.post('/', requireJsonObjectBody, createContact);
router.patch(
  '/:id',
  validateObjectIdParam('id', 'Contact not found'),
  requireJsonObjectBody,
  updateContact
);
router.delete(
  '/:id',
  validateObjectIdParam('id', 'Contact not found'),
  deleteContact
);

export default router;