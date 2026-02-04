import React from 'react';
import {
  Activity,
  Database,
  FileAudio,
  Terminal,
  Target,
  Bot,
  Mic,
  Square,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { AnalysisStatus } from '../../types';
import Header from '../Header';
import FileUploader from '../FileUploader';
import PlaybackControls from '../PlaybackControls';
import WaveformVisualizer from '../WaveformVisualizer';
import Spectrogram from '../Spectrogram';
import AnalysisCard from '../AnalysisCard';
import DeepfakeAnalysisCard from '../DeepfakeAnalysisCard';
import LogFeed from '../LogFeed';
import TranscriptionCard from '../TranscriptionCard';
import MetadataCard from '../MetadataCard';
import SpeakerProfilesCard from '../SpeakerProfilesCard';
import SpliceDetectionCard from '../SpliceDetectionCard';

import { useLanguage } from '../../features/i18n/context/LanguageContext';
import { useAuth } from '../../features/auth/context/AuthContext';
import { useAudio } from '../../features/audio/context/AudioContext';

interface Props {
  status: AnalysisStatus;
  isTranscribing: boolean;

  // Recorder
  isRecording: boolean;
  startRecording: () => void;
  stopRecording: () => void;
  processAudioSource: (blob: Blob) => void;

  // Analysis
  report: any;
  localAnalysis: any;
  preTranscription: string;
  handleRunAnalysis: () => void;
  seekTo: (time: number) => void;

  // Selection
  selection: { start: number; end: number } | null;
  setSelection: (sel: { start: number; end: number } | null) => void;

  logs: string[];
}

export const DesktopView: React.FC<Props> = ({
  status,
  isTranscribing,
  isRecording,
  startRecording,
  stopRecording,
  processAudioSource,
  report,
  localAnalysis,
  preTranscription,
  handleRunAnalysis,
  seekTo,
  selection,
  setSelection,
  logs,
}) => {
  const { lang, t } = useLanguage();
  const { isTauri } = useAuth();
  const { audioRef, audioUrl, mimeType, fileHash, duration, isPlaying, setIsPlaying } = useAudio();

  return (
    <div className="flex flex-col h-screen bg-deep-950 text-slate-300 font-sans overflow-hidden">
      <div className="fixed inset-0 cyber-grid pointer-events-none"></div>

      <Header status={status} isTranscribing={isTranscribing} />

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
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${isRecording ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-800'}`}
                  >
                    {isRecording ? <Square fill="currentColor" size={20} /> : <Mic size={24} />}
                  </div>
                  <span className="text-xs font-extrabold uppercase tracking-widest">
                    {isRecording ? t.stop : t.record}
                  </span>
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
                      <p className="text-xs font-mono text-slate-500 truncate uppercase">
                        {mimeType}
                      </p>
                      <p className="text-base font-bold text-white truncate">
                        {t.file}_{fileHash?.slice(0, 6)}
                      </p>
                    </div>
                  </div>
                  <PlaybackControls
                    audioRef={audioRef}
                    isPlaying={isPlaying}
                    setIsPlaying={setIsPlaying}
                    duration={duration}
                  />
                </div>
              )}
            </section>

            {audioUrl && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                <div className="aspect-video enterprise-panel rounded-3xl overflow-hidden relative border border-white/5">
                  <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
                    <span className="text-xs font-black text-white bg-deep-950/80 px-2 py-1 rounded">
                      {t.monitorWave}
                    </span>
                  </div>
                  <WaveformVisualizer
                    active={isPlaying || isRecording}
                    audioUrl={audioUrl}
                    duration={duration}
                    markers={
                      report?.anomalyDetection.spliceDetection.timestamps ||
                      localAnalysis?.splice_timestamps
                    }
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
                    <span className="text-xs font-black text-white bg-deep-950/80 px-2 py-1 rounded">
                      {t.monitorSpectral}
                    </span>
                  </div>
                  <Spectrogram
                    active={isPlaying || isRecording}
                    editPoints={[]}
                    duration={duration}
                  />
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
                        <span className="text-sm font-bold uppercase tracking-widest">
                          {t.transcriptionProcessing}
                        </span>
                      </div>
                    ) : (
                      <div className="w-full">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">
                          {t.transcriptionTitle}
                        </h3>
                        <p className="text-base text-slate-200 truncate">
                          {preTranscription || '...'}
                        </p>
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
                    <div
                      className={`p-8 rounded-[2.5rem] border ${report.anomalyDetection.riskLevel === 'ALTO' || report.anomalyDetection.riskLevel === 'HIGH' ? 'border-rose-500/30 bg-rose-500/5' : 'border-brand-500/30 bg-brand-500/5'} shadow-2xl relative overflow-hidden`}
                    >
                      <div className="flex justify-between items-start mb-8">
                        <div>
                          <span className="text-xs font-black text-brand-500 uppercase tracking-[0.3em] transition-all hover:tracking-[0.4em] cursor-default">
                            {t.resultReport}
                          </span>
                          <h2 className="text-4xl font-extrabold text-white mt-3 leading-none tracking-tight">
                            {t.resultVerdict}{' '}
                            <span
                              className={
                                report.anomalyDetection.riskLevel === 'ALTO' ||
                                report.anomalyDetection.riskLevel === 'HIGH'
                                  ? 'text-rose-500'
                                  : 'text-brand-500'
                              }
                            >
                              {report.anomalyDetection.riskLevel}
                            </span>
                          </h2>
                        </div>
                        <div className="text-right">
                          <p
                            className={`text-6xl font-mono font-black ${report.anomalyDetection.riskLevel === 'ALTO' || report.anomalyDetection.riskLevel === 'HIGH' ? 'text-rose-500' : 'text-brand-500'}`}
                          >
                            {report.anomalyDetection.overallScore}
                          </p>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2">
                            {t.resultScore}
                          </p>
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
                      <DeepfakeAnalysisCard
                        isDeepfake={report.deepfakeDetection.isDeepfake}
                        confidenceScore={report.deepfakeDetection.confidenceScore}
                        detectionFlags={report.deepfakeDetection.detectionFlags}
                        lang={lang}
                      />
                    </div>

                    <SpeakerProfilesCard
                      speakers={report.speakers}
                      speakerCount={report.speakerCount}
                      lang={lang}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <AnalysisCard
                        icon={<Activity />}
                        title={t.envTitle}
                        data={[
                          { label: t.envSpace, value: report.environmentProfile.roomType },
                          {
                            label: t.envMarkers,
                            value:
                              report.environmentProfile.environmentalMarkers.join(', ') ||
                              t.envClean,
                          },
                        ]}
                        color="slate"
                      />
                      <MetadataCard
                        duration={duration}
                        sampleRate={localAnalysis?.metadata.sample_rate || 0}
                        channels={localAnalysis?.metadata.channels || 0}
                        mimeType={mimeType}
                        fileHash={fileHash}
                        lang={lang}
                      />
                    </div>

                    <TranscriptionCard text={report.transcription} lang={lang} />
                  </div>
                ) : (
                  <div className="h-96 enterprise-panel rounded-3xl border border-white/5 flex flex-col items-center justify-center opacity-40 border-dashed">
                    <Bot size={48} className="mb-4 text-slate-500" />
                    <p className="text-sm uppercase tracking-[0.2em] font-black text-slate-500">
                      {t.noData}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-30">
                <Database size={64} className="mb-6 text-slate-600" />
                <p className="text-base font-bold uppercase tracking-widest text-slate-500">
                  Esperando evidencia...
                </p>
              </div>
            )}

            <section className="enterprise-panel p-5 rounded-2xl h-48 flex flex-col overflow-hidden">
              <div className="flex items-center gap-2 mb-3 border-b border-white/5 pb-2 shrink-0">
                <Terminal size={14} className="text-slate-500" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  {t.consoleTitle}
                </h2>
              </div>
              <LogFeed logs={logs} />
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};
