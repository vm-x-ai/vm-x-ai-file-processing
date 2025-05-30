import OpenAPIClientAxios from 'openapi-client-axios';
import { Client as FileClassifierClient } from './file-classifier-api';

const api = new OpenAPIClientAxios({
  definition: 'http://localhost:8000/openapi.json',
  withServer: {
    url: 'http://localhost:8000',
  },
});

export const fileClassifierApi = await api.getClient<FileClassifierClient>();
