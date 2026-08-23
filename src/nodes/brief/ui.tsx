import { Input } from 'antd';
import { ClipboardList } from 'lucide-react';

import { textInputValues } from '../../domain/workflow-io';
import type { NodeCanvasContext, NodeInspectorContext, NodeUiContribution } from '../types';
import {
  countBriefRequiredFields,
  formatBriefText,
  type BriefConfig,
} from './config';

export function BriefInspector({
  node,
  config,
  workflow,
  patchConfig,
}: NodeInspectorContext<BriefConfig>) {
  const completion = countBriefRequiredFields(config);
  const upstreamText = textInputValues(workflow, node.id, 'source').join('\n\n');
  const patch = (partial: Partial<BriefConfig>) => patchConfig(partial);

  return (
    <section className="inspector-section">
      <p>{completion.filled}/{completion.total}</p>

      <h3>AI 生成</h3>
      <label>
        生成提示词
        <Input.TextArea
          aria-label="生成提示词"
          value={config.generationPrompt}
          rows={4}
          onChange={(event) => patch({ generationPrompt: event.target.value })}
        />
      </label>
      <div className="inspector-preview">
        <strong>上游文本</strong>
        {upstreamText
          ? <pre>{upstreamText}</pre>
          : <p>未连接上游文本。运行时将仅根据生成提示词生成。</p>}
      </div>

      <h3>项目契约</h3>
      <label>
        标题
        <Input
          aria-label="标题"
          value={config.title}
          onChange={(event) => patch({ title: event.target.value })}
        />
      </label>
      <label>
        背景与问题
        <Input.TextArea
          aria-label="背景与问题"
          value={config.background}
          rows={3}
          onChange={(event) => patch({ background: event.target.value })}
        />
      </label>
      <label>
        目标玩家
        <Input.TextArea
          aria-label="目标玩家"
          value={config.targetPlayers}
          rows={2}
          onChange={(event) => patch({ targetPlayers: event.target.value })}
        />
      </label>
      <label>
        设计目标
        <Input.TextArea
          aria-label="设计目标"
          value={config.designGoals}
          rows={3}
          onChange={(event) => patch({ designGoals: event.target.value })}
        />
      </label>
      <label>
        硬约束 <em>关键</em>
        <Input.TextArea
          aria-label="硬约束"
          value={config.constraints}
          rows={3}
          onChange={(event) => patch({ constraints: event.target.value })}
        />
      </label>
      <label>
        成功指标
        <Input.TextArea
          aria-label="成功指标"
          value={config.successMetrics}
          rows={3}
          onChange={(event) => patch({ successMetrics: event.target.value })}
        />
      </label>
      <label>
        范围外
        <Input.TextArea
          aria-label="范围外"
          value={config.outOfScope}
          rows={3}
          onChange={(event) => patch({ outOfScope: event.target.value })}
        />
      </label>

      <div className="inspector-preview">
        <strong>派生输出预览</strong>
        <pre>{formatBriefText(config)}</pre>
      </div>
    </section>
  );
}

export function BriefCanvasBody({
  node,
  config,
  workflow,
}: NodeCanvasContext<BriefConfig>) {
  const completion = countBriefRequiredFields(config);
  const previewSource = config.background.trim() || config.designGoals.trim();
  const preview = previewSource.length > 120
    ? `${previewSource.slice(0, 120)}…`
    : previewSource;
  const hasUpstream = textInputValues(workflow, node.id, 'source').length > 0;

  return (
    <div className="workflow-node__preview" title={preview || config.title}>
      <p><strong>{config.title.trim() || '未命名 Brief'}</strong></p>
      {preview ? <p>{preview}</p> : null}
      <p>{completion.filled}/{completion.total} 已填</p>
      {hasUpstream ? <p>已连接上游</p> : null}
    </div>
  );
}

export const briefUi: NodeUiContribution<BriefConfig> = {
  label: 'Brief',
  icon: ClipboardList,
  theme: { headerBackground: '#e6f4ff', glyphColor: '#1677ff' },
  Inspector: BriefInspector,
  CanvasBody: BriefCanvasBody,
  showRunAction: true,
};
