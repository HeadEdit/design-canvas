import { Select } from 'antd';
import { List } from 'lucide-react';

import { textStructInput } from '../../domain/workflow-io';
import type { NodeCanvasContext, NodeInspectorContext, NodeUiContribution } from '../types';
import type { TextSelectConfig } from './config';

export function TextSelectInspector({
  node,
  config,
  workflow,
  patchConfig,
}: NodeInspectorContext<TextSelectConfig>) {
  const items = textStructInput(workflow, node.id, 'input');
  const options = items.map((item) => ({
    value: item.id,
    label: item.title,
  }));
  const selected = items.find((item) => item.id === config.sourceItemId);

  return (
    <section className="inspector-section">
      <label>
        结构化文本
        <Select
          aria-label="选择内容"
          value={selected ? config.sourceItemId : undefined}
          options={options}
          placeholder={options.length === 0 ? '请先连接结构化文本' : '选择一条内容'}
          onChange={(sourceItemId) => patchConfig({ sourceItemId })}
          style={{ width: '100%' }}
        />
      </label>
      {selected && (
        <details className="inspector-preview">
          <summary>内容预览</summary>
          <pre>{selected.content}</pre>
        </details>
      )}
    </section>
  );
}

export function TextSelectCanvasBody({
  config,
  node,
  workflow,
}: NodeCanvasContext<TextSelectConfig>) {
  const items = textStructInput(workflow, node.id, 'input');
  const selected = items.find((item) => item.id === config.sourceItemId);
  const title = selected?.title ?? (config.sourceItemId ? '目标已失效' : '未选择内容');
  return (
    <div className="workflow-node__preview" title={selected?.content ?? title}>
      <p><strong>{title}</strong></p>
      {selected ? <p>{selected.content}</p> : null}
    </div>
  );
}

export const textSelectUi: NodeUiContribution<TextSelectConfig> = {
  label: '文本选择',
  icon: List,
  theme: { headerBackground: '#f5f3ff', glyphColor: '#7c3aed' },
  Inspector: TextSelectInspector,
  CanvasBody: TextSelectCanvasBody,
};
