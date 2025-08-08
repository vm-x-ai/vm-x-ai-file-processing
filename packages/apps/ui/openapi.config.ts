import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: 'http://localhost:8000/api/openapi.json',
  output: {
    path: 'src/clients/api',
    tsConfigPath: 'tsconfig.json',
  },
  plugins: [
    '@hey-api/client-next',
    '@tanstack/react-query',
  ],
});
