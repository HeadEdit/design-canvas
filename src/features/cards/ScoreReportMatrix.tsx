import { Tooltip } from 'antd';
import type { IdeaScoreReport, IdeaScoreSort } from '../../domain/idea-score-report';

function sortIndicator(sort: IdeaScoreSort, key: string): string {
  if (sort.key !== key) return '';
  return sort.direction === 'desc' ? ' ↓' : ' ↑';
}

function ariaSortValue(
  sort: IdeaScoreSort,
  key: string,
): 'ascending' | 'descending' | 'none' {
  if (sort.key !== key) return 'none';
  return sort.direction === 'asc' ? 'ascending' : 'descending';
}

function scoreToneClass(score: number | undefined): string {
  if (score === undefined) {
    return 'card-browser-report__score card-browser-report__score--empty';
  }
  if (score >= 8) return 'card-browser-report__score card-browser-report__score--high';
  if (score >= 5) return 'card-browser-report__score card-browser-report__score--mid';
  return 'card-browser-report__score card-browser-report__score--low';
}

export function ScoreReportMatrix({
  report,
  sort,
  onSort,
  onOpenCard,
}: {
  report: IdeaScoreReport;
  sort: IdeaScoreSort;
  onSort: (key: string) => void;
  onOpenCard: (cardId: string) => void;
}) {
  const columns = report.dimensionSnapshot;

  return (
    <div className="card-browser-report__matrix-wrap">
      <table className="card-browser-report__matrix">
        <thead>
          <tr>
            <th scope="col" className="card-browser-report__sticky">卡片</th>
            {columns.map((dimension) => (
              <th
                key={dimension.id}
                scope="col"
                aria-sort={ariaSortValue(sort, dimension.id)}
              >
                <button
                  type="button"
                  className="card-browser-report__sort"
                  onClick={() => onSort(dimension.id)}
                >
                  {dimension.name}{sortIndicator(sort, dimension.id)}
                </button>
              </th>
            ))}
            <th scope="col" aria-sort={ariaSortValue(sort, 'average')}>
              <button
                type="button"
                className="card-browser-report__sort"
                onClick={() => onSort('average')}
              >
                均分{sortIndicator(sort, 'average')}
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {report.cards.map((card) => (
            <tr key={card.cardId}>
              <th scope="row" className="card-browser-report__sticky">
                <button
                  type="button"
                  className="card-browser-report__title"
                  onClick={() => onOpenCard(card.cardId)}
                >
                  {card.title}
                </button>
              </th>
              {columns.map((dimension) => {
                const cell = card.scores.find((score) => score.dimensionId === dimension.id);
                const scoreText = cell ? String(cell.score) : '—';
                const label = cell
                  ? `${dimension.name}：${cell.score}${cell.reason ? `（${cell.reason}）` : ''}`
                  : `${dimension.name}：无分数`;
                return (
                  <td
                    key={dimension.id}
                    className={scoreToneClass(cell?.score)}
                  >
                    {cell?.reason ? (
                      <Tooltip title={cell.reason} mouseEnterDelay={0}>
                        <span className="card-browser-report__score-hit" aria-label={label}>
                          {scoreText}
                        </span>
                      </Tooltip>
                    ) : (
                      <span aria-label={label}>{scoreText}</span>
                    )}
                  </td>
                );
              })}
              <td className={scoreToneClass(card.average)}>
                <strong>{card.average.toFixed(1)}</strong>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
