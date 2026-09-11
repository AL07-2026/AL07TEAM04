import express from 'express';
import { onRequest } from 'firebase-functions/v2/https';

import { handleApplicationEmail } from './lib/applicationEmail.mjs';

const applicationEmailApp = express();
applicationEmailApp.use((_request, response, next) => {
  response.set('Cache-Control', 'private, no-store');
  next();
});
applicationEmailApp.use(express.json({ limit: '1mb' }));
applicationEmailApp.post('/api/applications/send', handleApplicationEmail);

export const applicationEmailApi = onRequest(
  {
    region: 'asia-northeast3',
    timeoutSeconds: 120,
    memory: '512MiB',
    maxInstances: 10,
    concurrency: 4,
    secrets: ['GMAIL_APP_PASSWORD'],
  },
  applicationEmailApp,
);
