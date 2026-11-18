import { useEffect, useRef } from 'react';
import { createEscapeStack } from './escapeStackCore';

const globalEscapeStack = createEscapeStack();
let listenerAttached = false;

function ensureGlobalListener() {
  if (listenerAttached || typeof window === 'undefined') return;
  listenerAttached = true;
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && globalEscapeStack.size() > 0) {
      e.preventDefault();
      e.stopPropagation();
      globalEscapeStack.dispatch();
    }
  });
}

export function useEscapeKey(onClose, enabled = true) {
  const callbackRef = useRef(onClose);

  useEffect(() => {
    callbackRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!enabled) return undefined;
    ensureGlobalListener();
    return globalEscapeStack.push(() => {
      if (typeof callbackRef.current === 'function') {
        callbackRef.current();
      }
    });
  }, [enabled]);
}
