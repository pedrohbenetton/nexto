import { useEffect } from 'react';

export function useEscapeKey(onClose, enabled = true) {
  useEffect(() => {
    if (!enabled || typeof onClose !== 'function') return undefined;
    const handler = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, enabled]);
}
