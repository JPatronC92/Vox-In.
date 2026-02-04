import React from 'react';
import { Loader2, Activity, Bot } from 'lucide-react';
import SpliceDetectionCard from '../../SpliceDetectionCard';
import DeepfakeAnalysisCard from '../../DeepfakeAnalysisCard';
import SpeakerProfilesCard from '../../SpeakerProfilesCard';
import AnalysisCard from '../../AnalysisCard';
import MetadataCard from '../../MetadataCard';
import TranscriptionCard from '../../TranscriptionCard';
import LogFeed from '../../LogFeed';
import { ActionBtn, MobileCard } from '../MobileKit';

import { useLanguage } from '../../../features/i18n/context/LanguageContext';
import { useAudio } from '../../../features/audio/context/AudioContext';

interface Props {
  status: string;
  isTranscribing: boolean;
  preTranscription: string;
  handleRunAnalysis: () => void;
  report: any;
  seekTo: (time: number) => void;
  localAnalysis: any;
  logs: string[];
}

export const ViewReport: React.FC<Props> = ({
  status,
  isTranscribing,
  preTranscription,
  handleRunAnalysis,
  report,
  seekTo,
  localAnalysis,
  logs,
}) => {
  const { t, lang } = useLanguage();
  const { audioUrl, duration, mimeType, fileHash } = useAudio();

  if (!audioUrl)
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center opacity-40">
        <Bot size={48} className="mb-4 text-slate-500" />
        <p className="text-sm font-bold uppercase tracking-widest text-slate-500">Wait for Audio</p>
      </div>
    );

  return (
    <div className="space-y-6 pb-24">
      {/* Action Header */}
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          {isTranscribing ? (
            <div className="flex items-center gap-2 text-brand-500">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-xs font-bold uppercase tracking-widest">Processing...</span>
            </div>
          ) : (
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase text-slate-500">Transcription</span>
              <p className="text-xs text-slate-300 truncate max-w-[150px]">
                {preTranscription || 'Has not run'}
              </p>
            </div>
          )}
        </div>
        <div className="w-32">
          <ActionBtn
            onClick={handleRunAnalysis}
            disabled={isTranscribing || status === 'ANALIZANDO'}
            className="h-12 text-xs"
          >
            {status === 'ANALIZANDO' ? <Loader2 className="animate-spin" /> : t.auditBtn}
          </ActionBtn>
        </div>
      </div>

      {report ? (
        <div className="space-y-6 animate-in slide-in-from-bottom duration-500">
          {/* Verdict Card */}
          <div
            className={`p-6 rounded-3xl border ${report.anomalyDetection.riskLevel === 'ALTO' || report.anomalyDetection.riskLevel === 'HIGH' ? 'border-rose-500/30 bg-rose-500/5' : 'border-brand-500/30 bg-brand-500/5'} shadow-xl`}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em]">
                  {t.resultReport}
                </span>
                <h2 className="text-2xl font-extrabold text-white mt-2 leading-none">
                  {t.resultVerdict} <br />
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
                  className={`text-4xl font-mono font-black ${report.anomalyDetection.riskLevel === 'ALTO' || report.anomalyDetection.riskLevel === 'HIGH' ? 'text-rose-500' : 'text-brand-500'}`}
                >
                  {report.anomalyDetection.overallScore}
                </p>
              </div>
            </div>
            <div className="p-4 bg-black/40 rounded-2xl border border-white/5 text-sm text-slate-300 italic">
              "{report.summary}"
            </div>
          </div>

          <DeepfakeAnalysisCard
            isDeepfake={report.deepfakeDetection.isDeepfake}
            confidenceScore={report.deepfakeDetection.confidenceScore}
            detectionFlags={report.deepfakeDetection.detectionFlags}
            lang={lang}
          />

          <SpliceDetectionCard
            cutsDetected={report.anomalyDetection.spliceDetection.cutsDetected}
            timestamps={report.anomalyDetection.spliceDetection.timestamps}
            lang={lang}
            onSeek={seekTo}
          />

          <SpeakerProfilesCard
            speakers={report.speakers}
            speakerCount={report.speakerCount}
            lang={lang}
          />

          <AnalysisCard
            icon={<Activity />}
            title={t.envTitle}
            data={[
              { label: t.envSpace, value: report.environmentProfile.roomType },
              {
                label: t.envMarkers,
                value: report.environmentProfile.environmentalMarkers.join(', ') || t.envClean,
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

          <TranscriptionCard text={report.transcription} lang={lang} />
        </div>
      ) : (
        <MobileCard className="h-40 flex flex-col items-center justify-center opacity-40 border-dashed">
          <Bot size={32} className="mb-2 text-slate-500" />
          <p className="text-xs uppercase tracking-widest text-slate-500">{t.noData}</p>
        </MobileCard>
      )}

      {/* Mini Logs */}
      <div className="bg-black/40 rounded-xl p-4 h-32 overflow-hidden text-[10px] font-mono border border-white/5">
        <LogFeed logs={logs} />
      </div>
    </div>
  );
};
