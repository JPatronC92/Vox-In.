import React, { useState, useEffect } from 'react';
import {
  Activity,
  Database,
  FileAudio,
  Terminal,
  Target,
  Bot,
  Mic,
  Square,
  Layers,
  FileSearch,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { Language } from './types';
import { isTauriEnvironment, resetApiKey } from './services/tauriService';
import { translations } from './i18n/translations';

import { MobileLayout, MobileBottomNav } from './components/mobile/MobileKit';
import { ViewCapture } from './components/mobile/views/ViewCapture';
import { ViewVisual } from './components/mobile/views/ViewVisual';
import { ViewReport } from './components/mobile/views/ViewReport';
import { DesktopView } from './components/desktop/DesktopView';
import OnboardingBYOK from './components/OnboardingBYOK';
import Header from './components/Header';

import { useLogger } from './hooks/useLogger';
import { useRecorder } from './hooks/useRecorder';
import { useAudioController } from './hooks/useAudioController';
import { useAnalysis } from './hooks/useAnalysis';
import { useTauriEvents } from './hooks/useTauriEvents';
import { useAndroidBack } from './hooks/useAndroidBack';

// Check if running in Tauri
const isTauri = isTauriEnvironment();

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('vox_lang');
    return (saved as Language) || 'es';
  });
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<string>('AUDIO');
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);

  // Responsive State
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  const t = translations[lang];

  // --- HOOKS ---
  const { logs, addLog } = useLogger();

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
    handleLoadedMetadata
  } = useAudioController();

  const {
    status,
    report,
    localAnalysis,
    setLocalAnalysis,
    preTranscription,
    isTranscribing,
    performLocalAnalysis,
    performASR,
    runAnalysis
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
      addLog("Error loading audio", true);
    }
  };

  const { isRecording, startRecording, stopRecording } = useRecorder({
    onRecordingComplete: processAudioSource,
    onError: (msg) => addLog(msg, true)
  });

  useTauriEvents({ isTauri, onSharedFile: processAudioSource });

  // --- EFFECTS ---
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const checkApiKey = async () => {
      if (isTauri) {
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          const key = await invoke<string | null>('get_api_key');
          setHasApiKey(!!key);
        } catch {
          setHasApiKey(false);
        }
      } else {
        setHasApiKey(true);
      }
    };
    checkApiKey();
  }, []);

  useEffect(() => {
    localStorage.setItem('vox_lang', lang);
  }, [lang]);

  // Back Button Handling (Android)
  useAndroidBack(() => {
    if (activeTab !== 'AUDIO') {
      setActiveTab('AUDIO');
      return true; // Prevent exit, go to home tab
    }
    // If in AUDIO tab and no critical state, allow exit
    return false;
  });

  const handleResetApiKey = async () => {
    if (confirm(lang === 'es' ? '¿Eliminar API Key y salir?' : 'Delete API Key and Logout?')) {
      await resetApiKey();
      setHasApiKey(false);
      window.location.reload();
    }
  };

  const handleRunAnalysis = async () => {
    if (currentBase64) {
      const success = await runAnalysis(currentBase64, mimeType, selection || undefined);
      if (success && isMobile) setActiveTab('RESULTADOS'); // Auto-switch on mobile
      if (!isMobile && success) {
        // Desktop might not need explicit tab switch if unified, but keeping behavior similar
        setActiveTab('RESULTADOS');
      }
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
        <Header
          lang={lang}
          setLang={setLang}
          t={t}
          status={status}
          isTranscribing={isTranscribing}
          onResetApiKey={handleResetApiKey}
          isTauri={isTauri}
        />
        <MobileLayout>
          {activeTab === 'AUDIO' && (
            <ViewCapture
              t={t}
              fileHash={fileHash}
              isRecording={isRecording}
              startRecording={startRecording}
              stopRecording={stopRecording}
              isTauri={isTauri}
              processAudioSource={processAudioSource}
              audioUrl={audioUrl}
              mimeType={mimeType}
              duration={duration}
              isPlaying={isPlaying}
              setIsPlaying={setIsPlaying}
              audioRef={audioRef}
            />
          )}

          {activeTab === 'VISUAL' && (
            <ViewVisual
              t={t}
              audioUrl={audioUrl}
              isPlaying={isPlaying}
              isRecording={isRecording}
              duration={duration}
              report={report}
              localAnalysis={localAnalysis}
              selection={selection}
              setSelection={setSelection}
              handleRunAnalysis={handleRunAnalysis}
            />
          )}

          {activeTab === 'RESULTADOS' && (
            <ViewReport
              t={t}
              status={status}
              isTranscribing={isTranscribing}
              preTranscription={preTranscription}
              handleRunAnalysis={handleRunAnalysis}
              report={report}
              lang={lang}
              seekTo={seekTo}
              localAnalysis={localAnalysis}
              duration={duration}
              mimeType={mimeType}
              fileHash={fileHash}
              logs={logs}
              audioUrl={audioUrl}
            />
          )}
        </MobileLayout>

        {/* Hidden Audio Player for persisting playback across tabs if needed, 
            but ViewCapture has the player ref. To play in background while on Visual tab, 
            audio element should be hoisted. */}
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

        <MobileBottomNav activeTab={activeTab} onChange={setActiveTab} lang={lang} />
      </>
    );
  }

  // --- DESKTOP RENDER ---
  return (
    <DesktopView
      lang={lang}
      setLang={setLang}
      t={t}
      status={status}
      isTranscribing={isTranscribing}
      onResetApiKey={handleResetApiKey}
      isTauri={isTauri}

      audioRef={audioRef}
      audioUrl={audioUrl}
      mimeType={mimeType}
      fileHash={fileHash}
      duration={duration}
      isPlaying={isPlaying}
      setIsPlaying={setIsPlaying}

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

export default App;


