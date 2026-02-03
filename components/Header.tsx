import React from 'react';
import { ShieldCheck, LogOut } from 'lucide-react';
import { AnalysisStatus, Language } from '../types';

interface HeaderProps {
    lang: Language;
    setLang: (lang: Language) => void;
    t: any;
    status: AnalysisStatus;
    isTranscribing: boolean;
    onResetApiKey: () => void;
    isTauri: boolean;
}

const Header: React.FC<HeaderProps> = ({
    lang,
    setLang,
    t,
    status,
    isTranscribing,
    onResetApiKey,
    isTauri
}) => {
    return (
        <header className="px-4 py-3 nav-blur border-b border-white/5 flex items-center justify-between z-50 shrink-0">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center shadow-lg shadow-brand-500/20 shrink-0">
                    <ShieldCheck className="w-5 h-5 text-deep-950" />
                </div>
                <div className="overflow-hidden">
                    <h1 className="text-base font-extrabold tracking-tight text-white leading-none whitespace-nowrap truncate">VOX INTELLIGENCE</h1>
                    <p className="text-sm font-bold text-brand-500 tracking-[0.2em] mt-1">{t.unit}</p>
                </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4 shrink-0">
                {/* LANG SELECTOR */}
                <div className="flex bg-white/5 p-1 rounded-lg border border-white/5 shrink-0">
                    <button onClick={() => setLang('es')} className={`px-2 py-1 text-xs font-black rounded transition-all ${lang === 'es' ? 'bg-brand-500 text-deep-950' : 'text-slate-500'}`}>ES</button>
                    <button onClick={() => setLang('en')} className={`px-2 py-1 text-xs font-black rounded transition-all ${lang === 'en' ? 'bg-brand-500 text-deep-950' : 'text-slate-500'}`}>EN</button>
                </div>

                <div className="hidden lg:flex flex-col items-end mr-2">
                    <span className="text-sm text-slate-500 font-bold uppercase">{t.systemStatus}</span>
                    <span className="text-sm text-brand-500 font-mono flex items-center gap-1">
                        {isTauri && <div className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-pulse"></div>}
                        {isTauri ? "DSP ENGINE: ONLINE" : t.encrypted}
                    </span>
                </div>

                <div className="px-2 py-1 rounded-full border border-white/5 bg-white/5 flex items-center gap-2 shrink-0">
                    <div className={`w-1.5 h-1.5 rounded-full ${status === 'ANALIZANDO' || isTranscribing ? 'bg-amber-400 animate-pulse' : 'bg-brand-500'}`}></div>
                    <span className="text-sm font-bold text-white uppercase hidden sm:block">{isTranscribing ? (lang === 'es' ? 'PROCESANDO' : 'PROCESSING') : status}</span>
                </div>

                {/* SETTINGS / LOGOUT */}
                <button
                    onClick={onResetApiKey}
                    className="p-3 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-rose-400 transition-colors"
                    title="Reset API Key"
                >
                    <LogOut size={20} />
                </button>
            </div>
        </header>
    );
};

export default Header;
