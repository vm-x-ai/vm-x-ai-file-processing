import { PromiseExecutor } from '@nx/devkit';
import { UpdateYamlExecutorSchema } from './schema';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { load, dump } from 'js-yaml';
import set = require('lodash.set');
import { spawnSync } from 'child_process';

const executor: PromiseExecutor<UpdateYamlExecutorSchema> = async (options) => {
  if (!existsSync(options.filePath)) {
    throw new Error(`File ${options.filePath} does not exist`);
  }

  const file = await readFile(options.filePath, 'utf8');
  const yamlData = load(file) as Record<string, unknown>;

  set(
    yamlData,
    options.keyPath,
    `${options.valuePrefix ?? ''}${options.value}`
  );

  await writeFile(options.filePath, dump(yamlData));

  if (options.gitAdd) {
    const result = spawnSync('git', ['add', options.filePath], {
      stdio: 'inherit',
    });

    if (result.status !== 0) {
      throw new Error(`Failed to add file to git index: ${result.status}`);
    }
  }

  return {
    success: true,
  };
};

export default executor;
