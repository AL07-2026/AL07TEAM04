// Firebase sets FUNCTION_TARGET to the deployed export. Discovery leaves it unset.
// Keep account/community runtimes free of AI, ingestion, audio and email SDK imports.
const functionTarget = process.env.FUNCTION_TARGET || '';
let endpoints;
if (functionTarget === 'communityApi') {
  endpoints = await import('./community-entry.mjs');
} else if (functionTarget === 'accountApi') {
  endpoints = await import('./account-entry.mjs');
} else if (functionTarget === 'applicationEmailApi') {
  endpoints = await import('./application-email-entry.mjs');
} else if (!functionTarget) {
  const [coreEndpoints, accountEndpoints, applicationEmailEndpoints] = await Promise.all([
    import('./index.mjs'),
    import('./account-entry.mjs'),
    import('./application-email-entry.mjs'),
  ]);
  endpoints = { ...coreEndpoints, ...accountEndpoints, ...applicationEmailEndpoints };
} else {
  endpoints = await import('./index.mjs');
}

export const accountApi = endpoints.accountApi;
export const applicationEmailApi = endpoints.applicationEmailApi;
export const communityApi = endpoints.communityApi;
export const api = endpoints.api;
export const premiumApi = endpoints.premiumApi;
export const scheduledJobSync = endpoints.scheduledJobSync;
