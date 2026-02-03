import React from 'react';
import { Scissors, AlertTriangle, CheckCircle } from 'lucide-react';
import { Language } from '../types';

interface Props {
    cutsDetected: number;
    timestamps: number[];
    lang: Language;
    onSeek?: (seconds: number) => void;
}

const translations = {
    es: {
        title: "Detección de Edición",
        noCuts: "Sin cortes detectados",
        cutsFound: "cortes detectados",
        atSecond: "en segundo",
        clean: "Audio limpio",
        warning: "Posible manipulación",
    },
    en: {
        title: "Splice Detection",
        noCuts: "No cuts detected",
        cutsFound: "cuts detected",
        atSecond: "at second",
        clean: "Clean audio",
        warning: "Possible manipulation",
    }
};

const SpliceDetectionCard: React.FC<Props> = ({ cutsDetected, timestamps, lang, onSeek }) => {
    const t = translations[lang];
    const hasEdits = cutsDetected > 0;

    return (
        <section className={`enterprise-panel rounded-2xl overflow-hidden border ${hasEdits ? 'border-amber-500/30' : 'border-brand-500/30'}`}>
            <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${hasEdits ? 'bg-amber-500/10' : 'bg-brand-500/10'}`}>
                        <Scissors size={20} className={hasEdits ? 'text-amber-400' : 'text-brand-500'} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-300">{t.title}</h3>
                        <p className={`text-xl font-bold ${hasEdits ? 'text-amber-400' : 'text-brand-500'}`}>
                            {hasEdits ? `${cutsDetected} ${t.cutsFound}` : t.noCuts}
                        </p>
                    </div>
                </div>
                {hasEdits ? (
                    <AlertTriangle size={24} className="text-amber-400" />
                ) : (
                    <CheckCircle size={24} className="text-brand-500" />
                )}
            </div>

            {hasEdits && timestamps.length > 0 && (
                <div className="px-4 pb-4">
                    <div className="flex flex-wrap gap-2">
                        {timestamps.map((ts, idx) => (
                            <button
                                key={idx}
                                onClick={() => onSeek?.(ts)}
                                className="px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 rounded-full text-xs font-mono transition-colors cursor-pointer border border-transparent hover:border-amber-500/30"
                                title="Jump to timestamp"
                            >
                                {ts.toFixed(2)}s
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
};

export default SpliceDetectionCard;
