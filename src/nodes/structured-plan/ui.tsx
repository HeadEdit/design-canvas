import { Blocks } from 'lucide-react';

import { textInputValues } from '../../domain/workflow-io';
import { StructuredPlanDialog } from '../../features/structured-plan/StructuredPlanDialog';
import type { NodeCanvasContext, NodeInspectorContext, NodeUiContribution } from '../types';
import type { StructuredPlanConfig } from './config';

export function StructuredPlanInspector({
  node,
  workflow,
}: NodeInspectorContext<StructuredPlanConfig>) {
  const upstreamText = textInputValues(workflow, node.id, 'input').join('\n\n');
  return (
    <section className="inspector-section">
      <div className="inspector-preview">
        <strong>输入文本</strong>
        {upstreamText ? <pre>{upstreamText}</pre> : <p>未连接上游文本。</p>}
      </div>
    </section>
  );
}

export function StructuredPlanCanvasBody({
  node,
  config,
  workflow,
}: NodeCanvasContext<StructuredPlanConfig>) {
  const upstreamText = textInputValues(workflow, node.id, 'input').join('\n\n');
  const contextLabel = upstreamText ? '已连接上游文本' : '未连接上游文本';
  return (
    <div className="workflow-node__preview">
      <p><strong>{contextLabel}</strong></p>
      <p>正式 {config.modules.length} 个</p>
      {config.candidateModules ? <p>有最新候选</p> : null}
    </div>
  );
}

export const structuredPlanUi: NodeUiContribution<StructuredPlanConfig> = {
  label: '结构化策划案',
  icon: Blocks,
  theme: { headerBackground: '#f0fdfa', glyphColor: '#0f766e' },
  Inspector: StructuredPlanInspector,
  CanvasBody: StructuredPlanCanvasBody,
  Dialog: StructuredPlanDialog as never,
  showRunAction: true,
};
