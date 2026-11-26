import TrustedContact, {
  RELATIONSHIPS,
} from '../models/TrustedContact.js';
import { logError } from '../utils/logger.js';

function normalizeRelationship(value) {
  return RELATIONSHIPS.find(
    (relationship) =>
      relationship.toLowerCase() === value.toLowerCase()
  );
}

export async function listContacts(req, res) {
  try {
    const contacts = await TrustedContact.find({
      owner: req.user._id,
    }).sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      data: {
        contacts,
      },
    });
  } catch (error) {
    logError('List contacts error', error, req);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

export async function createContact(req, res) {
  try {
    const body = req.body ?? {};

    const name =
      typeof body.name === 'string' ? body.name.trim() : '';
    const phone =
      typeof body.phone === 'string' ? body.phone.trim() : '';
    const relationshipInput =
      typeof body.relationship === 'string'
        ? body.relationship.trim()
        : '';

    if (!name || !phone || !relationshipInput) {
      return res.status(400).json({
        success: false,
        message: 'Name, phone, and relationship are required',
      });
    }

    if (!/^[0-9]{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Phone number must be exactly 10 digits',
      });
    }

    const relationship = normalizeRelationship(relationshipInput);

    if (!relationship) {
      return res.status(400).json({
        success: false,
        message:
          'Relationship must be Family, Friend, Relative, Colleague, or Other',
      });
    }

    const contact = await TrustedContact.create({
      owner: req.user._id,
      name,
      phone,
      relationship,
    });

    return res.status(201).json({
      success: true,
      data: {
        contact,
      },
    });
  } catch (error) {
    if (error?.name === 'ValidationError') {
      const firstError = Object.values(error.errors)[0];

      return res.status(400).json({
        success: false,
        message: firstError?.message || 'Invalid contact data',
      });
    }

    logError('Create contact error', error, req);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

export async function updateContact(req, res) {
  try {
    const { id } = req.params;

    const body = req.body ?? {};

    const updates = {};
    const has = (key) => Object.prototype.hasOwnProperty.call(body, key);

    if (has('name')) {
      if (typeof body.name !== 'string' || !body.name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Contact name cannot be empty',
        });
      }

      updates.name = body.name.trim();
    }

    if (has('phone')) {
      if (typeof body.phone !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Phone must be a text value',
        });
      }

      const phone = body.phone.trim();

      if (!/^[0-9]{10}$/.test(phone)) {
        return res.status(400).json({
          success: false,
          message: 'Phone number must be exactly 10 digits',
        });
      }

      updates.phone = phone;
    }

    if (has('relationship')) {
      if (typeof body.relationship !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Relationship must be a text value',
        });
      }

      const relationship = normalizeRelationship(
        body.relationship.trim()
      );

      if (!relationship) {
        return res.status(400).json({
          success: false,
          message:
            'Relationship must be Family, Friend, Relative, Colleague, or Other',
        });
      }

      updates.relationship = relationship;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid contact fields were provided',
      });
    }

    const contact = await TrustedContact.findOneAndUpdate(
      { _id: id, owner: req.user._id },
      { $set: updates },
      {
        returnDocument: 'after',
        runValidators: true,
      }
    );

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        contact,
      },
    });
  } catch (error) {
    if (error?.name === 'ValidationError') {
      const firstError = Object.values(error.errors)[0];

      return res.status(400).json({
        success: false,
        message: firstError?.message || 'Invalid contact data',
      });
    }

    logError('Update contact error', error, req);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

export async function deleteContact(req, res) {
  try {
    const { id } = req.params;

    const contact = await TrustedContact.findOneAndDelete({
      _id: id,
      owner: req.user._id,
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        deletedContactId: contact._id.toString(),
      },
    });
  } catch (error) {
    logError('Delete contact error', error, req);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}