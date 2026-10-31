// Base da API do BFF. Vazio na web (mesma origem / proxy do Vite);
// no app nativo aponta para o servidor (ex.: http://192.168.0.10:3001 ou https://api.dominio).
export const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || '';

export function buildApiUrl(base, path) {
  const origin = String(base || '').trim().replace(/\/+$/, '');
  const route = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${route}`;
}

export const apiUrl = path => buildApiUrl(API_BASE_URL, path);
