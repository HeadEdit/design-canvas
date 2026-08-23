import { Button, Input, Select } from 'antd';
import { useEffect, useRef, useState } from 'react';

import {
  STRUCTURED_PLAN_LAYERS,
  STRUCTURED_PLAN_LAYER_LABELS,
  STRUCTURED_PLAN_PRIORITIES,
  STRUCTURED_PLAN_PRIORITY_LABELS,
  type StructuredPlanModule,
} from '../../nodes/structured-plan/config';
import type { StructuredPlanModuleEditableFields } from '../../nodes/structured-plan/format';

const TEXTAREA_FIELDS = [
  { field: 'overview', label: '概述', rows: 3 },
  { field: 'playerFantasy', label: '玩家幻想', rows: 3 },
  { field: 'rules', label: '规则', rows: 6 },
  { field: 'formulas', label: '公式', rows: 4 },
  { field: 'edgeCases', label: '边界情况', rows: 5 },
  { field: 'dependencies', label: '依赖', rows: 4 },
  { field: 'tuningKnobs', label: '可调旋钮', rows: 4 },
  { field: 'acceptanceCriteria', label: '验收', rows: 5 },
] as const;

function fieldsFromModule(module: StructuredPlanModule): StructuredPlanModuleEditableFields {
  return {
    title: module.title,
    overview: module.overview,
    playerFantasy: module.playerFantasy,
    rules: module.rules,
    formulas: module.formulas,
    edgeCases: module.edgeCases,
    dependencies: module.dependencies,
    tuningKnobs: module.tuningKnobs,
    acceptanceCriteria: module.acceptanceCriteria,
    priority: module.priority,
    layer: module.layer,
  };
}

function fieldsAreEqual(
  left: StructuredPlanModuleEditableFields,
  right: StructuredPlanModuleEditableFields,
): boolean {
  return left.title === right.title
    && left.priority === right.priority
    && left.layer === right.layer
    && TEXTAREA_FIELDS.every(({ field }) => left[field] === right[field]);
}

function trimFields(fields: StructuredPlanModuleEditableFields): StructuredPlanModuleEditableFields {
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
    priority: fields.priority,
    layer: fields.layer,
  };
}

export function StructuredPlanModuleForm({
  module,
  onSave,
  onCancel,
  onDirtyChange,
}: {
  module: StructuredPlanModule;
  onSave: (fields: StructuredPlanModuleEditableFields) => void;
  onCancel: () => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [fields, setFields] = useState(() => fieldsFromModule(module));
  const [initialFields, setInitialFields] = useState(() => fieldsFromModule(module));
  const sourceSnapshotRef = useRef({
    id: module.id,
    fields: fieldsFromModule(module),
  });
  const onDirtyChangeRef = useRef(onDirtyChange);
  const dirty = !fieldsAreEqual(fields, initialFields);

  useEffect(() => {
    const nextFields = fieldsFromModule(module);
    const previousSource = sourceSnapshotRef.current;
    if (previousSource.id === module.id && fieldsAreEqual(previousSource.fields, nextFields)) return;

    sourceSnapshotRef.current = { id: module.id, fields: nextFields };
    setFields(nextFields);
    setInitialFields(nextFields);
  }, [
    module.id,
    module.title,
    module.overview,
    module.playerFantasy,
    module.rules,
    module.formulas,
    module.edgeCases,
    module.dependencies,
    module.tuningKnobs,
    module.acceptanceCriteria,
    module.priority,
    module.layer,
  ]);

  useEffect(() => {
    onDirtyChangeRef.current = onDirtyChange;
  }, [onDirtyChange]);

  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => () => {
    onDirtyChangeRef.current(false);
  }, []);

  const updateField = <Field extends keyof StructuredPlanModuleEditableFields>(
    field: Field,
    value: StructuredPlanModuleEditableFields[Field],
  ) => {
    setFields((current) => ({ ...current, [field]: value }));
  };

  const canSave = fields.title.trim().length > 0;

  return (
    <form
      className="structured-plan-module-form"
      aria-label="模块编辑表单"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSave) onSave(trimFields(fields));
      }}
    >
      <label>
        模块标题
        <Input
          aria-label="模块标题"
          aria-required="true"
          required
          value={fields.title}
          onChange={(event) => updateField('title', event.target.value)}
        />
      </label>
      <label>
        优先级
        <Select
          aria-label="优先级"
          value={fields.priority}
          options={STRUCTURED_PLAN_PRIORITIES.map((value) => ({
            value,
            label: STRUCTURED_PLAN_PRIORITY_LABELS[value],
          }))}
          onChange={(priority) => setFields((current) => ({ ...current, priority }))}
          style={{ width: '100%' }}
        />
      </label>
      <label>
        分层
        <Select
          aria-label="分层"
          value={fields.layer}
          options={STRUCTURED_PLAN_LAYERS.map((value) => ({
            value,
            label: STRUCTURED_PLAN_LAYER_LABELS[value],
          }))}
          onChange={(layer) => setFields((current) => ({ ...current, layer }))}
          style={{ width: '100%' }}
        />
      </label>
      {TEXTAREA_FIELDS.map(({ field, label, rows }) => (
        <label key={field}>
          {label}
          <Input.TextArea
            aria-label={label}
            value={fields[field]}
            rows={rows}
            onChange={(event) => updateField(field, event.target.value)}
          />
        </label>
      ))}
      <div className="structured-plan-module-form__actions">
        <Button type="default" aria-label="取消" onClick={onCancel}>
          取消
        </Button>
        <Button
          type="primary"
          htmlType="submit"
          aria-label="保存模块修改"
          disabled={!canSave}
        >
          保存
        </Button>
      </div>
    </form>
  );
}
