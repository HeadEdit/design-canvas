import type { Workflow } from '../../domain/model';

export function dropRetiredContentExtractOutputEdges(workflow: Workflow): Workflow {
  const edges = workflow.edges.filter((edge) => {
    const source = workflow.nodes.find((node) => node.id === edge.sourceNodeId);
    return source?.kind !== 'contentExtract' || edge.sourcePortId !== 'output';
  });
  return edges.length === workflow.edges.length ? workflow : { ...workflow, edges };
}
