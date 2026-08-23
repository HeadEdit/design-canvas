import { Tooltip } from 'antd';
import type { CandidateCard } from '../../domain/model';
import { formatMethodLabel } from '../../skills';

export function CardDetail({ card }: { card: CandidateCard }) {
  const score = card.score;
  return (
    <dl className="card-content-detail">
      <div><dt>方法</dt><dd>{formatMethodLabel(card.method)}</dd></div>
      <div><dt>概念</dt><dd>{card.concept}</dd></div>
      <div><dt>标签</dt><dd>{card.tags.join('、') || '无'}</dd></div>
      {score ? (
        <div>
          <dt>评分</dt>
          <dd>
            <ul className="card-score-list">
              <li className="card-score-list__average">均分 {score.average.toFixed(1)}</li>
              {score.byDimension.map((entry) => (
                <li key={entry.dimensionId} className="card-score-list__item">
                  <span className="card-score-list__name">{entry.name}</span>
                  <Tooltip title={entry.reason} mouseEnterDelay={0}>
                    <span
                      className="card-score-list__value"
                      aria-label={`${entry.name}：${entry.score}（${entry.reason}）`}
                    >
                      {entry.score}
                    </span>
                  </Tooltip>
                  <span className="card-score-list__reason">{entry.reason}</span>
                </li>
              ))}
            </ul>
          </dd>
        </div>
      ) : null}
      <div><dt>正文</dt><dd>{card.content}</dd></div>
    </dl>
  );
}
