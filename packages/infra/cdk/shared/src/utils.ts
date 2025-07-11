import path from 'path';
import { fileURLToPath } from 'url';

export function resolveArgoCDPath(
  esmUrl: string,
  argocdFolder = 'argocd'
): string {
  const importPath = path.dirname(fileURLToPath(esmUrl));
  const projectRoot = path.relative(
    process.env.NX_WORKSPACE_ROOT_PATH ?? process.env.NX_WORKSPACE_ROOT ?? '',
    path.dirname(importPath)
  );
  return path.join(projectRoot, argocdFolder);
}
