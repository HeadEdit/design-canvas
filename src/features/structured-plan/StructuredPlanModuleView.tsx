import {
  STRUCTURED_PLAN_LAYER_LABELS,
  STRUCTURED_PLAN_PRIORITY_LABELS,
  type StructuredPlanModule,
} from '../../nodes/structured-plan/config';

const MODULE_SECTIONS = [
  { field: 'overview', heading: '概述' },
  { field: 'playerFantasy', heading: '玩家幻想' },
  { field: 'rules', heading: '规则' },
  { field: 'formulas', heading: '公式' },
  { field: 'edgeCases', heading: '边界情况' },
  { field: 'dependencies', heading: '依赖' },
  { field: 'tuningKnobs', heading: '可调旋钮' },
  { field: 'acceptanceCriteria', heading: '验收' },
] as const;

export function StructuredPlanModuleView({ module }: { module: StructuredPlanModule }) {
  return (
    <section className="structured-plan-module-view" aria-label={module.title}>
      <div className="structured-plan-module-view__badges">
        <span className="structured-plan-module-view__badge">
          {STRUCTURED_PLAN_PRIORITY_LABELS[module.priority]}
        </span>
        <span className="structured-plan-module-view__badge">
          {STRUCTURED_PLAN_LAYER_LABELS[module.layer]}
        </span>
      </div>
      {MODULE_SECTIONS.map(({ field, heading }) => (
        <div className="structured-plan-module-view__field" key={field}>
          <h4>{heading}</h4>
          <p>{module[field].trim() || '待深化'}</p>
        </div>
      ))}
    </section>
  );
}
