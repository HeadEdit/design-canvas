import type { DivergenceRunnerDependencies } from './run-divergence';
import { createDivergenceRunner } from './run-divergence';
import { createNodeExecutionRegistry } from './runners';
import type { NodeExecutionRegistration } from './runner-types';

export function createDivergenceRegistration(
  deps: DivergenceRunnerDependencies,
): NodeExecutionRegistration {
  return {
    mode: 'standard',
    runner: createDivergenceRunner(deps),
    descendantInvalidation: 'on-run-start',
  };
}

export function createProductionExecutionRegistry(deps: DivergenceRunnerDependencies) {
  return createNodeExecutionRegistry({
    divergence: createDivergenceRegistration(deps),
  });
}
