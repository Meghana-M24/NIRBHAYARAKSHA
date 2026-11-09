import mongoose from 'mongoose';
import TrustedContact from '../models/TrustedContact.js';

async function testTrustedContactModel() {
  const owner = new mongoose.Types.ObjectId();

  const validContact = new TrustedContact({
    owner,
    name: 'Asha',
    phone: '9876543210',
    relationship: 'Friend',
  });

  await validContact.validate();
  console.log('Valid contact passed validation.');
  console.log(
    'JSON hides owner:',
    validContact.toJSON().owner === undefined
  );

  const invalidCases = [
    {
      label: 'Invalid phone',
      data: {
        name: 'Asha',
        phone: '12345',
        relationship: 'Friend',
      },
    },
    {
      label: 'Invalid relationship',
      data: {
        name: 'Asha',
        phone: '9876543210',
        relationship: 'Enemy',
      },
    },
    {
      label: 'Missing name',
      data: {
        phone: '9876543210',
        relationship: 'Friend',
      },
    },
    {
      label: 'Missing owner',
      data: {
        name: 'Asha',
        phone: '9876543210',
        relationship: 'Friend',
      },
      omitOwner: true,
    },
  ];

  for (const testCase of invalidCases) {
    const contactData = {
      ...testCase.data,
      ...(testCase.omitOwner ? {} : { owner }),
    };

    const contact = new TrustedContact(contactData);

    try {
      await contact.validate();
      console.log(`${testCase.label}: unexpectedly passed`);
    } catch (error) {
      const firstError = Object.values(error.errors || {})[0];
      console.log(
        `${testCase.label}: rejected ->`,
        firstError?.message || error.message
      );
    }
  }
}

testTrustedContactModel();