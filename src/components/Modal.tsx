import { useEffect, type ReactNode } from 'react';
import { Icon } from './Icon';
import { t } from '../i18n';

export function Modal({ title, onClose, children, size, testId }: { title: string; onClose: () => void; children: ReactNode; size?: 'sm'; testId?: string }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="modal-back" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal${size === 'sm' ? ' sm' : ''}`} role="dialog" aria-modal="true" aria-label={title} data-testid={testId}>
        <div className="modal-h">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label={t('common.close')}><Icon name="close" /></button>
        </div>
        <div className="modal-b">{children}</div>
      </div>
    </div>
  );
}
