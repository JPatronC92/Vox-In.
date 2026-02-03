
import React, { useEffect, useRef, memo } from 'react';

interface Props {
  logs: string[];
}

const LogFeed: React.FC<Props> = ({ logs }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [logs]);

  return (
    <div
      ref={scrollRef}
      className="h-full overflow-y-auto font-mono text-xs space-y-1 pr-2 scroll-smooth"
      role="log"
      aria-live="polite"
      aria-atomic="false"
      aria-label="Registros de actividad del sistema"
    >
      {logs.length === 0 && (
        <div className="text-slate-700 italic">SISTEMA INACTIVO // ESPERANDO INICIO DE SESIÓN...</div>
      )}
      {logs.map((log, i) => {
        const isError = log.includes("!! ERROR:");
        return (
          <div
            key={i}
            className={`${isError
                ? 'text-rose-500 font-bold border-rose-900/50'
                : (i === 0 ? 'text-green-400' : 'text-slate-500')
              } border-l border-slate-800 pl-2 leading-tight`}
          >
            {log}
          </div>
        );
      })}
    </div>
  );
};

export default memo(LogFeed);