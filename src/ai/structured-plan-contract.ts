import type {
  StructuredPlanLayer,
  StructuredPlanPriority,
} from '../nodes/structured-plan/config';

export const STRUCTURED_PLAN_MAX_MODULE_TITLES = 24;
export const STRUCTURED_PLAN_MAX_CANDIDATES = 48;
export const STRUCTURED_PLAN_MAX_TITLE_LENGTH = 80;
export const STRUCTURED_PLAN_MAX_STAGED_DATA_CONTEXT_CHARS = 64_000;

export const STRUCTURED_PLAN_ACCEPTED_CLASSIFICATIONS = [
  'explicit-system',
  'essential-implicit-system',
] as const;

export type StructuredPlanCandidateClassification =
  | (typeof STRUCTURED_PLAN_ACCEPTED_CLASSIFICATIONS)[number]
  | 'document-section';

export type StructuredPlanCandidateWire = {
  title: string;
  classification: StructuredPlanCandidateClassification;
  responsibility: string;
  basis: string;
};

export type StructuredPlanGraphModuleWire = {
  title: string;
  priority: StructuredPlanPriority;
  layer: StructuredPlanLayer;
};

export type StructuredPlanGraphEdgeWire = {
  providerTitle: string;
  consumerTitle: string;
  description: string;
};

export const STRUCTURED_PLAN_MODULE_FIELDS = [
  'title',
  'overview',
  'playerFantasy',
  'rules',
  'formulas',
  'edgeCases',
  'dependencies',
  'tuningKnobs',
  'acceptanceCriteria',
] as const;

export type StructuredPlanModuleField = (typeof STRUCTURED_PLAN_MODULE_FIELDS)[number];
