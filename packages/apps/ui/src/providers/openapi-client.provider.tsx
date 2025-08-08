'use client';

import * as React from 'react';
import { client as apiClient } from '@/clients/api/client.gen';

export type OpenAPIClientProviderProps = {
  children: React.ReactNode;
  apiUrl: string;
};

export function OpenAPIClientProvider({
  children,
  ...props
}: OpenAPIClientProviderProps) {
  // Set up clients for client-side API calls
  const { apiUrl } = props;
  const clients = [{ client: apiClient, baseUrl: apiUrl }];

  for (const { client, baseUrl } of clients) {
    client.setConfig({
      baseUrl,
    });
  }

  return <div>{children}</div>;
}
