import { useState, useRef, useCallback, SyntheticEvent } from 'react';

export const useAudioController = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('audio/mpeg');
  const [currentBase64, setCurrentBase64] = useState<string | null>(null);
  const [fileHash, setFileHash] = useState<string | null>(null);

  const loadAudio = useCallback(
    (blob: Blob) => {
      // Cleanup previous URL
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }

      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      setMimeType(blob.type);
      setFileHash(null); // Reset hash on new load
      setIsPlaying(false);
      setDuration(0); // Reset duration until metadata loads

      // Read as Base64 for analysis
      const reader = new FileReader();
      return new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          setCurrentBase64(base64);
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    },
    [audioUrl]
  );

  const togglePlay = useCallback(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  const seekTo = useCallback(
    (seconds: number) => {
      if (audioRef.current) {
        audioRef.current.currentTime = seconds;
        if (!isPlaying) {
          audioRef.current.play();
          setIsPlaying(true);
        }
      }
    },
    [isPlaying]
  );

  const handleTimeUpdate = useCallback(() => {
    // Optional: Could expose current time here if needed for UI,
    // currently handled by components directly or WaveformVisualizer
  }, []);

  const handleLoadedMetadata = useCallback((e: SyntheticEvent<HTMLAudioElement>) => {
    setDuration(e.currentTarget.duration);
  }, []);

  return {
    audioRef,
    audioUrl,
    mimeType,
    currentBase64,
    fileHash,
    setFileHash,
    isPlaying,
    setIsPlaying,
    duration,
    loadAudio,
    togglePlay,
    seekTo,
    handleLoadedMetadata,
  };
};
