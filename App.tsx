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
import WaveformVisualizer from './components/WaveformVisualizer';
import Spectrogram from './components/Spectrogram';
import AnalysisCard from './components/AnalysisCard';
import DeepfakeAnalysisCard from './components/DeepfakeAnalysisCard';
import LogFeed from './components/LogFeed';
import PlaybackControls from './components/PlaybackControls';
import TranscriptionCard from './components/TranscriptionCard';
import MetadataCard from './components/MetadataCard';
import SpeakerProfilesCard from './components/SpeakerProfilesCard';
import SpliceDetectionCard from './components/SpliceDetectionCard';
import OnboardingBYOK from './components/OnboardingBYOK';
import Header from './components/Header';
import FileUploader from './components/FileUploader';
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
      if (success) setActiveTab('RESULTADOS');
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

  return (
    <div className="flex flex-col h-screen bg-deep-950 text-slate-300 font-sans overflow-hidden">
      <div className="fixed inset-0 cyber-grid pointer-events-none"></div>

      <Header
        lang={lang}
        setLang={setLang}
        t={t}
        status={status}
        isTranscribing={isTranscribing}
        onResetApiKey={handleResetApiKey}
        isTauri={isTauri}
      />

      <audio
        ref={audioRef}
        src={audioUrl || ''}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />

      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-32 z-10 w-full no-scrollbar">
        <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start h-full">

          {/* LEFT PANEL */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-0 h-full">

            <section className="enterprise-panel p-4 md:p-6 rounded-3xl shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <Database size={16} className="text-brand-500" /> {t.audioSource}
                </h2>
                {fileHash && <CheckCircle2 size={16} className="text-brand-500" />}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`flex flex-col items-center justify-center p-6 md:p-8 rounded-2xl border-2 transition-all active:scale-95 ${isRecording ? 'bg-rose-500/10 border-rose-500 text-rose-500' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'}`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${isRecording ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-800'}`}>
                    {isRecording ? <Square fill="currentColor" size={20} /> : <Mic size={24} />}
                  </div>
                  <span className="text-xs font-extrabold uppercase tracking-widest">{isRecording ? t.stop : t.record}</span>
                </button>

                <FileUploader
                  isTauri={isTauri}
                  onFileSelected={processAudioSource}
                  label={t.upload}
                />
              </div>

              {audioUrl && (
                <div className="mt-6 p-5 bg-deep-950/80 rounded-2xl border border-white/5 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-brand-500/10 rounded-lg flex items-center justify-center">
                      <FileAudio className="text-brand-500 w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono text-slate-500 truncate uppercase">{mimeType}</p>
                      <p className="text-base font-bold text-white truncate">{t.file}_{fileHash?.slice(0, 6)}</p>
                    </div>
                  </div>
                  <PlaybackControls audioRef={audioRef} isPlaying={isPlaying} setIsPlaying={setIsPlaying} duration={duration} />
                </div>
              )}
            </section>

            {audioUrl && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                <div className="aspect-video enterprise-panel rounded-3xl overflow-hidden relative border border-white/5">
                  <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
                    <span className="text-xs font-black text-white bg-deep-950/80 px-2 py-1 rounded">{t.monitorWave}</span>
                  </div>
                  <WaveformVisualizer
                    active={isPlaying || isRecording}
                    audioUrl={audioUrl}
                    duration={duration}
                    markers={report?.anomalyDetection.spliceDetection.timestamps || localAnalysis?.splice_timestamps}
                    onSelectionChange={(s, e) => setSelection({ start: s, end: e })}
                  />
                  {selection && (
                    <button
                      onClick={handleRunAnalysis}
                      className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white text-deep-950 px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-2xl active:scale-95 transition-all"
                    >
                      <Target size={16} /> {t.analyzeSegment}
                    </button>
                  )}
                </div>
                <div className="aspect-[4/1] enterprise-panel rounded-3xl overflow-hidden relative border border-white/5">
                  <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
                    <span className="text-xs font-black text-white bg-deep-950/80 px-2 py-1 rounded">{t.monitorSpectral}</span>
                  </div>
                  <Spectrogram active={isPlaying || isRecording} editPoints={[]} duration={duration} />
                </div>
              </div>
            )}
          </div>

          {/* RIGHT PANEL */}
          <div className="lg:col-span-7 space-y-6">
            {audioUrl ? (
              <>
                <div className="flex gap-4 items-center">
                  <section className="enterprise-panel flex-1 rounded-2xl overflow-hidden flex items-center px-6 h-20">
                    {isTranscribing ? (
                      <div className="flex items-center gap-4 text-brand-500">
                        <Loader2 className="animate-spin" />
                        <span className="text-sm font-bold uppercase tracking-widest">{t.transcriptionProcessing}</span>
                      </div>
                    ) : (
                      <div className="w-full">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">{t.transcriptionTitle}</h3>
                        <p className="text-base text-slate-200 truncate">{preTranscription || "..."}</p>
                      </div>
                    )}
                  </section>

                  <button
                    disabled={isTranscribing || status === 'ANALIZANDO'}
                    onClick={handleRunAnalysis}
                    className="h-20 px-8 btn-primary text-deep-950 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all disabled:opacity-50 shadow-xl hover:shadow-brand-500/20 active:scale-95"
                  >
                    {status === 'ANALIZANDO' ? <Loader2 className="animate-spin" /> : t.auditBtn}
                  </button>
                </div>

                {report ? (
                  <div className="space-y-6 animate-in slide-in-from-right duration-500">
                    <div className={`p-8 rounded-[2.5rem] border ${report.anomalyDetection.riskLevel === 'ALTO' || report.anomalyDetection.riskLevel === 'HIGH' ? 'border-rose-500/30 bg-rose-500/5' : 'border-brand-500/30 bg-brand-500/5'} shadow-2xl relative overflow-hidden`}>
                      <div className="flex justify-between items-start mb-8">
                        <div>
                          <span className="text-xs font-black text-brand-500 uppercase tracking-[0.3em] transition-all hover:tracking-[0.4em] cursor-default">{t.resultReport}</span>
                          <h2 className="text-4xl font-extrabold text-white mt-3 leading-none tracking-tight">{t.resultVerdict} <span className={report.anomalyDetection.riskLevel === 'ALTO' || report.anomalyDetection.riskLevel === 'HIGH' ? 'text-rose-500' : 'text-brand-500'}>{report.anomalyDetection.riskLevel}</span></h2>
                        </div>
                        <div className="text-right">
                          <p className={`text-6xl font-mono font-black ${report.anomalyDetection.riskLevel === 'ALTO' || report.anomalyDetection.riskLevel === 'HIGH' ? 'text-rose-500' : 'text-brand-500'}`}>{report.anomalyDetection.overallScore}</p>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2">{t.resultScore}</p>
                        </div>
                      </div>
                      <div className="p-6 bg-black/40 rounded-3xl border border-white/5 italic text-base text-slate-300 leading-relaxed">
                        "{report.summary}"
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <SpliceDetectionCard
                        cutsDetected={report.anomalyDetection.spliceDetection.cutsDetected}
                        timestamps={report.anomalyDetection.spliceDetection.timestamps}
                        lang={lang}
                        onSeek={seekTo}
                      />
                      <DeepfakeAnalysisCard isDeepfake={report.deepfakeDetection.isDeepfake} confidenceScore={report.deepfakeDetection.confidenceScore} detectionFlags={report.deepfakeDetection.detectionFlags} lang={lang} />
                    </div>

                    <SpeakerProfilesCard speakers={report.speakers} speakerCount={report.speakerCount} lang={lang} />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <AnalysisCard icon={<Activity />} title={t.envTitle} data={[
                        { label: t.envSpace, value: report.environmentProfile.roomType },
                        { label: t.envMarkers, value: report.environmentProfile.environmentalMarkers.join(', ') || t.envClean },
                      ]} color="slate" />
                      <MetadataCard duration={duration} sampleRate={localAnalysis?.metadata.sample_rate || 0} channels={localAnalysis?.metadata.channels || 0} mimeType={mimeType} fileHash={fileHash} lang={lang} />
                    </div>

                    <TranscriptionCard text={report.transcription} lang={lang} />
                  </div>
                ) : (
                  <div className="h-96 enterprise-panel rounded-3xl border border-white/5 flex flex-col items-center justify-center opacity-40 border-dashed">
                    <Bot size={48} className="mb-4 text-slate-500" />
                    <p className="text-sm uppercase tracking-[0.2em] font-black text-slate-500">{t.noData}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-30">
                <Database size={64} className="mb-6 text-slate-600" />
                <p className="text-base font-bold uppercase tracking-widest text-slate-500">Esperando evidencia...</p>
              </div>
            )}

            <section className="enterprise-panel p-5 rounded-2xl h-48 flex flex-col overflow-hidden">
              <div className="flex items-center gap-2 mb-3 border-b border-white/5 pb-2 shrink-0">
                <Terminal size={14} className="text-slate-500" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">{t.consoleTitle}</h2>
              </div>
              <LogFeed logs={logs} />
            </section>
          </div>

        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 nav-blur border-t border-white/5 px-10 py-5 flex justify-between items-center z-[60] pb-12 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
        <NavButton active={activeTab === 'AUDIO'} icon={<Layers size={24} />} label={t.tabAudio} onClick={() => setActiveTab('AUDIO')} />
        <NavButton active={activeTab === 'VISUAL'} icon={<Activity size={24} />} label={t.tabVisual} onClick={() => setActiveTab('VISUAL')} />
        <NavButton active={activeTab === 'RESULTADOS'} icon={<FileSearch size={24} />} label={t.tabReport} onClick={() => setActiveTab('RESULTADOS')} />
      </nav>
    </div>
  );
};

const NavButton = ({ active, icon, label, onClick }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-2 transition-all ${active ? 'text-brand-500 scale-105' : 'text-slate-600'}`}>
    <div className={`p-3 rounded-2xl transition-all duration-300 ${active ? 'bg-brand-500/10 shadow-[0_0_30px_rgba(16,185,129,0.15)] ring-1 ring-brand-500/20' : ''}`}>
      {icon}
    </div>
    <span className={`text-sm font-black uppercase tracking-widest ${active ? 'opacity-100' : 'opacity-40'}`}>{label}</span>
  </button>
);

export default App;
