import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Activity,
  Fingerprint,
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
  MessageSquare,
  Globe
} from 'lucide-react';
import { ForensicReport, AnalysisStatus, Language, LocalAnalysis } from './types';
import { analyzeVoiceNote, transcribeAudio, listenForSharedFiles, isTauriEnvironment, resetApiKey, analyzeAudioLocal } from './services/tauriService';
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

// Check if running in Tauri
const isTauri = isTauriEnvironment();

const App: React.FC = () => {
  // ALL HOOKS MUST BE AT THE TOP - before any conditional returns
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('vox_lang');
    return (saved as Language) || 'es';
  });
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<string>('AUDIO');
  const [status, setStatus] = useState<AnalysisStatus>('INACTIVO');
  const [report, setReport] = useState<ForensicReport | null>(null);
  const [localAnalysis, setLocalAnalysis] = useState<LocalAnalysis | null>(null);
  const [preTranscription, setPreTranscription] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [currentBase64, setCurrentBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('audio/mpeg');
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
  const [fileHash, setFileHash] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const t = translations[lang];

  const addLog = useCallback((msg: string, isError = false) => {
    setLogs(prev => [`${isError ? 'ERR' : 'OK'} // ${msg}`, ...prev].slice(0, 30));
  }, []);

  // Check for API key on mount
  useEffect(() => {
    const checkApiKey = async () => {
      if (isTauri) {
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          const key = await invoke<string | null>('get_api_key');
          setHasApiKey(!!key);
        } catch {
          setHasApiKey(false); // Fallback for web dev
        }
      } else {
        setHasApiKey(true); // Web dev mode
      }
    };
    checkApiKey();
  }, []);

  useEffect(() => {
    localStorage.setItem('vox_lang', lang);
  }, [lang]);

  // Listen for shared intents (Deep Linking)
  useEffect(() => {
    if (!isTauri) return;

    let unlisten: (() => void) | null = null;

    const setupListener = async () => {
      try {
        unlisten = await listenForSharedFiles(async (urls) => {
          console.log('Received shared files:', urls);
          // Process the first audio URL
          if (urls.length > 0) {
            try {
              const response = await fetch(urls[0]);
              const blob = await response.blob();
              window.dispatchEvent(new CustomEvent('shared-audio', { detail: blob }));
            } catch (error) {
              console.error('Failed to fetch shared file:', error);
            }
          }
        });
      } catch (error) {
        // Share intent not available on desktop - this is expected
        console.log('Share intent not available (desktop mode):', error);
      }
    };

    setupListener();

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const handleResetApiKey = async () => {
    if (confirm(lang === 'es' ? '¿Eliminar API Key y salir?' : 'Delete API Key and Logout?')) {
      await resetApiKey();
      setHasApiKey(false);
      window.location.reload();
    }
  };

  // Show onboarding if no API key
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

  // Main app content starts here (after all hooks and conditional returns)

  const performASR = async (base64: string, type: string) => {
    setIsTranscribing(true);
    setPreTranscription(null);
    try {
      const text = await transcribeAudio(base64, type, lang);
      setPreTranscription(text);
      addLog(lang === 'es' ? "Transcripción lista." : "Transcription ready.");
    } catch (e) {
      addLog(lang === 'es' ? "Error en ASR" : "ASR Error", true);
    } finally {
      setIsTranscribing(false);
    }
  };

  const processAudioSource = async (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    setAudioUrl(url);
    setMimeType(blob.type);

    // Initial state reset
    setFileHash(null);
    setLocalAnalysis(null);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      setCurrentBase64(base64);
      addLog(t.okLoad);

      // HYBRID FLOW: Start Local Analysis immediate (Rust)
      if (isTauri) {
        addLog("Iniciando análisis local (Rust)...");
        try {
          const localResult = await analyzeAudioLocal(base64);
          if (localResult) {
            setLocalAnalysis(localResult);
            setFileHash(localResult.metadata.file_hash);
            addLog(`Análisis local completado. Hash: ${localResult.metadata.file_hash.substring(0, 8)}...`);
          } else {
            addLog("Aviso: Formato no soportado para análisis local profundo.", true);
          }
        } catch (e) {
          console.error(e);
          addLog("Error en análisis local", true);
        }
      }

      await performASR(base64, blob.type);
    };
    reader.readAsDataURL(blob);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        processAudioSource(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      addLog(t.micError, true);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };
  const seekTo = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = seconds;
      audioRef.current.play();
      setIsPlaying(true);
      addLog(`Seeking to: ${seconds.toFixed(2)}s`);
    }
  };

  const runAnalysis = async (segment?: { start: number; end: number }) => {
    if (!currentBase64) return;
    setStatus('ANALIZANDO');
    addLog(t.analysisStart);
    try {
      const result = await analyzeVoiceNote(currentBase64, mimeType, lang, segment);

      // MERGE HYBRID DATA: Overwrite AI hallucinations with Rust Hard Data if available
      if (localAnalysis) {
        // 1. Splice Detection (Real DSP vs AI Guess)
        result.anomalyDetection.spliceDetection = {
          cutsDetected: localAnalysis.splice_timestamps.length,
          timestamps: localAnalysis.splice_timestamps
        };

        // 2. Add Physical Metrics to Technical Flags
        result.anomalyDetection.technicalFlags.push(`RMS: ${localAnalysis.rms_level.toFixed(4)}`);
        result.anomalyDetection.technicalFlags.push(`Silence Ratio: ${(localAnalysis.silence_ratio * 100).toFixed(1)}%`);

        // 3. Environment Profile Augmentation
        if (localAnalysis.rms_level < 0.05) {
          result.environmentProfile.environmentalMarkers.push("Nivel de señal muy bajo (posible grabación lejana)");
        }
      }

      setReport(result);
      setStatus('COMPLETADO');
      setActiveTab('RESULTADOS');
      addLog(t.analysisEnd);
    } catch (e) {
      setStatus('ERROR');
      addLog(lang === 'es' ? "Error de diagnóstico" : "Diagnostic error", true);
    }
  };

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

      <audio ref={audioRef} src={audioUrl || ''} onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} />

      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-32 z-10 w-full no-scrollbar">
        <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start h-full">

          {/* LEFT PANEL: INPUT & VISUALS (Fixed on specific height in future, currently scroll) */}
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
                  <span className="text-[10px] font-extrabold uppercase tracking-widest">{isRecording ? t.stop : t.record}</span>
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
                      <p className="text-[10px] font-mono text-slate-500 truncate uppercase">{mimeType}</p>
                      <p className="text-sm font-bold text-white truncate">{t.file}_{fileHash?.slice(0, 6)}</p>
                    </div>
                  </div>
                  <PlaybackControls audioRef={audioRef} isPlaying={isPlaying} setIsPlaying={setIsPlaying} duration={duration} />
                </div>
              )}
            </section>

            {/* VISUALS SECTION - Now Always Visible on Desktop if Audio Exists */}
            {audioUrl && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                <div className="aspect-video enterprise-panel rounded-3xl overflow-hidden relative border border-white/5">
                  <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
                    <span className="text-[10px] font-black text-white bg-deep-950/80 px-2 py-1 rounded">{t.monitorWave}</span>
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
                      onClick={() => runAnalysis(selection)}
                      className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white text-deep-950 px-6 py-2.5 rounded-full font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-2xl active:scale-95 transition-all"
                    >
                      <Target size={16} /> {t.analyzeSegment}
                    </button>
                  )}
                </div>
                <div className="aspect-[4/1] enterprise-panel rounded-3xl overflow-hidden relative border border-white/5">
                  <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
                    <span className="text-[10px] font-black text-white bg-deep-950/80 px-2 py-1 rounded">{t.monitorSpectral}</span>
                  </div>
                  <Spectrogram active={isPlaying || isRecording} editPoints={[]} duration={duration} />
                </div>
              </div>
            )}
          </div>


          {/* RIGHT PANEL: ACTIONS & RESULTS */}
          <div className="lg:col-span-7 space-y-6">

            {audioUrl ? (
              <>
                {/* ACTION BAR */}
                <div className="flex gap-4 items-center">
                  <section className="enterprise-panel flex-1 rounded-2xl overflow-hidden flex items-center px-6 h-20">
                    {isTranscribing ? (
                      <div className="flex items-center gap-4 text-brand-500">
                        <Loader2 className="animate-spin" />
                        <span className="text-xs font-bold uppercase tracking-widest">{t.transcriptionProcessing}</span>
                      </div>
                    ) : (
                      <div className="w-full">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">{t.transcriptionTitle}</h3>
                        <p className="text-sm text-slate-200 truncate">{preTranscription || "..."}</p>
                      </div>
                    )}
                  </section>

                  <button
                    disabled={isTranscribing || status === 'ANALIZANDO'}
                    onClick={() => runAnalysis()}
                    className="h-20 px-8 btn-primary text-deep-950 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all disabled:opacity-50 shadow-xl hover:shadow-brand-500/20 active:scale-95"
                  >
                    {status === 'ANALIZANDO' ? <Loader2 className="animate-spin" /> : t.auditBtn}
                  </button>
                </div>

                {/* RESULTS AREA */}
                {report ? (
                  <div className="space-y-6 animate-in slide-in-from-right duration-500">
                    <div className={`p-8 rounded-[2.5rem] border ${report.anomalyDetection.riskLevel === 'ALTO' || report.anomalyDetection.riskLevel === 'HIGH' ? 'border-rose-500/30 bg-rose-500/5' : 'border-brand-500/30 bg-brand-500/5'} shadow-2xl relative overflow-hidden`}>
                      <div className="flex justify-between items-start mb-8">
                        <div>
                          <span className="text-[10px] font-black text-brand-500 uppercase tracking-[0.3em] transition-all hover:tracking-[0.4em] cursor-default">{t.resultReport}</span>
                          <h2 className="text-4xl font-extrabold text-white mt-3 leading-none tracking-tight">{t.resultVerdict} <span className={report.anomalyDetection.riskLevel === 'ALTO' || report.anomalyDetection.riskLevel === 'HIGH' ? 'text-rose-500' : 'text-brand-500'}>{report.anomalyDetection.riskLevel}</span></h2>
                        </div>
                        <div className="text-right">
                          <p className={`text-6xl font-mono font-black ${report.anomalyDetection.riskLevel === 'ALTO' || report.anomalyDetection.riskLevel === 'HIGH' ? 'text-rose-500' : 'text-brand-500'}`}>{report.anomalyDetection.overallScore}</p>
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-2">{t.resultScore}</p>
                        </div>
                      </div>
                      <div className="p-6 bg-black/40 rounded-3xl border border-white/5 italic text-sm text-slate-300 leading-relaxed">
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
                    <p className="text-xs uppercase tracking-[0.2em] font-black text-slate-500">{t.noData}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-30">
                <Database size={64} className="mb-6 text-slate-600" />
                <p className="text-sm font-bold uppercase tracking-widest text-slate-500">Esperando evidencia...</p>
              </div>
            )}

            <section className="enterprise-panel p-5 rounded-2xl h-48 flex flex-col overflow-hidden">
              <div className="flex items-center gap-2 mb-3 border-b border-white/5 pb-2 shrink-0">
                <Terminal size={14} className="text-slate-500" />
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{t.consoleTitle}</h2>
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
    <span className={`text-[10px] font-black uppercase tracking-widest ${active ? 'opacity-100' : 'opacity-40'}`}>{label}</span>
  </button>
);

export default App;
