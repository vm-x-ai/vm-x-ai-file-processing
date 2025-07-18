import { filesize } from 'filesize';

export const FILE_TYPE_MAP: Record<string, string> = {
  'application/pdf': 'PDF',
  'text/plain': 'TXT',
};

export function formatFileSize(size: number): string {
  return filesize(size);
}
