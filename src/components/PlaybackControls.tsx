import React, { useState, useEffect, memo } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';

interface Props {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  duration: number;
}

const PlaybackControls: React.FC<Props> = ({ audioRef, isPlaying, setIsPlaying, duration }) => {
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, [audioRef, setIsPlaying]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || time === Infinity) {
      return '00:00';
    }
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className="mt-2 p-3 bg-slate-900/70 border border-slate-800 rounded-lg"
      aria-label="Controles de reproducción de audio"
    >
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={togglePlay}
          className="p-4 bg-green-600/20 hover:bg-green-600/40 border border-green-500/30 rounded-full text-green-300 transition-all focus:ring-2 focus:ring-green-500 focus:outline-none shadow-lg shadow-green-900/50"
          aria-label={isPlaying ? 'Pausar audio' : 'Reproducir audio'}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5" aria-hidden="true" />
          ) : (
            <Play className="w-5 h-5 fill-green-300" aria-hidden="true" />
          )}
        </button>
        <div className="flex-grow flex items-center gap-3">
          <span className="text-sm font-mono text-slate-400" aria-hidden="true">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min="0"
            max={duration || 0}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 accent-green-500 bg-slate-800 rounded-full appearance-none cursor-pointer focus:ring-2 focus:ring-green-500"
            aria-label="Barra de búsqueda de tiempo en el audio"
            aria-valuetext={`${formatTime(currentTime)} de ${formatTime(duration)}`}
          />
          <span className="text-sm font-mono text-slate-500" aria-hidden="true">
            {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default memo(PlaybackControls);
