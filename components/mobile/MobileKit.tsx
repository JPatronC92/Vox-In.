
import React from 'react';
import { Layers, Activity, FileSearch } from 'lucide-react';

interface Props {
    activeTab: string;
    onChange: (tab: string) => void;
    lang: 'es' | 'en';
}

export const MobileBottomNav: React.FC<Props> = ({ activeTab, onChange, lang }) => {
    const tabs = [
        { id: 'AUDIO', icon: Layers, label: lang === 'es' ? 'Captura' : 'Capture' },
        { id: 'VISUAL', icon: Activity, label: lang === 'es' ? 'Visual' : 'Visual' },
        { id: 'RESULTADOS', icon: FileSearch, label: lang === 'es' ? 'Reporte' : 'Report' },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 h-20 mobile-glass z-50 pb-safe-area">
            <div className="flex justify-around items-center h-full px-2">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const Icon = tab.icon;

                    return (
                        <button
                            key={tab.id}
                            onClick={() => onChange(tab.id)}
                            className={`flex flex-col items-center justify-center w-full h-full gap-1 active:scale-95 transition-transform`}
                            aria-label={tab.label}
                            aria-selected={isActive}
                        >
                            <div className={`p-1.5 rounded-xl transition-colors ${isActive ? 'text-brand-400 bg-brand-500/10' : 'text-slate-500'}`}>
                                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-brand-400' : 'text-slate-500'}`}>
                                {tab.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};

export const MobileLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <div className="flex flex-col min-h-screen bg-deep-950 text-slate-100 font-sans selection:bg-brand-500/30 pb-24">
            <div className="fixed inset-0 cyber-grid pointer-events-none opacity-40"></div>
            <main className="flex-1 relative z-10 px-4 py-6 content-safe-area">
                {children}
            </main>
        </div>
    );
};

export const MobileCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <div className={`bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-5 shadow-lg ${className}`}>
        {children}
    </div>
);

export const ActionBtn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'danger' | 'ghost' }> = ({
    children,
    variant = 'primary',
    className = '',
    ...props
}) => {
    const variants = {
        primary: 'bg-gradient-to-br from-brand-500 to-brand-600 text-deep-950 shadow-[0_4px_20px_-4px_rgba(16,185,129,0.4)]',
        danger: 'bg-rose-500/10 border border-rose-500/50 text-rose-500',
        ghost: 'bg-white/5 text-slate-300 border border-white/5'
    };

    return (
        <button
            className={`h-14 w-full rounded-xl font-black text-sm uppercase tracking-[0.15em] flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 ${variants[variant]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};
