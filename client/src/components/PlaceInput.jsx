import React, { useEffect, useRef, useState } from 'react';
import { Crosshair, Loader2 } from 'lucide-react';
import { apiUrl } from '../utils/api';
import { getCurrentPosition } from '../utils/geolocation';
import { shortPlaceName, needsResolve } from '../utils/tripPlanCore';

// Campo de endereço com autocomplete. Entrega { name, lat, lng } já resolvido.
export default function PlaceInput({ label, value, onChange, placeholder, cityName }) {
  const [text, setText] = useState(value?.name || '');
  const [suggestions, setSuggestions] = useState([]);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const timer = useRef(null);
  const requestId = useRef(0);

  // Sincroniza quando o pai troca o valor (ex.: inverter origem/destino)
  useEffect(() => {
    if (value) setText(value.name);
  }, [value]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const handleType = (e) => {
    const term = e.target.value;
    setText(term);
    onChange(null);
    clearTimeout(timer.current);
    if (term.trim().length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    timer.current = setTimeout(async () => {
      const id = ++requestId.current;
      try {
        const query = cityName ? `${term.trim()}, ${cityName}` : term.trim();
        const res = await fetch(apiUrl(`/api/autocomplete?term=${encodeURIComponent(query)}`));
        const json = await res.json();
        if (id === requestId.current && json.success) {
          const seen = new Set();
          const unique = json.data.filter(p => {
            const key = shortPlaceName(p.nome).toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          setSuggestions(unique.slice(0, 6));
          setOpen(true);
        }
      } catch {
        if (id === requestId.current) setSuggestions([]);
      }
    }, 350);
  };

  const pick = async (place) => {
    setOpen(false);
    setSuggestions([]);
    const name = shortPlaceName(place.nome);
    setText(name);
    if (!needsResolve(place)) {
      onChange({ name, lat: place.lat, lng: place.lng });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(apiUrl(`/api/places/resolve?text=${encodeURIComponent(place.nome)}&key=${encodeURIComponent(place.id)}`));
      const json = await res.json();
      if (json.success && !needsResolve(json.data)) {
        onChange({ name, lat: json.data.lat, lng: json.data.lng });
      }
    } catch {
      // sem coordenadas, o campo continua vazio e a busca fica desabilitada
    } finally {
      setBusy(false);
    }
  };

  const useMyLocation = async () => {
    setBusy(true);
    try {
      const { lat, lng } = await getCurrentPosition();
      onChange({ name: 'Minha localização', lat, lng });
    } catch {
      alert('Não foi possível obter sua localização. Verifique a permissão de GPS.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted mb-1">{label}</label>
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={text}
          onChange={handleType}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className="flex-1 min-w-0 h-11 px-3.5 rounded-[14px] bg-surface-2 border border-line text-sm text-ink placeholder:text-muted focus:outline-none focus:border-brand"
        />
        <button
          type="button"
          onClick={useMyLocation}
          title="Usar minha localização"
          aria-label="Usar minha localização"
          className="h-11 w-11 flex-shrink-0 rounded-[14px] border border-line bg-surface text-accent hover:border-line-strong flex items-center justify-center transition-colors"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4" />}
        </button>
      </div>

      {open && suggestions.length > 0 && (
        <ul className="mt-1.5 mr-12 rounded-[14px] bg-surface border border-line overflow-hidden divide-y divide-line">
          {suggestions.map(place => (
            <li key={place.id}>
              <button
                type="button"
                onClick={() => pick(place)}
                className="w-full text-left px-3.5 py-2.5 text-sm text-ink hover:bg-surface-2 transition-colors"
              >
                {shortPlaceName(place.nome)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
