import React, { useState, useEffect } from 'react';
import { X, Bell, ExternalLink, Copy, Check, Radio } from 'lucide-react';
import QRCode from 'qrcode';
import { useEscapeKey } from '../utils/useEscapeKey';
import { buildRadarBotUrl, formatLeadTimeLabel } from '../utils/radarCore';
import LinePlate from './LinePlate';

const LEAD_OPTIONS = [5, 8, 10, 15];

export default function RadarModal({ isOpen, onClose, entry }) {
  const [leadMinutes, setLeadMinutes] = useState(8);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEscapeKey(isOpen, onClose);

  const serviceId = entry?.serviceId || '';
  const stopId = entry?.stopId || '';
  const botUrl = buildRadarBotUrl('NextoRadarBot', serviceId, stopId, leadMinutes);

  useEffect(() => {
    if (!isOpen || !botUrl) return;
    let cancelled = false;

    QRCode.toDataURL(botUrl, {
      width: 180,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [isOpen, botUrl]);

  if (!isOpen || !entry) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(botUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleOpenTelegram = () => {
    window.open(botUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="radar-modal-title"
    >
      <div className="relative w-full max-w-md bg-surface border border-line rounded-[24px] shadow-2xl p-5 md:p-6 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-brand/10 text-brand flex items-center justify-center">
              <Bell className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 id="radar-modal-title" className="font-display text-base font-bold text-ink">
                Nexto+ Radar no Telegram
              </h2>
              <p className="text-xs text-muted">Aviso automático antes do ônibus chegar</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-muted hover:text-ink hover:bg-surface-2 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 space-y-4 overflow-y-auto pr-1">
          {/* Linha e Ponto Selecionados */}
          <div className="p-3 bg-surface-2 rounded-[16px] border border-line flex items-center gap-3">
            {entry.line && <LinePlate line={entry.line} />}
            <div className="min-w-0 flex-1">
              <p className="font-display font-semibold text-sm text-ink truncate">
                {entry.stopName || `Ponto ${entry.stopId}`}
              </p>
              <p className="text-xs text-muted truncate">
                {entry.line?.routeMnemonic}
                {entry.line?.serviceMnemonic && ` → ${entry.line.serviceMnemonic}`}
              </p>
            </div>
          </div>

          {/* Antecedência */}
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
              Avisar com antecedência de:
            </label>
            <div className="grid grid-cols-4 gap-2">
              {LEAD_OPTIONS.map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setLeadMinutes(mins)}
                  className={`py-2 px-1 text-center rounded-[12px] border text-xs font-semibold transition-all ${
                    leadMinutes === mins
                      ? 'bg-brand text-brand-fg border-brand shadow-sm'
                      : 'bg-surface border-line text-ink hover:border-line-strong'
                  }`}
                >
                  {mins} min
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-accent" />
              {formatLeadTimeLabel(leadMinutes)}
            </p>
          </div>

          {/* QR Code para abrir no celular se estiver no desktop */}
          <div className="p-4 bg-canvas border border-line rounded-[18px] flex flex-col items-center text-center">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="QR Code para ativar no Telegram"
                className="w-36 h-36 rounded-[12px] shadow-sm bg-white p-2"
              />
            ) : (
              <div className="w-36 h-36 rounded-[12px] bg-surface-2 animate-pulse flex items-center justify-center text-xs text-muted">
                Gerando QR Code...
              </div>
            )}
            <p className="mt-2.5 text-xs font-medium text-ink">
              Aponte a câmera do celular para abrir o Bot do Telegram
            </p>
            <p className="text-[11px] text-muted">
              Ou clique no botão abaixo para abrir diretamente
            </p>
          </div>

          {/* Ações */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={handleOpenTelegram}
              className="w-full py-3 px-4 rounded-[14px] bg-brand text-brand-fg font-display font-bold text-sm flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.99] transition-all shadow-md"
            >
              <ExternalLink className="w-4 h-4" />
              Ativar no Telegram
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="w-full py-2.5 px-4 rounded-[14px] bg-surface-2 border border-line text-ink font-medium text-xs flex items-center justify-center gap-2 hover:bg-surface transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  Link copiado para a área de transferência!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-muted" />
                  Copiar link do alerta
                </>
              )}
            </button>
          </div>

          {/* Dica de valor */}
          <p className="text-[11px] text-muted text-center leading-relaxed">
            💡 O bot envia apenas notificações pontuais quando o ônibus estiver no horário. Sem spam e sem propagandas.
          </p>
        </div>
      </div>
    </div>
  );
}
