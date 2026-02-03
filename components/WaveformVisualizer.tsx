
import React, { useEffect, useRef, useState, memo } from 'react';
import { Trash2 } from 'lucide-react';

interface Props {
  active: boolean;
  audioUrl: string | null;
  duration: number;
  markers?: number[];
  onSelectionChange?: (start: number, end: number) => void;
}

const WaveformVisualizer: React.FC<Props> = ({ active, audioUrl, duration, markers = [], onSelectionChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationId: number;
    let offset = 0;

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, width, height);

      // Grid sutil
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1;
      for (let i = 0; i < width; i += 40) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, height); ctx.stroke();
      }

      const path = new Path2D();
      const amplitude = active ? 60 : 2;

      path.moveTo(0, centerY);
      for (let x = 0; x < width; x += 2) {
        const noise = active ? (Math.random() - 0.5) * 40 : 0;
        const y = centerY + Math.sin(x * 0.05 + offset) * amplitude + noise;
        path.lineTo(x, y);
      }

      ctx.strokeStyle = active ? '#22c55e' : '#1e293b';
      ctx.lineWidth = 2;
      ctx.stroke(path);

      if (selection && duration > 0) {
        const xStart = (selection.start / duration) * width;
        const xEnd = (selection.end / duration) * width;
        ctx.fillStyle = 'rgba(34, 197, 94, 0.1)';
        ctx.fillRect(xStart, 0, xEnd - xStart, height);
        ctx.strokeStyle = '#22c55e';
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(xStart, 0, xEnd - xStart, height);
        ctx.setLineDash([]);
      }

      // Draw Splice Markers
      if (markers && markers.length > 0 && duration > 0) {
        ctx.strokeStyle = '#ef4444'; // rose-500
        ctx.lineWidth = 2;
        ctx.setLineDash([2, 2]);
        markers.forEach(ts => {
          const x = (ts / duration) * width;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        });
        ctx.setLineDash([]);
      }

      if (active) offset += 0.2;
      animationId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationId);
  }, [active, selection, duration, markers]);

  const handleStart = (clientX: number) => {
    if (!canvasRef.current || duration <= 0) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const time = (x / rect.width) * duration;
    dragStartRef.current = time;
    setIsDragging(true);
    setSelection({ start: time, end: time });
  };

  const handleMove = (clientX: number) => {
    if (!isDragging || !canvasRef.current || dragStartRef.current === null) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const currentTime = (x / rect.width) * duration;
    const start = Math.min(dragStartRef.current, currentTime);
    const end = Math.max(dragStartRef.current, currentTime);
    setSelection({ start, end });
    if (onSelectionChange) onSelectionChange(start, end);
  };

  return (
    <div className="w-full h-full relative group">
      <canvas
        ref={canvasRef}
        width={600}
        height={300}
        className="w-full h-full touch-none"
        onMouseDown={(e) => handleStart(e.clientX)}
        onMouseMove={(e) => handleMove(e.clientX)}
        onMouseUp={() => setIsDragging(false)}
        onTouchStart={(e) => handleStart(e.touches[0].clientX)}
        onTouchMove={(e) => handleMove(e.touches[0].clientX)}
        onTouchEnd={() => setIsDragging(false)}
      />
      {selection && (
        <button
          onClick={() => { setSelection(null); if (onSelectionChange) onSelectionChange(0, 0); }}
          className="absolute top-4 right-4 p-3 bg-slate-900 border border-slate-700 rounded-lg text-rose-500 shadow-2xl"
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
};

export default memo(WaveformVisualizer);
