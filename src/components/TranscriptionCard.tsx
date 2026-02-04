import React, { memo } from 'react';
import { FileText } from 'lucide-react';
import { Language } from '../types';

interface Props {
  text: string;
  lang: Language;
}

const TranscriptionCard: React.FC<Props> = ({ text, lang }) => {
  const t = {
    es: { title: 'Transcripción del Audio', empty: 'No se pudo generar la transcripción.' },
    en: { title: 'Audio Transcription', empty: 'Could not generate transcription.' },
  }[lang];

  return (
    <section className="relative rounded-lg p-4 border border-white/5 bg-white/5">
      <div className="flex items-center gap-2.5 mb-3 border-b border-white/5 pb-2">
        <FileText className="w-4 h-4 text-slate-400" />
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-300">{t.title}</h3>
      </div>

      <div className="max-h-60 overflow-y-auto pr-2">
        <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-mono">
          {text || t.empty}
        </p>
      </div>
    </section>
  );
};

export default memo(TranscriptionCard);
