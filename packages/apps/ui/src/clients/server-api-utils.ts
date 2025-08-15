import { client as apiClient } from '@/clients/api/client.gen';

let initialized = false;

export function ensureServerClientsInitialized() {
  if (initialized) {
    return;
  }

  // Set up clients for server-side API calls
  for (const { client, baseUrl } of [
    {
      client: apiClient,
      baseUrl: process.env.INTERNAL_API_URL || process.env.API_URL,
    },
  ]) {
    client.setConfig({
      baseUrl,
    });
  }

  initialized = true;
}
