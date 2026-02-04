import React, { createContext, useContext, ReactNode } from 'react';
import { useAudioController } from '../../../hooks/useAudioController';

// Return type extraction helper
type AudioControllerType = ReturnType<typeof useAudioController>;

const AudioContext = createContext<AudioControllerType | undefined>(undefined);

export const AudioProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const audioController = useAudioController();

  return <AudioContext.Provider value={audioController}>{children}</AudioContext.Provider>;
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};
