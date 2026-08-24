import { Input } from 'antd';
import { BookOpen } from 'lucide-react';
import { useState } from 'react';

import type { NodeCanvasContext, NodeInspectorContext, NodeUiContribution } from '../types';
import type { ReferenceConfig } from './config';

export function ReferenceInspector({
  config,
  documents = [],
  patchConfig,
}: NodeInspectorContext<ReferenceConfig>) {
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const visible = documents.filter((doc) => (
    !needle
    || doc.title.toLowerCase().includes(needle)
    || doc.content.toLowerCase().includes(needle)
  ));
  const selected = documents.filter((doc) => config.documentIds.includes(doc.id));
  const toggle = (id: string) => {
    const next = config.documentIds.includes(id)
      ? config.documentIds.filter((item) => item !== id)
      : [...config.documentIds, id];
    patchConfig({ documentIds: next });
  };

  return (
    <section className="inspector-section">
      <p>{config.documentIds.length} 篇已引用</p>
      <label>
        引用文档
        <Input
          aria-label="检索文档"
          value={query}
          placeholder="关键词检索标题与正文…"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      {visible.length === 0 ? (
        <p className="inspector-preview">没有匹配的文档，请先在顶部工具栏「资料库」中添加。</p>
      ) : (
        visible.map((doc) => (
          <label key={doc.id} className="toggle-row">
            <input
              type="checkbox"
              checked={config.documentIds.includes(doc.id)}
              onChange={() => toggle(doc.id)}
            />
            <span>{doc.title}</span>
          </label>
        ))
      )}
      {selected.length > 0 && (
        <details className="inspector-preview">
          <summary>输出预览</summary>
          {selected.map((doc) => (
            <pre key={doc.id}>{`# ${doc.title}\n\n${doc.content}`}</pre>
          ))}
        </details>
      )}
    </section>
  );
}

export function ReferenceCanvasBody({ config, documents = [] }: NodeCanvasContext<ReferenceConfig>) {
  const selected = documents.filter((doc) => config.documentIds.includes(doc.id));
  const count = selected.length;
  return (
    <div className="workflow-node__preview">
      <p><strong>{count ? selected[0]!.title : '未引用文档'}</strong></p>
      {count ? <p>已引用 {count} 篇文档</p> : null}
    </div>
  );
}

export const referenceUi: NodeUiContribution<ReferenceConfig> = {
  label: '资料库',
  icon: BookOpen,
  theme: { headerBackground: '#e6fffb', glyphColor: '#13c2c2' },
  Inspector: ReferenceInspector,
  CanvasBody: ReferenceCanvasBody,
};
