import OpenAPIClientAxios from 'openapi-client-axios';
import { Client as FileClassifierClient } from './file-classifier-api';

const api = new OpenAPIClientAxios({
  definition: `${process.env.NEXT_PUBLIC_API_URL}/openapi.json`,
  withServer: {
    url: `${process.env.NEXT_PUBLIC_API_URL}`,
  },
});

// Lazy initialization - only create the client when needed
let _fileClassifierApi: FileClassifierClient | null = null;

export const getFileClassifierApi = async (): Promise<FileClassifierClient> => {
  if (!_fileClassifierApi) {
    _fileClassifierApi = await api.getClient<FileClassifierClient>();
  }
  return _fileClassifierApi;
};

// For backward compatibility, you can also export a synchronous version
// that will throw if called before initialization
export const fileClassifierApi = new Proxy({} as FileClassifierClient, {
  get(target, prop) {
    return async (...args: never[]) => {
      const client = await getFileClassifierApi();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (client as any)[prop](...args);
    };
  },
});
