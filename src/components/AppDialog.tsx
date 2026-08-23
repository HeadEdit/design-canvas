import { Button } from 'antd';
import { X } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';

const dialogStack: symbol[] = [];

export function AppDialog({ open, title, onClose, children, variant = 'fullscreen' }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode; variant?: 'fullscreen' | 'popup' }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const token = useRef(Symbol('dialog'));
  const onCloseRef = useRef(onClose);
  const titleId = `app-dialog-title-${useId().replace(/:/g, '')}`;
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    if (!open) return;
    dialogStack.push(token.current);
    previousFocus.current = document.activeElement as HTMLElement;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (dialogStack[dialogStack.length - 1] !== token.current) return;
      if (event.key === 'Escape') { event.stopPropagation(); onCloseRef.current(); }
      if (event.key === 'Tab') {
        const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button, input, select, textarea, [tabindex]:not([tabindex="-1"])') ?? []).filter((item) => !item.hasAttribute('disabled'));
        if (!focusable.length) return;
        const first = focusable[0]; const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      const index = dialogStack.indexOf(token.current);
      if (index >= 0) dialogStack.splice(index, 1);
      previousFocus.current?.focus();
    };
  }, [open]);
  if (!open) return null;
  return <div className={`app-dialog-backdrop${variant === 'popup' ? ' app-dialog-backdrop--popup' : ''}`} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCloseRef.current(); }}>
    <section ref={dialogRef} className={`app-dialog${variant === 'popup' ? ' app-dialog--popup' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <header className="app-dialog__header"><h2 id={titleId}>{title}</h2><Button ref={closeRef} aria-label="关闭" title="关闭" type="text" icon={<X size={18} />} onClick={() => onCloseRef.current()} /></header>
      <div className="app-dialog__body">{children}</div>
    </section>
  </div>;
}
