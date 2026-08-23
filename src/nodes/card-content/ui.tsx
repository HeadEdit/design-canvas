import { Select } from 'antd';
import { FileText } from 'lucide-react';
import { useStore } from 'zustand';

import type { CandidateCard } from '../../domain/model';
import { CardDetail } from '../../features/cards/CardDetail';
import { cardCollectionInputIds } from '../../domain/workflow-io';
import type { AppStore } from '../../state/use-app-store';
import { AppDialog } from '../../components/AppDialog';
import type { NodeCanvasContext, NodeInspectorContext, NodeUiContribution } from '../types';
import { cardContentConfigSchema, type CardContentConfig } from './config';

export function CardContentInspector({
  node,
  config,
  workflow,
  cards = [],
  patchConfig,
}: NodeInspectorContext<CardContentConfig>) {
  const ids = cardCollectionInputIds(workflow, node.id, 'cards');
  const options = ids
    .map((id) => cards.find((card) => card.id === id))
    .filter((card): card is CandidateCard => !!card)
    .map((card) => ({ value: card.id, label: card.title || card.id }));

  return (
    <section className="inspector-section">
      <label>
        卡片
        <Select
          aria-label="选择卡片"
          value={ids.includes(config.sourceCardId) ? config.sourceCardId : undefined}
          placeholder={options.length === 0 ? '请先连接卡片组' : '选择一张卡片'}
          options={options}
          onChange={(cardId) => patchConfig({ sourceCardId: cardId })}
          style={{ width: '100%' }}
        />
      </label>
    </section>
  );
}

export function CardContentCanvasBody({
  config,
  workflow,
  cards = [],
  node,
}: NodeCanvasContext<CardContentConfig>) {
  const ids = cardCollectionInputIds(workflow, node.id, 'cards');
  const card = cards.find((item) => item.id === config.sourceCardId && ids.includes(item.id));
  if (!card) return null;
  return (
    <div className="workflow-node__preview">
      <strong>{card.title}</strong>
      <p>{card.concept}</p>
    </div>
  );
}

export function CardContentDialog({
  open,
  store,
  nodeId,
  onClose,
}: {
  open: boolean;
  store: AppStore;
  nodeId: string;
  onClose: () => void;
}) {
  const cards = useStore(store, (state) => state.cards);
  const workflow = useStore(store, (state) => state.workflow);
  const node = workflow?.nodes.find((item) => item.id === nodeId);
  const parsed = cardContentConfigSchema.safeParse(node?.config);
  const ids = cardCollectionInputIds(workflow, nodeId, 'cards');
  const selectedId = parsed.success ? parsed.data.sourceCardId : '';
  const card = cards.find((item) => item.id === selectedId && ids.includes(item.id));

  return (
    <AppDialog open={open} title={card?.title || '卡片内容'} onClose={onClose}>
      {card ? <CardDetail card={card} /> : <p>请先在属性面板选择一张卡片</p>}
    </AppDialog>
  );
}

export const cardContentUi: NodeUiContribution<CardContentConfig> = {
  label: '卡片内容',
  icon: FileText,
  theme: { headerBackground: '#fff6eb', glyphColor: '#c27803' },
  Inspector: CardContentInspector,
  CanvasBody: CardContentCanvasBody,
  Dialog: CardContentDialog as never,
};
