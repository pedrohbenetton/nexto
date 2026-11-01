// Cores da status bar nativa por tema (valores do canvas em index.css).
// Style.Light = ícones escuros (fundo claro); Style.Dark = ícones claros (fundo escuro).
export function statusBarFor(isDark) {
  return isDark
    ? { style: 'DARK', backgroundColor: '#0e1116' }
    : { style: 'LIGHT', backgroundColor: '#f6f7f2' };
}
