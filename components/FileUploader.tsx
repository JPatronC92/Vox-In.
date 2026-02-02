import React, { useRef } from 'react';
import { Upload } from 'lucide-react';
import { selectAudioFile } from '../services/tauriService';

interface FileUploaderProps {
    isTauri: boolean;
    onFileSelected: (blob: Blob) => void;
    label: string;
}

const FileUploader: React.FC<FileUploaderProps> = ({ isTauri, onFileSelected, label }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUploadClick = async () => {
        if (isTauri) {
            const blob = await selectAudioFile();
            if (blob) {
                onFileSelected(blob);
            }
        } else {
            fileInputRef.current?.click();
        }
    };

    return (
        <>
            <div onClick={handleUploadClick} className="flex flex-col items-center justify-center p-6 md:p-8 rounded-2xl border-2 border-dashed border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 active:scale-95 transition-all cursor-pointer">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-3">
                    <Upload size={24} />
                </div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest">{label}</span>
                <span className="text-[8px] text-slate-500 mt-1">WAV, MP3, M4A</span>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                    if (e.target.files?.[0]) {
                        onFileSelected(e.target.files[0]);
                    }
                }}
            />
        </>
    );
};

export default FileUploader;
