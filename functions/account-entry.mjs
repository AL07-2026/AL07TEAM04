import express from 'express';
import { onRequest } from 'firebase-functions/v2/https';

import {
  createAccountDeletionHandler,
  createAccountDeletionJobStore,
  createAccountRepository,
} from './lib/accountDeletion.mjs';
import { communityRepository } from './lib/community.mjs';
import { adminAuth } from './lib/firestoreAdmin.mjs';
import { premiumRepository } from './lib/premiumCompanies.mjs';
import { premiumImages } from './lib/premiumImages.mjs';

const deletePremiumAccountData = async (uid) => {
  const application = await premiumRepository.getMyApplication(uid);
  if (application?.imageStoragePath) {
    await premiumImages.remove(application.imageStoragePath);
  }
  await premiumRepository.deleteAccountData(uid);
};

export const handleAccountDeletion = createAccountDeletionHandler({
  deleteAuthUser: (uid) => adminAuth.deleteUser(uid),
  deleteCommunityAccountData: (uid) => communityRepository.deleteAccountData(uid),
  deletePremiumAccountData,
  jobStore: createAccountDeletionJobStore(),
  repository: createAccountRepository(),
  verifyIdToken: (token) => adminAuth.verifyIdToken(token, true),
});

const accountApp = express();
accountApp.use((_request, response, next) => {
  response.set('Cache-Control', 'private, no-store');
  next();
});
accountApp.delete('/api/account', handleAccountDeletion);

export const accountApi = onRequest(
  {
    region: 'asia-northeast3',
    timeoutSeconds: 120,
    memory: '256MiB',
    maxInstances: 10,
    concurrency: 20,
  },
  accountApp,
);
