import { Button } from 'antd';
import { Download } from 'lucide-react';
import { useMemo } from 'react';

import type {
  StructuredPlanDependencyGraph,
  StructuredPlanModule,
} from '../../nodes/structured-plan/config';
import {
  STRUCTURED_PLAN_LAYER_LABELS,
  STRUCTURED_PLAN_PRIORITY_LABELS,
} from '../../nodes/structured-plan/config';
import {
  buildStructuredPlanMarkdown,
  downloadStructuredPlanMarkdown,
  structuredPlanExportFilename,
} from '../../nodes/structured-plan/export';
import { buildStructuredPlanSystemIndex } from '../../nodes/structured-plan/index-layout';

export function StructuredPlanDocumentView({
  workflowName,
  modules,
  graph,
}: {
  workflowName: string;
  modules: readonly StructuredPlanModule[];
  graph: StructuredPlanDependencyGraph | null;
}) {
  const index = useMemo(() => buildStructuredPlanSystemIndex(modules, graph), [modules, graph]);

  const handleExport = () => {
    const now = new Date().toISOString();
    const markdown = buildStructuredPlanMarkdown({
      workflowName,
      modules,
      graph,
      index,
      generatedAt: now,
    });
    downloadStructuredPlanMarkdown(structuredPlanExportFilename(workflowName, now), markdown);
  };

  return (
    <div className="structured-plan-document">
      <div className="structured-plan-document__toolbar">
        <Button icon={<Download size={15} />} aria-label="导出 Markdown" onClick={handleExport}>
          导出 Markdown
        </Button>
      </div>

      {graph ? (
        <section className="structured-plan-document__index" aria-label="系统索引">
          <h3>系统索引</h3>
          {graph.stale ? <p className="structured-plan-document__stale">依赖图谱已过期</p> : null}

          <h4>系统分层总览</h4>
          {index.layers.map((group) => (
            <section key={group.layer} aria-label={STRUCTURED_PLAN_LAYER_LABELS[group.layer]}>
              <h5>{STRUCTURED_PLAN_LAYER_LABELS[group.layer]}</h5>
              <ul>
                {group.items.map((item) => (
                  <li key={item.moduleId}>
                    <strong>{item.title}</strong>
                    <span>{STRUCTURED_PLAN_PRIORITY_LABELS[item.priority]}</span>
                    {item.bottleneck ? <span className="structured-plan-document__risk">瓶颈</span> : null}
                    {item.inCycle ? <span className="structured-plan-document__risk">环依赖</span> : null}
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <h4>推荐设计顺序</h4>
          <ol>
            {index.designOrder.map((item) => (
              <li key={item.moduleId}>
                <strong>{item.title}</strong>
                <span>{STRUCTURED_PLAN_LAYER_LABELS[item.layer]}</span>
                <span>{STRUCTURED_PLAN_PRIORITY_LABELS[item.priority]}</span>
                {item.bottleneck ? <span className="structured-plan-document__risk">瓶颈</span> : null}
                {item.inCycle ? <span className="structured-plan-document__risk">环依赖</span> : null}
              </li>
            ))}
          </ol>

          {index.bottlenecks.length > 0 || index.cycles.length > 0 ? (
            <>
              <h4>高风险提示</h4>
              <ul>
                {index.bottlenecks.map((item) => (
                  <li key={item.moduleId}>瓶颈：{item.title}（被 {item.dependentCount} 个系统依赖）</li>
                ))}
                {index.cycles.map((cycle) => (
                  <li key={cycle.join('->')}>环依赖：{cycle.join(' ↔ ')}</li>
                ))}
              </ul>
            </>
          ) : null}
        </section>
      ) : (
        <p>尚未生成依赖图谱</p>
      )}

      <section className="structured-plan-document__systems">
        <h3>系统设计</h3>
        <ul>
          {(index.designOrder.length > 0
            ? index.designOrder.map((item) => modules.find((module) => module.id === item.moduleId)!).filter(Boolean)
            : [...modules]
          ).map((module) => (
            <li key={module.id}>
              <strong>{module.title}</strong>
              <span>{STRUCTURED_PLAN_PRIORITY_LABELS[module.priority]}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
