
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  ShieldCheck,
  Activity,
  Upload,
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
import { ForensicReport, AnalysisStatus, Language } from './types';
import { analyzeVoiceNote, transcribeAudio } from './services/geminiService';
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

// Check if running in Tauri
const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('vox_lang');
    return (saved as Language) || 'es';
  });
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

  const t = translations[lang];

  // Check for API key on mount
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
        // Web mode: check localStorage
        const key = localStorage.getItem('gemini_api_key');
        setHasApiKey(!!key);
      }
    };
    checkApiKey();
  }, []);

  useEffect(() => {
    localStorage.setItem('vox_lang', lang);
  }, [lang]);

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

  const [activeTab, setActiveTab] = useState<string>('AUDIO');
  const [status, setStatus] = useState<AnalysisStatus>('INACTIVO');
  const [report, setReport] = useState<ForensicReport | null>(null);
  const [preTranscription, setPreTranscription] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [currentBase64, setCurrentBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('audio/mpeg');
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
  const [fileHash, setFileHash] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);

  const addLog = useCallback((msg: string, isError = false) => {
    setLogs(prev => [`${isError ? 'ERR' : 'OK'} // ${msg}`, ...prev].slice(0, 30));
  }, []);

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

    const arrayBuffer = await blob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    setFileHash(hashHex);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      setCurrentBase64(base64);
      addLog(t.okLoad);
      await performASR(base64, blob.type);
    };
    reader.readAsDataURL(blob);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' });
        await processAudioSource(blob);
        setStatus('INACTIVO');
      };
      recorder.start();
      setIsRecording(true);
      setStatus('ANALIZANDO');
      addLog(lang === 'es' ? "Capturando..." : "Capturing...");
    } catch (err) {
      addLog(t.errMic, true);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const runAnalysis = async (segment?: { start: number; end: number }) => {
    if (!currentBase64) return;
    setStatus('ANALIZANDO');
    addLog(t.analysisStart);
    try {
      const result = await analyzeVoiceNote(currentBase64, mimeType, lang, segment);
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

      {/* ENTERPRISE HEADER */}
      <header className="px-6 py-4 nav-blur border-b border-white/5 flex items-center justify-between z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center shadow-lg shadow-brand-500/20">
            <ShieldCheck className="w-5 h-5 text-deep-950" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-tight text-white leading-none">VOX INTELLIGENCE</h1>
            <p className="text-[9px] font-bold text-brand-500 tracking-[0.2em] mt-1">{t.unit}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* LANG SELECTOR */}
          <div className="flex bg-white/5 p-1 rounded-lg border border-white/5">
            <button onClick={() => setLang('es')} className={`px-2 py-1 text-[9px] font-black rounded transition-all ${lang === 'es' ? 'bg-brand-500 text-deep-950' : 'text-slate-500'}`}>ES</button>
            <button onClick={() => setLang('en')} className={`px-2 py-1 text-[9px] font-black rounded transition-all ${lang === 'en' ? 'bg-brand-500 text-deep-950' : 'text-slate-500'}`}>EN</button>
          </div>

          <div className="hidden md:flex flex-col items-end mr-2">
            <span className="text-[10px] text-slate-500 font-bold uppercase">{t.systemStatus}</span>
            <span className="text-[10px] text-brand-500 font-mono">{t.encrypted}</span>
          </div>
          <div className="px-3 py-1 rounded-full border border-white/5 bg-white/5 flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${status === 'ANALIZANDO' || isTranscribing ? 'bg-amber-400 animate-pulse' : 'bg-brand-500'}`}></div>
            <span className="text-[10px] font-bold text-white uppercase">{isTranscribing ? (lang === 'es' ? 'PROCESANDO' : 'PROCESSING') : status}</span>
          </div>
        </div>
      </header>

      <audio ref={audioRef} src={audioUrl || ''} onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} />

      <main className="flex-1 overflow-y-auto p-4 pb-32 z-10">
        <div className="max-w-xl mx-auto space-y-5">

          {activeTab === 'AUDIO' && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <section className="enterprise-panel p-6 rounded-3xl shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <Database size={16} className="text-brand-500" /> {t.audioSource}
                  </h2>
                  {fileHash && <CheckCircle2 size={16} className="text-brand-500" />}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`flex flex-col items-center justify-center p-8 rounded-2xl border-2 transition-all active:scale-95 ${isRecording ? 'bg-rose-500/10 border-rose-500 text-rose-500' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'}`}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${isRecording ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-800'}`}>
                      {isRecording ? <Square fill="currentColor" size={20} /> : <Mic size={24} />}
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest">{isRecording ? t.stop : t.record}</span>
                  </button>

                  <label className="flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 active:scale-95 transition-all cursor-pointer">
                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-3">
                      <Upload size={24} />
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest">{t.upload}</span>
                    <input type="file" className="hidden" accept="audio/*" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) processAudioSource(file);
                    }} />
                  </label>
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

              {audioUrl && (
                <div className="space-y-5 animate-in slide-in-from-top-4 duration-700">
                  <section className="enterprise-panel rounded-3xl overflow-hidden">
                    <div className="p-5 border-b border-white/5 flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300 flex items-center gap-2">
                        <MessageSquare size={16} className="text-indigo-400" /> {t.transcriptionTitle}
                      </h3>
                      {isTranscribing && <Loader2 size={16} className="text-brand-500 animate-spin" />}
                    </div>
                    <div className="p-6 bg-deep-950/40 min-h-[80px]">
                      <p className="text-sm text-slate-300 leading-relaxed font-medium">
                        {preTranscription || t.transcriptionProcessing}
                      </p>
                    </div>
                  </section>

                  <button
                    disabled={isTranscribing || status === 'ANALIZANDO'}
                    onClick={() => runAnalysis()}
                    className="w-full py-5 btn-primary text-deep-950 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all disabled:opacity-50"
                  >
                    {status === 'ANALIZANDO' ? t.auditProcessing : t.auditBtn}
                  </button>

                  <MetadataCard duration={duration} sampleRate={null} channels={null} mimeType={mimeType} fileHash={fileHash} lang={lang} />
                </div>
              )}

              <section className="enterprise-panel p-5 rounded-2xl h-48 flex flex-col">
                <div className="flex items-center gap-2 mb-3 border-b border-white/5 pb-2">
                  <Terminal size={14} className="text-slate-500" />
                  <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{t.consoleTitle}</h2>
                </div>
                <LogFeed logs={logs} />
              </section>
            </div>
          )}

          {activeTab === 'VISUAL' && (
            <div className="space-y-5 animate-in fade-in duration-500">
              <div className="aspect-video enterprise-panel rounded-3xl overflow-hidden relative border border-white/5">
                <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
                  <span className="text-[10px] font-black text-white bg-deep-950/80 px-2 py-1 rounded">{t.monitorWave}</span>
                </div>
                <WaveformVisualizer active={isPlaying || isRecording} audioUrl={audioUrl} duration={duration} onSelectionChange={(s, e) => setSelection({ start: s, end: e })} />
                {selection && (
                  <button
                    onClick={() => runAnalysis(selection)}
                    className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white text-deep-950 px-6 py-2.5 rounded-full font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-2xl active:scale-95 transition-all"
                  >
                    <Target size={16} /> {t.analyzeSegment}
                  </button>
                )}
              </div>

              <div className="aspect-video enterprise-panel rounded-3xl overflow-hidden relative border border-white/5">
                <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
                  <span className="text-[10px] font-black text-white bg-deep-950/80 px-2 py-1 rounded">{t.monitorSpectral}</span>
                </div>
                <Spectrogram active={isPlaying || isRecording} editPoints={[]} duration={duration} />
              </div>
            </div>
          )}

          {activeTab === 'RESULTADOS' && (
            <div className="space-y-6 animate-in slide-in-from-right duration-500">
              {!report ? (
                <div className="flex flex-col items-center justify-center py-32 opacity-20">
                  <Bot size={64} className="mb-4" />
                  <p className="text-xs uppercase tracking-[0.3em] font-black">{t.noData}</p>
                </div>
              ) : (
                <div className="pb-10">
                  <div className={`p-8 rounded-[2.5rem] border ${report.anomalyDetection.riskLevel === 'ALTO' || report.anomalyDetection.riskLevel === 'HIGH' ? 'border-rose-500/30 bg-rose-500/5' : 'border-brand-500/30 bg-brand-500/5'} shadow-2xl mb-6 relative overflow-hidden`}>
                    <div className="flex justify-between items-start mb-8">
                      <div>
                        <span className="text-[10px] font-black text-brand-500 uppercase tracking-[0.3em]">{t.resultReport}</span>
                        <h2 className="text-3xl font-extrabold text-white mt-2 leading-none">{t.resultVerdict}_{report.anomalyDetection.riskLevel}</h2>
                      </div>
                      <div className="text-right">
                        <p className={`text-5xl font-mono font-black ${report.anomalyDetection.riskLevel === 'ALTO' || report.anomalyDetection.riskLevel === 'HIGH' ? 'text-rose-500' : 'text-brand-500'}`}>{report.anomalyDetection.overallScore}</p>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">{t.resultScore}</p>
                      </div>
                    </div>
                    <div className="p-6 bg-black/40 rounded-3xl border border-white/5 italic text-sm text-slate-200">
                      "{report.summary}"
                    </div>
                  </div>

                  <DeepfakeAnalysisCard isDeepfake={report.deepfakeDetection.isDeepfake} confidenceScore={report.deepfakeDetection.confidenceScore} detectionFlags={report.deepfakeDetection.detectionFlags} lang={lang} />

                  <SpeakerProfilesCard speakers={report.speakers} speakerCount={report.speakerCount} lang={lang} />

                  <SpliceDetectionCard cutsDetected={report.anomalyDetection.spliceDetection.cutsDetected} timestamps={report.anomalyDetection.spliceDetection.timestamps} lang={lang} />

                  <div className="mt-6">
                    <AnalysisCard icon={<Activity />} title={t.envTitle} data={[
                      { label: t.envSpace, value: report.environmentProfile.roomType },
                      { label: t.envMarkers, value: report.environmentProfile.environmentalMarkers.join(', ') || t.envClean },
                    ]} color="slate" />
                  </div>

                  <div className="mt-6">
                    <TranscriptionCard text={report.transcription} lang={lang} />
                  </div>
                </div>
              )}
            </div>
          )}
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
