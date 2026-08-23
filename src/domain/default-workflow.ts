import type { Workflow } from './model';

export interface DefaultWorkflowDependencies {
  id: () => string;
  now: () => string;
}

export function createDefaultWorkflow(
  dependencies: DefaultWorkflowDependencies,
): Workflow {
  const createdAt = dependencies.now();
  return {
    id: dependencies.id(),
    name: '未命名工作流',
    nodes: [],
    edges: [],
    containmentEdges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    createdAt,
    updatedAt: createdAt,
  };
}
