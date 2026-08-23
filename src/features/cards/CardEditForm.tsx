import { Button, Input } from 'antd';
import { useState } from 'react';

import type { CandidateCard } from '../../domain/model';

export type CandidateCardEditValues = Pick<CandidateCard, 'title' | 'concept' | 'content' | 'tags'>;

function formatTagsInput(tags: readonly string[]): string {
  return tags.join(', ');
}

function parseTagsInput(raw: string): string[] {
  return raw
    .split(/[,，]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function CardEditForm({
  card,
  onSave,
  onCancel,
}: {
  card: CandidateCard;
  onSave: (values: CandidateCardEditValues) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(card.title);
  const [concept, setConcept] = useState(card.concept);
  const [content, setContent] = useState(card.content);
  const [tagsInput, setTagsInput] = useState(formatTagsInput(card.tags));

  const handleSave = () => {
    onSave({
      title: title.trim(),
      concept: concept.trim(),
      content: content.trim(),
      tags: parseTagsInput(tagsInput),
    });
  };

  const canSave = title.trim().length > 0 || concept.trim().length > 0 || content.trim().length > 0;

  return (
    <form
      className="card-edit-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSave) handleSave();
      }}
    >
      <label>
        标题
        <Input
          aria-label="卡片标题"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>
      <label>
        概念
        <Input.TextArea
          aria-label="卡片概念"
          value={concept}
          rows={3}
          onChange={(event) => setConcept(event.target.value)}
        />
      </label>
      <label>
        标签
        <Input
          aria-label="卡片标签"
          value={tagsInput}
          placeholder="用逗号分隔多个标签"
          onChange={(event) => setTagsInput(event.target.value)}
        />
      </label>
      <label>
        正文
        <Input.TextArea
          aria-label="卡片正文"
          value={content}
          rows={8}
          onChange={(event) => setContent(event.target.value)}
        />
      </label>
      <div className="card-edit-form__actions">
        <Button type="default" onClick={onCancel}>
          取消
        </Button>
        <Button type="primary" htmlType="submit" aria-label="保存卡片修改" disabled={!canSave}>
          保存
        </Button>
      </div>
    </form>
  );
}
