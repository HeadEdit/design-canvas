import { lookupNodeDefinition, type NodeDefinition } from '../domain/node-definitions';
import { canonicalizeNodeOutput } from '../domain/node-output';
import { resolveNodeInput } from '../domain/workflow-io';
import type {
  CandidateCard,
  NodeOutput,
  Workflow,
  WorkflowNode,
} from '../domain/model';
import type { NodeRunner, NodeRunnerMetrics, NodeRunnerRuntime, OutputDisposition } from './runner-types';

export type StandardNodeExecutionResult =
  | {
      ok: true;
      output?: NodeOutput;
      outputDisposition?: OutputDisposition;
      metrics: NodeRunnerMetrics;
      producedCards?: CandidateCard[];
      configPatch?: unknown;
    }
  | {
      ok: false;
      errorKind: string;
      metrics?: NodeRunnerMetrics;
    };

export interface RunStandardNodeDependencies {
  getNodeDefinition(kind: string): NodeDefinition | undefined;
  resolveNodeInput: typeof resolveNodeInput;
}

export interface RunStandardNodeInput {
  workflow: Workflow;
  node: WorkflowNode;
  cards: readonly CandidateCard[];
  signal: AbortSignal;
  runner: NodeRunner;
  runtime?: NodeRunnerRuntime;
}

const productionDependencies: RunStandardNodeDependencies = {
  getNodeDefinition: lookupNodeDefinition,
  resolveNodeInput,
};

export async function runStandardNode(
  input: RunStandardNodeInput,
  dependencies: RunStandardNodeDependencies = productionDependencies,
): Promise<StandardNodeExecutionResult> {
  if (input.signal.aborted) {
    return { ok: false, errorKind: 'stopped' };
  }

  const definition = dependencies.getNodeDefinition(input.node.kind);
  if (!definition) {
    return { ok: false, errorKind: 'invalid-input' };
  }

  const inputs: Record<string, NodeOutput> = {};
  for (const port of definition.inputs) {
    if (port.type === 'Control') continue;
    const resolved = dependencies.resolveNodeInput(
      input.workflow,
      input.node.id,
      port.id,
      {
        getNodeDefinition: dependencies.getNodeDefinition,
        cards: input.cards,
      },
    );
    if (!resolved.ok) {
      if (port.optional && resolved.reason === 'input-edge-not-found') {
        continue;
      }
      return { ok: false, errorKind: 'invalid-input' };
    }
    inputs[port.id] = resolved.value.output;
  }

  try {
    const result = await input.runner.run({
      workflow: input.workflow,
      node: input.node,
      inputs,
      cards: input.cards,
      signal: input.signal,
      runtime: input.runtime,
    });

    if (input.signal.aborted) {
      return { ok: false, errorKind: 'stopped' };
    }

    if (!result.ok) {
      return result.metrics === undefined
        ? { ok: false, errorKind: result.errorKind }
        : {
            ok: false,
            errorKind: result.errorKind,
            metrics: result.metrics,
          };
    }

    const outputDisposition = result.outputDisposition ?? 'replace';
    if (outputDisposition === 'preserve') {
      return {
        ok: true,
        outputDisposition,
        metrics: result.metrics,
        ...(result.producedCards ? { producedCards: result.producedCards } : {}),
        ...(result.configPatch !== undefined ? { configPatch: result.configPatch } : {}),
      };
    }

    const dataOutputs = definition.outputs.filter((port) => port.type !== 'Control');
    if (dataOutputs.length === 0) {
      return {
        ok: true,
        metrics: result.metrics,
        ...(result.producedCards ? { producedCards: result.producedCards } : {}),
        ...(result.configPatch !== undefined ? { configPatch: result.configPatch } : {}),
      };
    }

    const output = canonicalizeNodeOutput(definition, result.output);
    if (output === undefined) {
      return { ok: false, errorKind: 'invalid-response' };
    }

    return {
      ok: true,
      output,
      outputDisposition: 'replace',
      metrics: result.metrics,
      ...(result.producedCards ? { producedCards: result.producedCards } : {}),
      ...(result.configPatch !== undefined ? { configPatch: result.configPatch } : {}),
    };
  } catch {
    if (input.signal.aborted) {
      return { ok: false, errorKind: 'stopped' };
    }
    return { ok: false, errorKind: 'invalid-response' };
  }
}
