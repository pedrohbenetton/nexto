// Filtros de categoria da lista de linhas (pills do topo)
export const LINE_FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'favorites', label: 'Favoritos' },
  { id: 'brt', label: 'BRT' },
  { id: 'centro', label: 'Sentido Centro' },
  { id: 'bairro', label: 'Sentido Bairro' }
];

export function lineId(line) {
  return line.id || line.routeCode;
}

const upper = value => String(value || '').toUpperCase();

function isBrt(line) {
  if (Array.isArray(line.tags) && line.tags.some(t => upper(t) === 'BRT')) return true;
  return /\bBRT/.test(`${upper(line.routeCode)} ${upper(line.routeMnemonic)} ${upper(line.serviceMnemonic)}`);
}

// O destino da viagem vem em serviceMnemonic (ex.: "UFSCAR → CENTRO")
const goesToCentro = line => upper(line.serviceMnemonic).includes('CENTRO');

export function matchesFilter(line, filter, favorites) {
  switch (filter) {
    case 'favorites':
      return favorites.includes(lineId(line));
    case 'brt':
      return isBrt(line);
    case 'centro':
      return goesToCentro(line);
    case 'bairro':
      return Boolean(line.serviceMnemonic) && !goesToCentro(line);
    default:
      return true;
  }
}

export function matchesSearch(line, searchTerm) {
  const term = searchTerm.toLowerCase().trim();
  if (!term) return true;
  return [line.routeCode, line.routeMnemonic, line.serviceMnemonic, line.companyName]
    .some(field => field && String(field).toLowerCase().includes(term));
}

export function filterLines(lines, { filter, searchTerm, favorites }) {
  return lines.filter(l => matchesFilter(l, filter, favorites) && matchesSearch(l, searchTerm));
}

export function countByFilter(lines, { searchTerm, favorites }) {
  const searched = lines.filter(l => matchesSearch(l, searchTerm));
  return Object.fromEntries(
    LINE_FILTERS.map(f => [f.id, searched.filter(l => matchesFilter(l, f.id, favorites)).length])
  );
}
