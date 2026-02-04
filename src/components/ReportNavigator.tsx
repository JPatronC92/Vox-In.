import React from 'react';
import { ShieldAlert, Fingerprint, Activity, FileText } from 'lucide-react';

interface Section {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface Props {
  sections: Section[];
}

const ReportNavigator: React.FC<Props> = ({ sections }) => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      const parentScroller = element.closest('.overflow-y-auto');

      if (parentScroller) {
        const elementRect = element.getBoundingClientRect();
        const parentRect = parentScroller.getBoundingClientRect();
        const scrollTop = parentScroller.scrollTop + elementRect.top - parentRect.top;

        const offset = 24; // A small offset to not stick right at the top

        parentScroller.scrollTo({
          top: scrollTop - offset,
          behavior: 'smooth',
        });
      } else {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  return (
    <nav className="glass-panel p-1.5 rounded-lg" aria-label="Navegación del Reporte">
      <ul className="flex items-center justify-around gap-1">
        {sections.map(({ id, label, icon }) => (
          <li key={id} className="flex-1 text-center">
            <a
              href={`#${id}`}
              onClick={(e) => handleClick(e, id)}
              className="flex flex-col items-center gap-1.5 text-slate-400 hover:text-green-300 hover:bg-green-500/10 transition-all group px-3 py-3 rounded-md w-full"
              title={label}
            >
              <div className="w-5 h-5" aria-hidden="true">
                {icon}
              </div>
              <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default ReportNavigator;
