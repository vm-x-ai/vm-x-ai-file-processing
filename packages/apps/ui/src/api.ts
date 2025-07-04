import OpenAPIClientAxios from 'openapi-client-axios';
import { Client as FileClassifierClient } from './file-classifier-api';

const api = new OpenAPIClientAxios({
  definition: `${process.env.NEXT_PUBLIC_API_URL}/openapi.json`,
  withServer: {
    url: `${process.env.NEXT_PUBLIC_API_URL}`,
  },
});

export const fileClassifierApi = await api.getClient<FileClassifierClient>();
