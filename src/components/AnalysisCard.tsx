import React, { memo } from 'react';

interface DataItem {
  label: string;
  value: React.ReactNode;
}

interface Props {
  icon: React.ReactNode;
  title: string;
  data: DataItem[];
  color: 'cyan' | 'amber' | 'slate' | 'red' | 'green' | 'indigo';
}

const AnalysisCard: React.FC<Props> = ({ icon, title, data, color }) => {
  const styles = {
    cyan: {
      border: 'border-cyan-500/20',
      bg: 'bg-cyan-500/5',
      icon: 'text-cyan-400',
      accent: 'bg-cyan-500',
    },
    amber: {
      border: 'border-amber-500/20',
      bg: 'bg-amber-500/5',
      icon: 'text-amber-400',
      accent: 'bg-amber-500',
    },
    slate: {
      border: 'border-white/10',
      bg: 'bg-white/5',
      icon: 'text-slate-400',
      accent: 'bg-slate-500',
    },
    red: {
      border: 'border-rose-500/20',
      bg: 'bg-rose-500/5',
      icon: 'text-rose-400',
      accent: 'bg-rose-500',
    },
    green: {
      border: 'border-brand-500/20',
      bg: 'bg-brand-500/5',
      icon: 'text-brand-500',
      accent: 'bg-brand-500',
    },
    indigo: {
      border: 'border-indigo-500/20',
      bg: 'bg-indigo-500/5',
      icon: 'text-indigo-400',
      accent: 'bg-indigo-500',
    },
  };

  const currentStyle = styles[color];

  return (
    <section
      className={`relative rounded-3xl p-6 border ${currentStyle.border} ${currentStyle.bg} transition-all duration-500 hover:shadow-2xl hover:-translate-y-1`}
    >
      <div className="flex items-center gap-3 mb-5">
        <div className={`p-2 rounded-lg bg-deep-950/50 ${currentStyle.icon}`}>
          {React.cloneElement(icon as React.ReactElement, { size: 18 })}
        </div>
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">{title}</h3>
      </div>

      <dl className="space-y-4">
        {data.map((item, idx) => (
          <div key={idx} className="flex flex-col gap-1 border-l-2 border-white/5 pl-3">
            <dt className="text-xs text-slate-500 font-black uppercase tracking-wider">
              {item.label}
            </dt>
            <dd className="text-sm text-white font-semibold tracking-tight">{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
};

export default memo(AnalysisCard);
