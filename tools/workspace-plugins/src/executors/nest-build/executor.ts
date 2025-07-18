import { PromiseExecutor, logger } from '@nx/devkit';
import { NestBuildExecutorSchema } from './schema';
import { DependentBuildableProjectNode } from '@nx/js/src/utils/buildable-libs-utils';
import { getExtraDependencies } from '@nx/esbuild/src/executors/esbuild/lib/get-extra-dependencies';
import { getOutExtension } from '@nx/esbuild/src/executors/esbuild/lib/build-esbuild-options';
import { copyPackageJson, CopyPackageJsonOptions } from '@nx/js';
import { spawnSync } from 'node:child_process';

const runExecutor: PromiseExecutor<NestBuildExecutorSchema> = async (
  options,
  context
) => {
  if (!context.projectName) {
    throw new Error('projectName is required');
  }

  const projectRoot = context.projectGraph.nodes[context.projectName].data.root;

  logger.info(`Building project ${context.projectName} in ${projectRoot}`);
  const buildResult = spawnSync('npx', ['nest', 'build'], {
    cwd: projectRoot,
    stdio: 'inherit',
  });

  if (buildResult.status !== 0) {
    throw new Error('Failed to build project');
  }

  const externalDependencies =
    options.external?.reduce<DependentBuildableProjectNode[]>((acc, name) => {
      const externalNode = context.projectGraph?.externalNodes?.[`npm:${name}`];
      if (externalNode) {
        acc.push({
          name,
          outputs: [],
          node: externalNode,
        });
      }
      return acc;
    }, []) ?? [];

  if (!options.thirdParty) {
    const thirdPartyDependencies = getExtraDependencies(
      context.projectName,
      context.projectGraph
    );
    for (const tpd of thirdPartyDependencies) {
      options.external?.push(
        (tpd.node.data as { packageName: string }).packageName
      );
      externalDependencies.push(tpd);
    }
  }

  if (options.generatePackageJson) {
    const cpjOptions: CopyPackageJsonOptions = {
      ...options,
      // TODO(jack): make types generate with esbuild
      skipTypings: true,
      generateLockfile: true,
      outputFileExtensionForCjs: getOutExtension('cjs', {
        ...options,
        userDefinedBuildOptions: undefined,
      }),
      excludeLibsInPackageJson: !options.thirdParty,
      // TODO(jack): Remove the need to pass updateBuildableProjectDepsInPackageJson option when overrideDependencies or extraDependencies are passed.
      // Add this back to fix a regression.
      // See: https://github.com/nrwl/nx/issues/19773
      updateBuildableProjectDepsInPackageJson: externalDependencies.length > 0,
    };

    // If we're bundling third-party packages, then any extra deps from external should be the only deps in package.json
    if (options.thirdParty && externalDependencies.length > 0) {
      cpjOptions.overrideDependencies = externalDependencies;
    } else {
      cpjOptions.extraDependencies = externalDependencies;
    }

    await copyPackageJson(cpjOptions, context);
  }
  return {
    success: true,
  };
};

export default runExecutor;
