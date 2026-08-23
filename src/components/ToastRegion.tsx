import { getAiErrorMessage } from '../ai/error-messages';
import type { AiErrorKind } from '../ai/client';

export type GlobalErrorKind = AiErrorKind | 'storage' | 'navigation' | 'not-found';
export interface GlobalError { kind: GlobalErrorKind; message?: string }

const storageMessage = '本地存储失败，请重试';
const navigationMessage = '无法加载工作区，请重试';

function messageFor(error: GlobalError): string {
  if (error.kind === 'storage') return storageMessage;
  if (error.kind === 'navigation' || error.kind === 'not-found') return navigationMessage;
  return getAiErrorMessage(error.kind);
}

export function ToastRegion({ errors, onRetry }: { errors: GlobalError[]; onRetry?: () => void }) {
  const visible = errors.filter((error) => error.kind !== 'stopped');
  if (!visible.length) return null;
  return <aside className="toast-region" role="region" aria-label="通知" aria-live="polite">
    {visible.map((error, index) => <div className="toast" role="alert" key={`${error.kind}-${index}`}><span>{messageFor(error)}</span>{onRetry && (error.kind === 'storage' || error.kind === 'navigation' || error.kind === 'not-found') && <button type="button" onClick={onRetry}>重试</button>}</div>)}
  </aside>;
}
