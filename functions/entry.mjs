// Firebase sets FUNCTION_TARGET to the deployed export. Discovery leaves it unset.
// Keep the public community runtime free of AI, ingestion, audio and email SDK imports.
const endpoints =
  process.env.FUNCTION_TARGET === 'communityApi'
    ? await import('./community-entry.mjs')
    : await import('./index.mjs');

export const communityApi = endpoints.communityApi;
export const api = endpoints.api;
export const premiumApi = endpoints.premiumApi;
export const scheduledJobSync = endpoints.scheduledJobSync;
