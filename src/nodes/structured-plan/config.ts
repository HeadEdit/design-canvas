import { z } from 'zod';

export const STRUCTURED_PLAN_PRIORITIES = [
  'mvp',
  'vertical-slice',
  'alpha',
  'full-vision',
] as const;

export type StructuredPlanPriority = (typeof STRUCTURED_PLAN_PRIORITIES)[number];

export const STRUCTURED_PLAN_LAYERS = [
  'foundation',
  'core',
  'feature',
  'presentation',
  'polish',
] as const;

export type StructuredPlanLayer = (typeof STRUCTURED_PLAN_LAYERS)[number];

export const STRUCTURED_PLAN_PRIORITY_LABELS: Record<StructuredPlanPriority, string> = {
  mvp: 'MVP',
  'vertical-slice': '垂直切片',
  alpha: 'Alpha',
  'full-vision': '完整愿景',
};

export const STRUCTURED_PLAN_LAYER_LABELS: Record<StructuredPlanLayer, string> = {
  foundation: '基础',
  core: '核心',
  feature: '特性',
  presentation: '表现',
  polish: '打磨',
};

export const structuredPlanModuleSchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(1),
  titleSource: z.enum(['auto', 'user']),
  createdAt: z.string().trim().min(1),
  titleUpdatedAt: z.string().trim().min(1),
  priority: z.enum(STRUCTURED_PLAN_PRIORITIES).default('full-vision'),
  layer: z.enum(STRUCTURED_PLAN_LAYERS).default('feature'),
  overview: z.string(),
  playerFantasy: z.string(),
  rules: z.string(),
  formulas: z.string(),
  edgeCases: z.string(),
  dependencies: z.string(),
  tuningKnobs: z.string(),
  acceptanceCriteria: z.string(),
}).strict();

export type StructuredPlanModule = z.infer<typeof structuredPlanModuleSchema>;

export const structuredPlanDependencyGraphSchema = z.object({
  nodes: z.array(z.object({ moduleId: z.string().trim().min(1) }).strict()),
  edges: z.array(z.object({
    sourceModuleId: z.string().trim().min(1),
    targetModuleId: z.string().trim().min(1),
    description: z.string().trim(),
  }).strict()),
  generatedAt: z.string().trim().min(1),
  stale: z.boolean(),
}).strict();

export type StructuredPlanDependencyGraph = z.infer<typeof structuredPlanDependencyGraphSchema>;

function validateDependencyGraphAgainstModules(
  graph: StructuredPlanDependencyGraph,
  modules: readonly StructuredPlanModule[],
  pathPrefix: string[],
  context: z.RefinementCtx,
): void {
  const moduleIds = new Set(modules.map((item) => item.id));
  const nodeIds = new Set<string>();
  const edgeKeys = new Set<string>();

  graph.nodes.forEach((node, index) => {
    if (!moduleIds.has(node.moduleId)) {
      context.addIssue({
        code: 'custom',
        message: 'Dependency graph nodes must reference existing modules',
        path: [...pathPrefix, 'nodes', index, 'moduleId'],
      });
    }
    nodeIds.add(node.moduleId);
  });

  modules.forEach((item) => {
    if (!nodeIds.has(item.id)) {
      context.addIssue({
        code: 'custom',
        message: 'Dependency graph must include a node for every module',
        path: [...pathPrefix, 'nodes'],
      });
    }
  });

  graph.edges.forEach((edge, index) => {
    if (!moduleIds.has(edge.sourceModuleId)) {
      context.addIssue({
        code: 'custom',
        message: 'Dependency graph edge source must reference an existing module',
        path: [...pathPrefix, 'edges', index, 'sourceModuleId'],
      });
    }
    if (!moduleIds.has(edge.targetModuleId)) {
      context.addIssue({
        code: 'custom',
        message: 'Dependency graph edge target must reference an existing module',
        path: [...pathPrefix, 'edges', index, 'targetModuleId'],
      });
    }
    if (edge.sourceModuleId === edge.targetModuleId) {
      context.addIssue({
        code: 'custom',
        message: 'Modules cannot depend on themselves',
        path: [...pathPrefix, 'edges', index],
      });
    }
    const edgeKey = `${edge.sourceModuleId}->${edge.targetModuleId}`;
    if (edgeKeys.has(edgeKey)) {
      context.addIssue({
        code: 'custom',
        message: 'Duplicate directed dependency edges are not allowed',
        path: [...pathPrefix, 'edges', index],
      });
    }
    edgeKeys.add(edgeKey);
  });
}

const structuredPlanModuleArraySchema = z.array(structuredPlanModuleSchema).superRefine(
  (modules, context) => {
    const ids = new Set<string>();
    const titles = new Set<string>();

    modules.forEach((module, index) => {
      if (ids.has(module.id)) {
        context.addIssue({
          code: 'custom',
          message: 'Module ids must be unique',
          path: [index, 'id'],
        });
      }
      ids.add(module.id);

      const title = module.title.trim();
      if (titles.has(title)) {
        context.addIssue({
          code: 'custom',
          message: 'Module titles must be unique after trimming',
          path: [index, 'title'],
        });
      }
      titles.add(title);
    });
  },
);

const structuredPlanConfigObjectSchema = z.object({
  modules: structuredPlanModuleArraySchema.default([]),
  candidateModules: structuredPlanModuleArraySchema.nullable().default(null),
  candidateGeneratedAt: z.string().trim().min(1).nullable().default(null),
  dependencyGraph: structuredPlanDependencyGraphSchema.nullable().default(null),
  candidateDependencyGraph: structuredPlanDependencyGraphSchema.nullable().default(null),
}).strict().superRefine((config, context) => {
  if ((config.candidateModules === null) !== (config.candidateGeneratedAt === null)) {
    context.addIssue({
      code: 'custom',
      message: 'Candidate modules and generation timestamp must both be present or both be null',
      path: config.candidateModules === null ? ['candidateModules'] : ['candidateGeneratedAt'],
    });
  }

  if (config.candidateModules) {
    const formalIds = new Set(config.modules.map((module) => module.id));
    config.candidateModules.forEach((module, index) => {
      if (!formalIds.has(module.id)) return;
      context.addIssue({
        code: 'custom',
        message: 'Formal and candidate module ids must be disjoint',
        path: ['candidateModules', index, 'id'],
      });
    });
  }

  if (config.dependencyGraph) {
    validateDependencyGraphAgainstModules(
      config.dependencyGraph,
      config.modules,
      ['dependencyGraph'],
      context,
    );
  }

  if (config.candidateDependencyGraph && config.candidateModules) {
    validateDependencyGraphAgainstModules(
      config.candidateDependencyGraph,
      config.candidateModules,
      ['candidateDependencyGraph'],
      context,
    );
  }
});

export const structuredPlanConfigSchema = z.preprocess((value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const {
    generationPrompt: _legacyGenerationPrompt,
    targetItemId: _legacyTargetItemId,
    ...config
  } = value as Record<string, unknown>;
  return config;
}, structuredPlanConfigObjectSchema);

export type StructuredPlanConfig = z.infer<typeof structuredPlanConfigSchema>;

export const defaultStructuredPlanConfig: StructuredPlanConfig = structuredPlanConfigSchema.parse({});
