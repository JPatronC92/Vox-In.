
import React from 'react';
import { Database, CheckCircle2, Mic, Square, FileAudio } from 'lucide-react';
import FileUploader from '../../FileUploader';
import PlaybackControls from '../../PlaybackControls';
import { MobileCard, ActionBtn } from '../MobileKit';

interface Props {
    t: any;
    fileHash: string | null;
    isRecording: boolean;
    startRecording: () => void;
    stopRecording: () => void;
    isTauri: boolean;
    processAudioSource: (blob: Blob) => Promise<void>;
    audioUrl: string | null;
    mimeType: string | null;
    duration: number;
    isPlaying: boolean;
    setIsPlaying: (playing: boolean) => void;
    audioRef: React.RefObject<HTMLAudioElement>;
}

export const ViewCapture: React.FC<Props> = ({
    t, fileHash, isRecording, startRecording, stopRecording, isTauri,
    processAudioSource, audioUrl, mimeType, duration, isPlaying, setIsPlaying, audioRef
}) => {
    return (
        <div className="space-y-6 pb-20">
            <section>
                <div className="flex justify-between items-center mb-4 px-2">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-brand-400 flex items-center gap-2">
                        <Database size={16} /> {t.audioSource}
                    </h2>
                    {fileHash && <CheckCircle2 size={16} className="text-brand-500" />}
                </div>

                <MobileCard className="space-y-6">
                    <div className="flex flex-col gap-4">
                        <button
                            onClick={isRecording ? stopRecording : startRecording}
                            className={`w-40 h-40 mx-auto rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-rose-500/10 ring-4 ring-rose-500/20' : 'bg-gradient-to-br from-slate-800 to-slate-900 border border-white/5 shadow-2xl active:scale-95'}`}
                        >
                            <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-rose-500 text-white animate-pulse shadow-[0_0_50px_rgba(244,63,94,0.4)]' : 'bg-deep-950 text-brand-400 border border-brand-500/20'}`}>
                                {isRecording ? <Square fill="currentColor" size={32} /> : <Mic size={40} />}
                            </div>
                        </button>
                        <p className="text-center text-xs font-black uppercase tracking-widest text-slate-500">
                            {isRecording ? t.stop : 'Tap to Record'}
                        </p>
                    </div>

                    <div className="h-px bg-white/5 w-full my-4"></div>

                    <FileUploader
                        isTauri={isTauri}
                        onFileSelected={processAudioSource}
                        label={t.upload}
                    />
                </MobileCard>
            </section>

            {audioUrl && (
                <MobileCard>
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-brand-500/10 rounded-xl flex items-center justify-center shrink-0">
                            <FileAudio className="text-brand-500 w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-mono text-slate-500 truncate uppercase mb-1">{mimeType}</p>
                            <p className="text-sm font-bold text-white truncate break-all">{t.file}_{fileHash?.slice(0, 6)}</p>
                        </div>
                    </div>
                    <PlaybackControls
                        audioRef={audioRef}
                        isPlaying={isPlaying}
                        setIsPlaying={setIsPlaying}
                        duration={duration}
                    />
                </MobileCard>
            )}
        </div>
    );
};
