'use client';

import { useRoutePattern } from '@/hooks/use-router-pattern';
import type { ReadonlyURLSearchParams } from 'next/navigation';
import { useParams, usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Params } from 'next/dist/server/request/params';
import React from 'react';

export type GetTextGenerator = (
  param?: string,
  params?: Params | null,
  query?: ReadonlyURLSearchParams | null
) => Promise<string | null>;
export type GetDefaultTextGenerator = (path: string, href?: string) => string;

const _defaultGetTextGenerator: GetTextGenerator = async (
  _param?: string,
  _params?: Params | null,
  _query?: ReadonlyURLSearchParams | null
) => null;
const _defaultGetDefaultTextGenerator: GetDefaultTextGenerator = (
  path: string,
  _href?: string
) => path;

const generatePathParts = (pathStr: string | null) => {
  const pathWithoutQuery = pathStr?.split('?')?.[0] ?? '';
  return pathWithoutQuery.split('/').filter((v) => v.length > 0);
};

export type NextBreadcrumbsProps = {
  getTextGenerator?: GetTextGenerator;
  getDefaultTextGenerator?: GetDefaultTextGenerator;
};

export default function NextBreadcrumbs({
  getTextGenerator = _defaultGetTextGenerator,
  getDefaultTextGenerator = _defaultGetDefaultTextGenerator,
}: NextBreadcrumbsProps) {
  const pathname = usePathname();
  const query = useSearchParams();
  const params = useParams();
  const routePattern = useRoutePattern();

  const breadcrumbs = useMemo(
    function generateBreadcrumbs() {
      const asPathNestedRoutes = generatePathParts(pathname);
      const pathnameNestedRoutes = generatePathParts(routePattern);

      const crumblist = asPathNestedRoutes.map((subpath, idx) => {
        const param = pathnameNestedRoutes[idx]
          .replace('[', '')
          .replace(']', '');

        const href = '/' + asPathNestedRoutes.slice(0, idx + 1).join('/');
        return {
          href,
          textGenerator: () => getTextGenerator(param, params, query),
          text: getDefaultTextGenerator(subpath, href),
        };
      });

      return [{ href: '/', text: 'Home' }, ...crumblist];
    },
    [
      pathname,
      routePattern,
      getDefaultTextGenerator,
      getTextGenerator,
      params,
      query,
    ]
  );

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs.map((crumb, idx) => (
          <React.Fragment key={crumb.href}>
            <BreadcrumbItem>
              <Crumb {...crumb} last={idx === breadcrumbs.length - 1} />
            </BreadcrumbItem>
            {idx !== breadcrumbs.length - 1 && <BreadcrumbSeparator />}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

type CrumbProps = {
  text: string;
  textGenerator?: () => Promise<string | null>;
  href: string;
  last?: boolean;
};

function Crumb({
  text: defaultText,
  textGenerator,
  href,
  last = false,
}: CrumbProps) {
  const [text, setText] = useState(defaultText);

  useEffect(() => {
    if (!textGenerator) {
      return;
    }
    textGenerator().then((finalText) => {
      if (finalText) {
        setText(finalText);
      }
    });
  }, [textGenerator]);

  if (last) {
    return <BreadcrumbPage color="text.primary">{text}</BreadcrumbPage>;
  }

  return <BreadcrumbLink href={href}>{text}</BreadcrumbLink>;
}
