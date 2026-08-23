import { TextSelect } from 'lucide-react';

import { textInputValues } from '../../domain/workflow-io';
import type { NodeCanvasContext, NodeInspectorContext, NodeUiContribution } from '../types';
import type { ContentExtractConfig } from './config';

const STATUS_LABEL: Record<ContentExtractConfig['summaryStatus'], string> = {
  idle: '未生成',
  ready: '已完成',
  stale: '待更新',
  failed: '运行失败',
};

export function ContentExtractInspector({
  node,
  config,
  workflow,
}: NodeInspectorContext<ContentExtractConfig>) {
  const upstreamText = textInputValues(workflow, node.id, 'input').join('\n\n');
  return (
    <section className="inspector-section">
      <div className="inspector-preview">
        <strong>输入文本</strong>
        {upstreamText ? <pre>{upstreamText}</pre> : <p>未连接上游文本。</p>}
      </div>
      {config.summary && (
        <div className="inspector-preview">
          <strong>摘要</strong>
          <p>{config.summary}</p>
        </div>
      )}
      {config.lastError && config.summaryStatus === 'failed' && (
        <p className="inspector-error">{config.lastError}</p>
      )}
    </section>
  );
}

export function ContentExtractCanvasBody({
  config,
}: NodeCanvasContext<ContentExtractConfig>) {
  const preview = config.summary.trim();
  return (
    <div className="workflow-node__preview" title={preview || '内容提炼'}>
      <p><strong>内容提炼</strong></p>
      <p>{STATUS_LABEL[config.summaryStatus]}</p>
      {preview ? <p>{preview}</p> : null}
    </div>
  );
}

export const contentExtractUi: NodeUiContribution<ContentExtractConfig> = {
  label: '内容提炼',
  icon: TextSelect,
  theme: { headerBackground: '#fff7e8', glyphColor: '#c47b16' },
  Inspector: ContentExtractInspector,
  CanvasBody: ContentExtractCanvasBody,
  showRunAction: true,
};
