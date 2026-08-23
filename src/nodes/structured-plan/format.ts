import type { NodeOutput } from '../../domain/model';
import {
  structuredPlanModuleSchema,
  type StructuredPlanConfig,
  type StructuredPlanLayer,
  type StructuredPlanModule,
  type StructuredPlanPriority,
} from './config';

export interface StructuredPlanModuleClock {
  id(): string;
  now(): string;
}

export type StructuredPlanModuleFields = Pick<
  StructuredPlanModule,
  | 'title'
  | 'overview'
  | 'playerFantasy'
  | 'rules'
  | 'formulas'
  | 'edgeCases'
  | 'dependencies'
  | 'tuningKnobs'
  | 'acceptanceCriteria'
>;

export type StructuredPlanModuleEditableFields = StructuredPlanModuleFields & {
  priority: StructuredPlanPriority;
  layer: StructuredPlanLayer;
};

const CONTENT_FIELDS = [
  'overview',
  'playerFantasy',
  'rules',
  'formulas',
  'edgeCases',
  'dependencies',
  'tuningKnobs',
  'acceptanceCriteria',
] as const;

const EDITABLE_FIELDS = ['title', ...CONTENT_FIELDS] as const;

const SECTIONS: ReadonlyArray<{
  field: (typeof CONTENT_FIELDS)[number];
  heading: string;
}> = [
  { field: 'overview', heading: '概述' },
  { field: 'playerFantasy', heading: '玩家幻想' },
  { field: 'rules', heading: '规则' },
  { field: 'formulas', heading: '公式' },
  { field: 'edgeCases', heading: '边界情况' },
  { field: 'dependencies', heading: '依赖' },
  { field: 'tuningKnobs', heading: '可调旋钮' },
  { field: 'acceptanceCriteria', heading: '验收' },
];

export function replaceStructuredPlanCandidate(
  config: StructuredPlanConfig,
): StructuredPlanConfig {
  if (!config.candidateModules) return config;
  return {
    ...config,
    modules: config.candidateModules,
    candidateModules: null,
    candidateGeneratedAt: null,
    dependencyGraph: config.candidateDependencyGraph,
    candidateDependencyGraph: null,
  };
}

export function discardStructuredPlanCandidate(
  config: StructuredPlanConfig,
): StructuredPlanConfig {
  return {
    ...config,
    candidateModules: null,
    candidateGeneratedAt: null,
    candidateDependencyGraph: null,
  };
}

export function markStructuredPlanGraphStale(
  config: StructuredPlanConfig,
  version: 'current' | 'candidate',
): StructuredPlanConfig {
  const graphKey = version === 'current' ? 'dependencyGraph' : 'candidateDependencyGraph';
  const graph = config[graphKey];
  if (!graph || graph.stale) return config;
  return {
    ...config,
    [graphKey]: { ...graph, stale: true },
  };
}

function trimFields(fields: StructuredPlanModuleFields): StructuredPlanModuleFields {
  return {
    title: fields.title.trim(),
    overview: fields.overview.trim(),
    playerFantasy: fields.playerFantasy.trim(),
    rules: fields.rules.trim(),
    formulas: fields.formulas.trim(),
    edgeCases: fields.edgeCases.trim(),
    dependencies: fields.dependencies.trim(),
    tuningKnobs: fields.tuningKnobs.trim(),
    acceptanceCriteria: fields.acceptanceCriteria.trim(),
  };
}

export function createStructuredPlanModule(
  fields: StructuredPlanModuleFields,
  clock: StructuredPlanModuleClock,
): StructuredPlanModule {
  const createdAt = clock.now();
  return structuredPlanModuleSchema.parse({
    id: clock.id(),
    ...trimFields(fields),
    titleSource: 'auto',
    createdAt,
    titleUpdatedAt: createdAt,
  });
}

export function createEmptyStructuredPlanModule(
  title: string,
  clock: StructuredPlanModuleClock,
): StructuredPlanModule {
  return structuredPlanModuleSchema.parse({
    ...createStructuredPlanModule({
      title,
      overview: '',
      playerFantasy: '',
      rules: '',
      formulas: '',
      edgeCases: '',
      dependencies: '',
      tuningKnobs: '',
      acceptanceCriteria: '',
    }, clock),
    titleSource: 'user',
  });
}

export interface StructuredPlanModuleClassification {
  moduleId: string;
  priority: StructuredPlanPriority;
  layer: StructuredPlanLayer;
}

export function applyModuleClassifications(
  modules: readonly StructuredPlanModule[],
  classifications: readonly StructuredPlanModuleClassification[],
): StructuredPlanModule[] {
  const byId = new Map(classifications.map((item) => [item.moduleId, item]));
  return modules.map((module) => {
    const classification = byId.get(module.id);
    return classification
      ? { ...module, priority: classification.priority, layer: classification.layer }
      : module;
  });
}

export function updateStructuredPlanModule(
  module: StructuredPlanModule,
  fields: Partial<StructuredPlanModuleEditableFields>,
  now: string,
): StructuredPlanModule {
  const updated = { ...module };

  for (const key of EDITABLE_FIELDS) {
    const value = fields[key];
    if (value !== undefined) updated[key] = value.trim();
  }

  if (fields.priority !== undefined) updated.priority = fields.priority;
  if (fields.layer !== undefined) updated.layer = fields.layer;

  if (updated.title !== module.title) {
    updated.titleSource = 'user';
    updated.titleUpdatedAt = now;
  }

  return structuredPlanModuleSchema.parse(updated);
}

export function moveStructuredPlanModule(
  modules: readonly StructuredPlanModule[],
  moduleId: string,
  direction: 'up' | 'down',
): StructuredPlanModule[] {
  const moved = [...modules];
  const index = moved.findIndex((module) => module.id === moduleId);
  const target = direction === 'up' ? index - 1 : index + 1;

  if (index < 0 || target < 0 || target >= moved.length) return moved;
  [moved[index], moved[target]] = [moved[target], moved[index]];
  return moved;
}

export function formatStructuredPlanModule(module: StructuredPlanModule): string {
  return SECTIONS.map(({ field, heading }) => [
    `## ${heading}`,
    module[field].trim() || '待深化',
  ].join('\n')).join('\n\n');
}

export function formatStructuredPlanOutput(
  modules: readonly StructuredPlanModule[],
): Extract<NodeOutput, { type: 'TextStruct' }> {
  return {
    type: 'TextStruct',
    items: modules.map((module) => ({
      id: module.id,
      title: module.title,
      content: formatStructuredPlanModule(module),
      turnId: module.id,
      createdAt: module.createdAt,
      titleSource: module.titleSource,
      titleUpdatedAt: module.titleUpdatedAt,
    })),
  };
}
