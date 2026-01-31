
import React, { memo } from 'react';
import { Binary } from 'lucide-react';
import { Language } from '../types';

interface Props {
  duration: number;
  sampleRate: number | null;
  channels: number | null;
  mimeType: string;
  fileHash: string | null;
  lang: Language;
}

const formatTime = (time: number) => {
    if (isNaN(time) || time === Infinity) return '0.00s';
    return `${time.toFixed(2)}s`;
};

const MetadataCard: React.FC<Props> = ({ duration, mimeType, fileHash, lang }) => {
  const t = {
    es: { title: "Propiedades del Archivo", dur: "Duración Total", fmt: "Formato", id: "Identificador Único" },
    en: { title: "File Properties", dur: "Total Duration", fmt: "Format", id: "Unique Identifier" }
  }[lang];

  return (
    <section className="enterprise-panel rounded-2xl p-1 overflow-hidden">
      <div className="bg-slate-900/30 p-5">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <Binary className="w-4 h-4 text-brand-500" />
            {t.title}
        </h3>
        <dl className="space-y-3 text-xs">
          <div className="flex justify-between border-b border-white/5 pb-2">
            <dt className="text-slate-500 font-medium">{t.dur}</dt>
            <dd className="font-mono text-white">{formatTime(duration)}</dd>
          </div>
          <div className="flex justify-between border-b border-white/5 pb-2">
            <dt className="text-slate-500 font-medium">{t.fmt}</dt>
            <dd className="font-mono text-white truncate max-w-[120px] text-right">{mimeType}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500 font-medium">{t.id}</dt>
            <dd className="font-mono text-brand-500 truncate" title={fileHash || ''}>{fileHash ? `${fileHash.substring(0, 12)}...` : 'N/A'}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
};

export default memo(MetadataCard);
