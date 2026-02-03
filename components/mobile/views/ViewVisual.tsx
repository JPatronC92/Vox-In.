
import React from 'react';
import { Target } from 'lucide-react';
import WaveformVisualizer from '../../WaveformVisualizer';
import Spectrogram from '../../Spectrogram';
import { MobileCard, ActionBtn } from '../MobileKit';

interface Props {
    t: any;
    audioUrl: string | null;
    isPlaying: boolean;
    isRecording: boolean;
    duration: number;
    report: any;
    localAnalysis: any;
    selection: { start: number; end: number } | null;
    setSelection: (sel: { start: number; end: number } | null) => void;
    handleRunAnalysis: () => void;
}

export const ViewVisual: React.FC<Props> = ({
    t, audioUrl, isPlaying, isRecording, duration, report, localAnalysis,
    selection, setSelection, handleRunAnalysis
}) => {
    if (!audioUrl) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center opacity-40">
                <p className="text-sm font-bold uppercase tracking-widest text-slate-500 text-center px-8">
                    {t.noData || "Load audio to see visuals"}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4 pb-20">
            <div className="relative">
                <div className="absolute top-4 left-4 z-20">
                    <span className="text-[10px] font-black text-white bg-deep-950/80 px-2 py-1 rounded backdrop-blur">WAVEFORM</span>
                </div>
                <div className="h-48 rounded-3xl overflow-hidden border border-white/5 bg-deep-950/50">
                    <WaveformVisualizer
                        active={isPlaying || isRecording}
                        audioUrl={audioUrl}
                        duration={duration}
                        markers={report?.anomalyDetection.spliceDetection.timestamps || localAnalysis?.splice_timestamps}
                        onSelectionChange={(s, e) => setSelection({ start: s, end: e })}
                    />
                </div>
            </div>

            <div className="relative">
                <div className="absolute top-4 left-4 z-20">
                    <span className="text-[10px] font-black text-white bg-deep-950/80 px-2 py-1 rounded backdrop-blur">SPECTRAL</span>
                </div>
                <div className="h-32 rounded-3xl overflow-hidden border border-white/5 bg-deep-950/50">
                    <Spectrogram active={isPlaying || isRecording} editPoints={[]} duration={duration} />
                </div>
            </div>

            {selection && (
                <div className="sticky bottom-24 px-4">
                    <ActionBtn onClick={handleRunAnalysis}>
                        <Target size={18} /> {t.analyzeSegment}
                    </ActionBtn>
                </div>
            )}
        </div>
    );
};
