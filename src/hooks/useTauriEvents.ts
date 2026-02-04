import { useEffect } from 'react';
import { listenForSharedFiles } from '../services/tauriService';

interface UseTauriEventsProps {
  isTauri: boolean;
  onSharedFile: (blob: Blob) => void;
}

export const useTauriEvents = ({ isTauri, onSharedFile }: UseTauriEventsProps) => {
  useEffect(() => {
    if (!isTauri) return;

    let unlisten: (() => void) | null = null;

    const setupListener = async () => {
      try {
        unlisten = await listenForSharedFiles(async (urls) => {
          if (urls.length > 0) {
            try {
              const { readAudioFile } = await import('../services/tauriService');
              const blob = await readAudioFile(urls[0]);
              if (blob) {
                onSharedFile(blob);
              }
            } catch (error) {
              console.error('Failed to load shared file:', error);
            }
          }
        });
      } catch (error) {
        // Share intent not available (desktop mode)
      }
    };

    setupListener();

    return () => {
      if (unlisten) unlisten();
    };
  }, [isTauri, onSharedFile]);
};
