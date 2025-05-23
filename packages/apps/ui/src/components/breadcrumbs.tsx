'use client';

import type { ReadonlyURLSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import NextBreadcrumbs from '@/components/next-breadcrumbs';
import titleize from 'titleize';
import { Params } from 'next/dist/server/request/params';
import { useStore } from '@/store/store';

export default function Breadcrumbs() {
  const { project, file } = useStore();
  const getDefaultTextGenerator = useCallback((subpath: string) => {
    return titleize(subpath);
  }, []);

  const getTextGenerator = useCallback(
    async (
      param?: string,
      params?: Params | null,
      _query?: ReadonlyURLSearchParams | null
    ) => {
      const resolverMap: Record<string, () => Promise<string | null>> = {
        projectId: async () => {
          return project?.name ?? '';
        },
        fileId: async () => {
          return file?.name ?? '';
        },
      };
      return resolverMap[param ?? '']?.() ?? null;
    },
    [project, file]
  );

  return (
    <NextBreadcrumbs
      getDefaultTextGenerator={getDefaultTextGenerator}
      getTextGenerator={getTextGenerator}
    />
  );
}
