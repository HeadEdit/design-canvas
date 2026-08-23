import type { StructuredPlanSystemIndex } from './index-layout';
import { formatStructuredPlanModule } from './format';
import {
  STRUCTURED_PLAN_LAYER_LABELS,
  STRUCTURED_PLAN_PRIORITY_LABELS,
  type StructuredPlanDependencyGraph,
  type StructuredPlanModule,
} from './config';

export function structuredPlanExportFilename(name: string, exportedAt: string): string {
  const safeName = name
    .normalize('NFKC')
    .replace(/[<>:"/\\|?*\u0000-\u001f\u007f]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[.\s-]+|[.\s-]+$/g, '')
    .slice(0, 80) || 'gdd';
  const date = new Date(exportedAt);
  const stamp = Number.isNaN(date.getTime())
    ? 'export'
    : date.toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  return `${safeName}-${stamp}.md`;
}

export function buildStructuredPlanMarkdown(input: {
  workflowName: string;
  modules: readonly StructuredPlanModule[];
  graph: StructuredPlanDependencyGraph | null;
  index: StructuredPlanSystemIndex;
  generatedAt: string;
}): string {
  const { workflowName, modules, graph, index, generatedAt } = input;
  const lines: string[] = [];

  lines.push(`# ${workflowName} 游戏设计文档`);
  lines.push('');
  lines.push(`> 生成时间：${generatedAt}`);
  lines.push('');

  if (graph) {
    lines.push('## 系统索引');
    lines.push('');
    if (graph.stale) {
      lines.push('> 依赖图谱已过期');
      lines.push('');
    }

    lines.push('### 推荐设计顺序');
    lines.push('');
    lines.push('| 顺序 | 系统 | 分层 | 优先级 | 风险 |');
    lines.push('|---|---|---|---|---|');
    index.designOrder.forEach((item, order) => {
      const risk = [item.bottleneck ? '瓶颈' : '', item.inCycle ? '环依赖' : '']
        .filter(Boolean).join('、') || '';
      lines.push(`| ${order + 1} | ${item.title} | ${STRUCTURED_PLAN_LAYER_LABELS[item.layer]} | ${STRUCTURED_PLAN_PRIORITY_LABELS[item.priority]} | ${risk} |`);
    });
    lines.push('');

    if (index.bottlenecks.length > 0 || index.cycles.length > 0) {
      lines.push('### 高风险提示');
      lines.push('');
      for (const bottleneck of index.bottlenecks) {
        lines.push(`- 瓶颈：${bottleneck.title}（被 ${bottleneck.dependentCount} 个系统依赖）`);
      }
      for (const cycle of index.cycles) {
        lines.push(`- 环依赖：${cycle.join(' ↔ ')}`);
      }
      lines.push('');
    }
  } else {
    lines.push('> 尚未生成依赖图谱');
    lines.push('');
  }

  lines.push('## 系统设计');
  lines.push('');

  const orderedModules = index.designOrder.length > 0
    ? index.designOrder.map((item) => modules.find((module) => module.id === item.moduleId)!).filter(Boolean)
    : [...modules];

  for (const module of orderedModules) {
    lines.push(`### ${module.title}`);
    lines.push('');
    lines.push(formatStructuredPlanModule(module));
    lines.push('');
  }

  return `${lines.join('\n').trim()}\n`;
}

export function downloadStructuredPlanMarkdown(filename: string, markdown: string): void {
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  try {
    anchor.href = url;
    anchor.download = filename;
    anchor.hidden = true;
    document.body.append(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    URL.revokeObjectURL(url);
  }
}
