import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { MobileLayout, MobileBottomNav } from '../components/mobile/MobileKit';
import { DesktopView } from '../components/desktop/DesktopView';
import OnboardingBYOK from '../components/OnboardingBYOK';
import Header from '../components/Header';

import { useLogger } from '../hooks/useLogger';
import { useRecorder } from '../hooks/useRecorder';
import { useAnalysis } from '../hooks/useAnalysis';
import { useTauriEvents } from '../hooks/useTauriEvents';
import { useAndroidBack } from '../hooks/useAndroidBack';

import { useLanguage } from '../features/i18n/context/LanguageContext';
import { useAuth } from '../features/auth/context/AuthContext';
import { useAudio } from '../features/audio/context/AudioContext';

export const RootLayout: React.FC = () => {
  const { lang, t } = useLanguage();
  const { hasApiKey, setHasApiKey, isTauri, handleResetApiKey } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  // Audio Context
  const audioController = useAudio();
  const {
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
  } = audioController;

  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);

  // Responsive State
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  // --- HOOKS ---
  const { logs, addLog } = useLogger();

  const {
    status,
    report,
    localAnalysis,
    setLocalAnalysis,
    preTranscription,
    isTranscribing,
    performLocalAnalysis,
    performASR,
    runAnalysis,
  } = useAnalysis({ addLog, lang, isTauri });

  const processAudioSource = async (blob: Blob) => {
    try {
      const base64 = await loadAudio(blob);
      setLocalAnalysis(null);
      addLog(t.okLoad);

      const hash = await performLocalAnalysis(base64);
      if (hash) setFileHash(hash);

      await performASR(base64, blob.type);
    } catch (e) {
      console.error(e);
      addLog('Error loading audio', true);
    }
  };

  const { isRecording, startRecording, stopRecording } = useRecorder({
    onRecordingComplete: processAudioSource,
    onError: (msg) => addLog(msg, true),
  });

  useTauriEvents({ isTauri, onSharedFile: processAudioSource });

  // --- EFFECTS ---
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Back Button Handling (Android)
  useAndroidBack(() => {
    if (location.pathname !== '/capture') {
      navigate('/capture');
      return true;
    }
    return false;
  });

  const handleRunAnalysis = async () => {
    if (currentBase64) {
      const success = await runAnalysis(currentBase64, mimeType, selection || undefined);
      if (success && isMobile) navigate('/report');
      // Desktop handles view state internally or stays on single page
    }
  };

  // --- RENDERING ---
  if (hasApiKey === null) {
    return (
      <div className="min-h-screen bg-deep-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  if (!hasApiKey) {
    return <OnboardingBYOK onComplete={() => setHasApiKey(true)} language={lang} />;
  }

  // --- MOBILE RENDER ---
  if (isMobile) {
    return (
      <>
        <Header status={status} isTranscribing={isTranscribing} />
        <MobileLayout>
          <Outlet
            context={{
              // Props for Views
              isRecording,
              startRecording,
              stopRecording,
              processAudioSource,

              report,
              localAnalysis,
              selection,
              setSelection,
              handleRunAnalysis,

              status,
              isTranscribing,
              preTranscription,
              seekTo,
              logs,
            }}
          />
        </MobileLayout>

        {/* Hidden Audio Player */}
        <div style={{ display: 'none' }}>
          <audio
            ref={audioRef}
            src={audioUrl || ''}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
          />
        </div>

        <MobileBottomNav />
      </>
    );
  }

  // --- DESKTOP RENDER ---
  return (
    <DesktopView
      status={status}
      isTranscribing={isTranscribing}
      isRecording={isRecording}
      startRecording={startRecording}
      stopRecording={stopRecording}
      processAudioSource={processAudioSource}
      report={report}
      localAnalysis={localAnalysis}
      preTranscription={preTranscription}
      handleRunAnalysis={handleRunAnalysis}
      seekTo={seekTo}
      selection={selection}
      setSelection={setSelection}
      logs={logs}
    />
  );
};
