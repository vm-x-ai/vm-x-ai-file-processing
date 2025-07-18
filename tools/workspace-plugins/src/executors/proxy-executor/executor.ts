import { PromiseExecutor, runExecutor } from '@nx/devkit';
import { ProxyExecutorSchema } from './schema';

const executor: PromiseExecutor<ProxyExecutorSchema> = async (
  options,
  context
) => {
  if (!context.projectName) {
    throw new Error('projectName is required');
  }

  for await (const s of await runExecutor(
    {
      project: context.projectName,
      target: options.target,
      configuration: context.configurationName,
    },
    {},
    context
  )) {
    if (!s.success) {
      return {
        success: false,
      };
    }
  }
  return {
    success: true,
  };
};

export default executor;
