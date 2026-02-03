
import React, { useEffect, useRef, useState, memo, useCallback } from 'react';
import { Maximize2, Move, ZoomIn } from 'lucide-react';
import { Language } from '../types';

interface Props {
  active: boolean;
  editPoints?: number[];
  duration?: number;
  lang?: Language;
}

const getColorForIntensity = (intensity: number): string => {
  if (intensity < 0.15) return '#011401';
  if (intensity < 0.30) return '#003300';
  if (intensity < 0.45) return '#006400';
  if (intensity < 0.60) return '#f59e0b';
  if (intensity < 0.75) return '#ff8c00';
  if (intensity < 0.90) return '#ef4444';
  return '#f87171';
};

const Spectrogram: React.FC<Props> = ({ active, editPoints, duration = 0, lang = 'es' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [hoverData, setHoverData] = useState<{ x: number, y: number, freq: number, time: number } | null>(null);

  const lastMousePos = useRef<{ x: number, y: number } | null>(null);

  const t = {
    es: { freq: "Frecuencia", time: "Tiempo", hint: "Usa scroll para Zoom, arrastra para Desplazar" },
    en: { freq: "Frequency", time: "Time", hint: "Use scroll to Zoom, drag to Pan" }
  }[lang];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationId: number;

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Fondo base
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, width, height);

      // Simulación de espectrograma con soporte para Zoom/Pan
      // En una implementación real, aquí se procesarían los datos FFT del buffer
      const effectiveWidth = width * zoom;
      const startX = -offsetX;

      ctx.save();
      ctx.translate(startX, 0);

      if (active) {
        // Generamos un patrón visual dinámico que respeta el zoom
        for (let x = 0; x < width; x += 4 / zoom) {
          for (let y = 0; y < height; y += 4) {
            const intensity = Math.random() * Math.abs(Math.sin((x + Date.now() / 100) * 0.01));
            ctx.fillStyle = getColorForIntensity(intensity);
            ctx.fillRect(x * zoom, y, 4 * zoom, 4);
          }
        }
      } else {
        // Patrón estático para auditoría visual
        for (let x = 0; x < width; x += 8 / zoom) {
          const pseudoNoise = Math.sin(x * 0.02) * 0.5 + 0.5;
          for (let y = 0; y < height; y += 8) {
            const intensity = (Math.random() * 0.2) + (pseudoNoise * 0.3 * (1 - y / height));
            ctx.fillStyle = getColorForIntensity(intensity);
            ctx.fillRect(x * zoom, y, 8 * zoom, 8);
          }
        }
      }

      // Líneas de cuadrícula dinámicas
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 10; i++) {
        const xPos = (width / 10) * i * zoom;
        ctx.beginPath(); ctx.moveTo(xPos, 0); ctx.lineTo(xPos, height); ctx.stroke();
      }

      ctx.restore();

      // Marcas de Tiempo e Información de auditoría (Eje Y = Frecuencia)
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '11px JetBrains Mono';
      for (let i = 0; i <= 5; i++) {
        const freqLabel = `${(8000 - (i * 1600))} Hz`;
        ctx.fillText(freqLabel, 5, (height / 5) * i + 10);
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationId);
  }, [active, zoom, offsetX]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(1, Math.min(zoom * delta, 20));
    setZoom(newZoom);

    // Ajustar offset para que el zoom sea hacia el cursor
    if (newZoom === 1) setOffsetX(0);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Calcular frecuencia y tiempo basados en posición
    // Rango 0-8000Hz (Y invertido)
    const freq = Math.round(8000 * (1 - y / rect.height));
    // Tiempo relativo considerando offset y zoom
    const relativeX = (x + offsetX) / zoom;
    const time = duration > 0 ? (relativeX / rect.width) * duration : 0;

    setHoverData({ x, y, freq, time });

    if (isPanning && lastMousePos.current) {
      const dx = e.clientX - lastMousePos.current.x;
      const newOffset = offsetX - dx;
      const maxOffset = (rect.width * zoom) - rect.width;
      setOffsetX(Math.max(0, Math.min(newOffset, maxOffset)));
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    lastMousePos.current = null;
  };

  return (
    <div className="w-full h-full bg-slate-950 relative overflow-hidden group cursor-crosshair select-none">
      <canvas
        ref={canvasRef}
        width={800}
        height={300}
        className="w-full h-full opacity-90 transition-opacity"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { handleMouseUp(); setHoverData(null); }}
      />

      {/* TOOLTIP DINÁMICO */}
      {hoverData && (
        <div
          className="absolute pointer-events-none z-30 bg-deep-950/90 border border-brand-500/30 p-2 rounded-lg shadow-2xl backdrop-blur-md"
          style={{
            left: Math.min(hoverData.x + 15, 600),
            top: Math.min(hoverData.y + 15, 220)
          }}
        >
          <div className="flex flex-col gap-1">
            <div className="flex justify-between gap-4">
              <span className="text-xs font-black text-slate-500 uppercase">{t.freq}</span>
              <span className="text-sm font-mono text-brand-500">{hoverData.freq} Hz</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-xs font-black text-slate-500 uppercase">{t.time}</span>
              <span className="text-sm font-mono text-white">{hoverData.time.toFixed(3)}s</span>
            </div>
          </div>
        </div>
      )}

      {/* CONTROLES DE INTERACCIÓN */}
      <div className="absolute bottom-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="bg-deep-950/80 border border-white/10 px-3 py-1.5 rounded-full flex items-center gap-3 shadow-xl">
          <div className="flex items-center gap-1.5 border-r border-white/10 pr-3">
            <ZoomIn size={12} className="text-brand-500" />
            <span className="text-xs font-mono font-bold text-white">x{zoom.toFixed(1)}</span>
          </div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest hidden md:block">
            {t.hint}
          </span>
          <div className="flex gap-1">
            <Move size={12} className={isPanning ? 'text-brand-500' : 'text-slate-600'} />
          </div>
        </div>
      </div>

      {/* INDICADOR DE POSICIÓN X/Y */}
      {hoverData && (
        <>
          <div className="absolute top-0 bottom-0 border-l border-brand-500/20 pointer-events-none" style={{ left: hoverData.x }}></div>
          <div className="absolute left-0 right-0 border-t border-brand-500/20 pointer-events-none" style={{ top: hoverData.y }}></div>
        </>
      )}
    </div>
  );
};

export default memo(Spectrogram);
