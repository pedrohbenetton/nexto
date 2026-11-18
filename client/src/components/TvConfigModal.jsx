import React, { useState } from 'react';
import { X, Tv, Copy, Check, ExternalLink, Sparkles, MapPin, Building, Megaphone } from 'lucide-react';
import { buildTvUrl } from '../utils/tvCore';
import { useEscapeKey } from '../utils/useEscapeKey';

const PRESETS = [
  {
    label: 'UFSCar Sorocaba · Terminal Universitário',
    params: {
      cityId: 35,
      cityName: 'Sorocaba',
      stopId: '0309ec1a-6609-11ed-98db-5adc55d213d0',
      stopName: 'UFSCar - Campus Sorocaba (Terminal Universitário)',
      title: 'UFSCar Sorocaba · Portaria Universitária',
      lines: ['80'],
      serviceId: 'ea17e96a-7d44-4ebd-8cc3-ee6159965b0d',
      lineRoutesPath: 'transporte_publico-Sorocaba-CitySorocaba-80-UFSCAR-Bairro-86ab26fd7fd7',
      notice: 'Aulas e biblioteca ativas até 22h30'
    }
  },
  {
    label: 'Sorocaba Centro · Terminal São Paulo / Leopoldo Machado',
    params: {
      cityId: 35,
      cityName: 'Sorocaba',
      stopId: '03029557-6609-11ed-98db-5adc55d213d0',
      stopName: 'Rua Leopoldo Machado, 259 - Centro, Sorocaba - SP',
      title: 'Saída Centro · Terminal São Paulo',
      lines: ['80', '44'],
      serviceId: '2034166c-9939-43b1-bc3c-d7745425cba8',
      lineRoutesPath: 'transporte_publico-Sorocaba-CitySorocaba-80-2-Cond.AnaMaria-Centro-0789139e0c00',
      notice: 'Acompanhe seu ônibus antes de sair'
    }
  },
  {
    label: 'São Paulo · Terminal Lapa (GTFS Aberto)',
    params: {
      cityId: 9001,
      cityName: 'São Paulo',
      stopId: 'stop_1',
      stopName: 'Terminal Lapa (Plataforma A)',
      title: 'Hall de Entrada · Corredor Lapa',
      lines: ['8000-10'],
      serviceId: 'gtfs-srv-gtfs-sp-8000-10-lapa-ramos',
      lineRoutesPath: 'gtfs-sp-8000-10-lapa-ramos',
      notice: 'Conexão Linha 8-Diamante e 7-Rubi'
    }
  }
];

export default function TvConfigModal({ isOpen, onClose, initialParams = {}, onApply }) {
  useEscapeKey(onClose, isOpen);

  const [title, setTitle] = useState(initialParams.title || 'Portaria Principal');
  const [stopName, setStopName] = useState(initialParams.stopName || 'Ponto em frente');
  const [stopId, setStopId] = useState(initialParams.stopId || '');
  const [lines, setLines] = useState((initialParams.lines || []).join(', '));
  const [notice, setNotice] = useState(initialParams.notice || '');
  const [cityId, setCityId] = useState(initialParams.cityId || 35);
  const [cityName, setCityName] = useState(initialParams.cityName || 'Sorocaba');
  const [serviceId, setServiceId] = useState(initialParams.serviceId || '');
  const [lineRoutesPath, setLineRoutesPath] = useState(initialParams.lineRoutesPath || '');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentParams = {
    title: title.trim() || 'Painel de Transporte',
    stopName: stopName.trim(),
    stopId: stopId.trim() || null,
    lines: lines.split(',').map(s => s.trim().toUpperCase()).filter(Boolean),
    notice: notice.trim(),
    cityId,
    cityName,
    serviceId: serviceId.trim() || null,
    lineRoutesPath: lineRoutesPath.trim() || null
  };

  const previewUrl = typeof window !== 'undefined'
    ? buildTvUrl(currentParams, window.location.origin)
    : '';

  const handleApplyPreset = (preset) => {
    setTitle(preset.params.title);
    setStopName(preset.params.stopName);
    setStopId(preset.params.stopId || '');
    setLines((preset.params.lines || []).join(', '));
    setNotice(preset.params.notice || '');
    setCityId(preset.params.cityId || 35);
    setCityName(preset.params.cityName || 'Sorocaba');
    setServiceId(preset.params.serviceId || '');
    setLineRoutesPath(preset.params.lineRoutesPath || '');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(previewUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback manual
    }
  };

  const handleOpenNow = () => {
    if (typeof onApply === 'function') {
      onApply(currentParams);
    } else {
      window.location.href = previewUrl;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl bg-surface border border-line rounded-[28px] overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-line bg-surface flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-soft border border-brand/20 flex items-center justify-center text-accent">
              <Tv className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-ink">
                Configurar Painel Nexto TV
              </h2>
              <p className="text-xs text-muted">
                Transforme qualquer Smart TV ou monitor em um painel de partidas ao vivo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="w-9 h-9 rounded-full text-muted hover:text-ink hover:bg-surface-2 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo com scroll */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Presets de 1 clique */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-muted uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5 text-accent" /> Modelos Prontos para Teste Rápido
            </label>
            <div className="grid grid-cols-1 gap-2">
              {PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="w-full text-left p-3 rounded-2xl bg-surface-2 hover:bg-surface-3 border border-line/60 hover:border-brand/40 transition-colors flex items-center justify-between group"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-ink group-hover:text-accent transition-colors truncate">
                      {p.label}
                    </p>
                    <p className="text-[11px] text-muted truncate">
                      Linhas: {p.params.lines.join(', ')} · {p.params.cityName}
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold text-accent flex-shrink-0">
                    Usar
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="h-px bg-line" />

          {/* Campos Personalizados */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                <Building className="inline w-3.5 h-3.5 mr-1" /> Título no Topo da TV
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: Portaria Bloco C · Saída Universitária"
                className="w-full h-11 px-4 bg-surface-2 border border-line focus:border-brand rounded-2xl text-sm text-ink focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                  <MapPin className="inline w-3.5 h-3.5 mr-1" /> Nome do Ponto / Endereço
                </label>
                <input
                  type="text"
                  value={stopName}
                  onChange={(e) => setStopName(e.target.value)}
                  placeholder="Ex.: Av. Armando Pannunzio, 1700"
                  className="w-full h-11 px-4 bg-surface-2 border border-line focus:border-brand rounded-2xl text-sm text-ink focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                  Filtrar Linhas (Opcional)
                </label>
                <input
                  type="text"
                  value={lines}
                  onChange={(e) => setLines(e.target.value)}
                  placeholder="Ex.: 80, 44 (ou deixe vazio p/ todas)"
                  className="w-full h-11 px-4 bg-surface-2 border border-line focus:border-brand rounded-2xl text-sm text-ink focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                <Megaphone className="inline w-3.5 h-3.5 mr-1" /> Mensagem de Rodapé / Aviso do Estabelecimento
              </label>
              <input
                type="text"
                value={notice}
                onChange={(e) => setNotice(e.target.value)}
                placeholder="Ex.: Biblioteca aberta até 22h · Apoio Cantina Central"
                className="w-full h-11 px-4 bg-surface-2 border border-line focus:border-brand rounded-2xl text-sm text-ink focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-muted">
                Exibido com destaque no rodapé ao lado do QR Code do aplicativo.
              </p>
            </div>
          </div>
        </div>

        {/* Rodapé de Ações */}
        <div className="p-4 px-6 border-t border-line bg-surface flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCopyLink}
            className="h-11 px-4 rounded-2xl bg-surface-2 hover:bg-surface-3 border border-line text-xs font-bold text-ink flex items-center gap-2 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Link Copiado!' : 'Copiar Link da TV'}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-4 rounded-2xl text-xs font-bold text-muted hover:text-ink transition-colors"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleOpenNow}
              className="h-11 px-5 rounded-2xl bg-brand text-on-brand hover:opacity-90 text-xs font-bold flex items-center gap-2 transition-opacity shadow-lg shadow-brand/20"
            >
              <ExternalLink className="w-4 h-4" />
              Abrir Painel em Tela Cheia
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
