import { Input } from 'antd';
import { Layers } from 'lucide-react';

import { summarizeCardPoolFeedback } from '../../domain/card-pool-feedback';
import { CardPoolDialog } from '../../features/cards/CardPoolDialog';
import type { NodeCanvasContext, NodeInspectorContext, NodeUiContribution } from '../types';
import type { CardVariableConfig } from './config';
import { formatCardPoolBadge, summarizeCardVariablePool } from './pool-summary';

export function CardVariableInspector({
  node,
  config,
  cards = [],
  patchConfig,
}: NodeInspectorContext<CardVariableConfig>) {
  const summary = summarizeCardVariablePool(node, cards);
  const feedback = summarizeCardPoolFeedback(node, cards);

  return (
    <section className="inspector-section">
      <h3>引用</h3>
      <label>
        名称
        <Input
          aria-label="名称"
          value={config.name}
          onChange={(event) => patchConfig({ name: event.target.value })}
        />
      </label>
      <p className="card-pool-pref__hint">
        双击节点打开卡片池。发散往这里追加，评分 / 浏览改同一份对象。
      </p>

      <h3>本池卡片</h3>
      <div className="card-pool-pref__stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="card-pool-pref__stat card-pool-pref__stat--pool">
          <strong>{summary.poolCount}</strong><span>卡片</span>
        </div>
        <div className="card-pool-pref__stat card-pool-pref__stat--up">
          <strong>{summary.upCount} / {summary.downCount}</strong><span>赞 / 踩</span>
        </div>
        <div className="card-pool-pref__stat card-pool-pref__stat--score">
          <strong>{summary.scoredCount}</strong><span>已评</span>
        </div>
      </div>
      {summary.cards.length === 0 ? (
        <p className="card-pool-pref__empty">池中还没有卡片</p>
      ) : (
        <ul className="card-pool-pref__list">
          {summary.cards.map((card) => {
            const badge = formatCardPoolBadge(card);
            return (
              <li key={card.id}>
                <span className="title">{card.title || `卡片 ${card.id}`}</span>
                {badge ? (
                  <span className={`card-pool-badge card-pool-badge--${badge.kind}`}>
                    {badge.text}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <h3>人裁决</h3>
      {feedback.voted.length === 0 ? (
        <p className="card-pool-pref__empty">本池还没有赞踩</p>
      ) : (
        <ul className="card-pool-pref__list">
          {feedback.voted.map((card) => (
            <li key={card.id}>
              <span className="title">{card.title || `卡片 ${card.id}`}</span>
              <span className={`card-pool-badge card-pool-badge--${card.vote ?? 'up'}`}>
                {card.vote === 'down' ? '踩' : '赞'}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="card-pool-pref__hint">人裁决优先于均分</p>
    </section>
  );
}

export function CardVariableCanvasBody({
  config,
  cards = [],
  node,
}: NodeCanvasContext<CardVariableConfig>) {
  const summary = summarizeCardVariablePool(node, cards);
  const name = config.name.trim() || '卡片池';
  const hasFeedback = summary.upCount + summary.downCount + summary.scoredCount > 0;

  return (
    <div className="workflow-node__preview" title={name}>
      <p><strong>{name}</strong></p>
      <div className="card-pool-feedback__chips" aria-label="本池摘要">
        <span className="card-pool-chip card-pool-chip--empty">本池 {summary.poolCount}</span>
        {hasFeedback ? (
          <>
            <span className="card-pool-chip card-pool-chip--up">赞 {summary.upCount}</span>
            <span className="card-pool-chip card-pool-chip--down">踩 {summary.downCount}</span>
            <span className="card-pool-chip card-pool-chip--score">已评 {summary.scoredCount}</span>
          </>
        ) : null}
      </div>
    </div>
  );
}

export const cardVariableUi: NodeUiContribution<CardVariableConfig> = {
  label: '卡片变量',
  icon: Layers,
  theme: { headerBackground: '#f0fdfa', glyphColor: '#0f766e' },
  Inspector: CardVariableInspector,
  CanvasBody: CardVariableCanvasBody,
  Dialog: CardPoolDialog as never,
};
