import type { NodeKind } from '../domain/model';
import type {
  NodeExecutionRegistration,
  NodeRunner,
} from './runner-types';
import { builtinNodePlatform } from '../nodes/builtins';
import { bindBriefRunner } from '../nodes/brief/execution';
import { bindDivergenceRunner } from '../nodes/divergence/execution';
import { bindContentExtractRunner } from '../nodes/content-extract/execution';
import { bindIdeaScoreRunner } from '../nodes/idea-score/execution';
import type { DivergenceRunnerDependencies } from './run-divergence';
import type { BriefRunnerDependencies } from './run-brief';
import type { ContentExtractRunnerDependencies } from './run-content-extract';
import type { IdeaScoreRunnerDependencies } from './run-idea-score';

export function bindProductionBriefRunner(deps: BriefRunnerDependencies): void {
  bindBriefRunner(deps);
}

export function bindProductionDivergenceRunner(deps: DivergenceRunnerDependencies): void {
  bindDivergenceRunner(deps);
}

export function bindProductionContentExtractRunner(
  deps: ContentExtractRunnerDependencies,
): void {
  bindContentExtractRunner(deps);
}

export function bindProductionIdeaScoreRunner(
  deps: IdeaScoreRunnerDependencies,
): void {
  bindIdeaScoreRunner(deps);
}

type ExecutionRecord = Readonly<Record<string, NodeExecutionRegistration>>;

export function createNodeExecutionRegistry(entries: ExecutionRecord) {
  const values = Object.assign(Object.create(null), entries) as ExecutionRecord;
  const getNodeExecution = (
    kind: NodeKind,
  ): NodeExecutionRegistration | undefined => (
    Object.prototype.hasOwnProperty.call(values, kind) ? values[kind] : undefined
  );
  const getNodeRunner = (kind: NodeKind): NodeRunner | undefined => {
    const registration = getNodeExecution(kind);
    return registration?.mode === 'standard'
      ? registration.runner
      : undefined;
  };
  return {
    getNodeExecution,
    getNodeRunner,
    hasExecutableRunner: (kind: NodeKind) => getNodeExecution(kind) !== undefined,
  };
}

export function getNodeExecution(kind: NodeKind): NodeExecutionRegistration | undefined {
  return builtinNodePlatform.getExecution(kind);
}

export function getNodeRunner(kind: NodeKind): NodeRunner | undefined {
  return getNodeExecution(kind)?.runner;
}

export function hasExecutableRunner(kind: NodeKind): boolean {
  return getNodeExecution(kind) !== undefined;
}
