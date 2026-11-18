// Pilha LIFO para fechar apenas o modal/drawer do topo ao pressionar Escape

export function createEscapeStack() {
  const handlers = [];

  return {
    push(fn) {
      if (typeof fn !== 'function') return () => {};
      handlers.push(fn);
      return () => {
        const idx = handlers.lastIndexOf(fn);
        if (idx !== -1) handlers.splice(idx, 1);
      };
    },
    dispatch() {
      if (handlers.length === 0) return false;
      const top = handlers[handlers.length - 1];
      top();
      return true;
    },
    size() {
      return handlers.length;
    }
  };
}
