
import React, { memo } from 'react';
import { BrainCircuit, AlertTriangle, CheckCircle2, Shield } from 'lucide-react';
import { Language } from '../types';

interface Props {
  isDeepfake: boolean;
  confidenceScore: number;
  detectionFlags: string[];
  lang: Language;
}

const DeepfakeAnalysisCard: React.FC<Props> = ({ isDeepfake, confidenceScore, detectionFlags, lang }) => {
  const isHighRisk = isDeepfake && confidenceScore > 70;
  const t = {
    es: { 
      title: "Análisis de Origen", 
      sub: "Validación de Voz Humana", 
      conf: "CONFIANZA", 
      res: "Resultado",
      synth: "VOZ_ARTIFICIAL", 
      auth: "VOZ_AUTÉNTICA",
      human: "Humano",
      ai: "Generado por IA",
      obs: "Observaciones Técnicas"
    },
    en: { 
      title: "Origin Analysis", 
      sub: "Human Voice Validation", 
      conf: "CONFIDENCE", 
      res: "Result",
      synth: "SYNTHETIC_VOICE", 
      auth: "AUTHENTIC_VOICE",
      human: "Human",
      ai: "AI Generated",
      obs: "Technical Observations"
    }
  }[lang];
  
  return (
    <section className={`rounded-[2.5rem] p-8 border ${isHighRisk ? 'border-rose-500/30 bg-rose-500/5' : 'border-brand-500/20 bg-brand-500/5'}`}>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isHighRisk ? 'bg-rose-500 text-deep-950' : 'bg-brand-500 text-deep-950'}`}>
            <BrainCircuit size={28} />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">{t.title}</h3>
            <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase">{t.sub}</p>
          </div>
        </div>
        <div className="text-right">
          <span className={`text-sm font-black font-mono ${isHighRisk ? 'text-rose-500' : 'text-brand-500'}`}>
            {t.conf}: {confidenceScore}%
          </span>
        </div>
      </div>
      
      <div className="space-y-6">
        <div className={`flex items-center justify-between p-5 rounded-2xl ${isHighRisk ? 'bg-rose-500/10 border border-rose-500/20' : 'bg-brand-500/10 border border-brand-500/20'}`}>
            <div className="flex items-center gap-3">
                {isDeepfake ? <AlertTriangle className="text-rose-500" size={24} /> : <CheckCircle2 className="text-brand-500" size={24} />}
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase text-slate-500 leading-none mb-1">{t.res}</span>
                  <span className={`text-lg font-black italic tracking-tighter ${isDeepfake ? 'text-rose-400' : 'text-brand-400'}`}>
                    {isDeepfake ? t.synth : t.auth}
                  </span>
                </div>
            </div>
            <Shield className={isDeepfake ? 'text-rose-500/30' : 'text-brand-500/30'} size={32} />
        </div>

        <div>
            <div className="flex justify-between text-[9px] font-black uppercase text-slate-500 mb-2 px-1">
              <span>{t.human}</span>
              <span>{t.ai}</span>
            </div>
            <div className="h-3 w-full rounded-full bg-white/5 overflow-hidden p-0.5 border border-white/5">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${isHighRisk ? 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)]' : 'bg-brand-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]'}`} 
                  style={{ width: `${confidenceScore}%` }}
                ></div>
            </div>
        </div>

        {detectionFlags.length > 0 && (
          <div className="pt-4 border-t border-white/5">
            <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4">{t.obs}:</h4>
            <div className="grid grid-cols-1 gap-2">
              {detectionFlags.map((flag, index) => (
                <div key={index} className="flex items-center gap-3 bg-deep-950/60 p-3 rounded-xl border border-white/5">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                  <span className="text-[11px] font-medium text-slate-300">{flag}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default memo(DeepfakeAnalysisCard);
