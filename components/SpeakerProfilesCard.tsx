import React from 'react';
import { Users, User, Mic, Wind } from 'lucide-react';
import { Speaker, Language } from '../types';

interface Props {
    speakers: Speaker[];
    speakerCount: number;
    lang: Language;
}

const translations = {
    es: {
        title: "Perfiles de Hablantes",
        detected: "detectados",
        speaker: "Hablante",
        age: "Edad",
        gender: "Género",
        emotion: "Estado",
        stress: "Estrés",
        detectedVia: "Detectado vía",
        voice: "Voz",
        breathing: "Respiración",
        ambient: "Ambiente",
    },
    en: {
        title: "Speaker Profiles",
        detected: "detected",
        speaker: "Speaker",
        age: "Age",
        gender: "Gender",
        emotion: "State",
        stress: "Stress",
        detectedVia: "Detected via",
        voice: "Voice",
        breathing: "Breathing",
        ambient: "Ambient",
    }
};

const emotionColors: Record<string, string> = {
    calm: 'bg-emerald-500/20 text-emerald-400',
    stressed: 'bg-rose-500/20 text-rose-400',
    nervous: 'bg-amber-500/20 text-amber-400',
    angry: 'bg-red-500/20 text-red-400',
    happy: 'bg-yellow-500/20 text-yellow-400',
    sad: 'bg-blue-500/20 text-blue-400',
    neutral: 'bg-slate-500/20 text-slate-400',
    anxious: 'bg-orange-500/20 text-orange-400',
};

const getDetectionIcon = (via: string) => {
    switch (via) {
        case 'voice': return <Mic size={12} />;
        case 'breathing': return <Wind size={12} />;
        default: return <User size={12} />;
    }
};

const SpeakerProfilesCard: React.FC<Props> = ({ speakers, speakerCount, lang }) => {
    const t = translations[lang];

    return (
        <section className="enterprise-panel rounded-3xl overflow-hidden">
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-300 flex items-center gap-2">
                    <Users size={16} className="text-indigo-400" /> {t.title}
                </h3>
                <span className="text-xs font-mono text-brand-500">{speakerCount} {t.detected}</span>
            </div>

            <div className="p-4 space-y-3">
                {speakers.map((speaker) => (
                    <div key={speaker.id} className="p-4 bg-deep-950/60 rounded-2xl border border-white/5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-500 font-bold text-base">
                                    {speaker.id}
                                </div>
                                <div>
                                    <p className="text-base font-bold text-white">{t.speaker} {speaker.id}</p>
                                    <p className="text-xs text-slate-500 flex items-center gap-1">
                                        {getDetectionIcon(speaker.detectedVia)} {t[speaker.detectedVia as keyof typeof t] || speaker.detectedVia}
                                    </p>
                                </div>
                            </div>
                            <div className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${emotionColors[speaker.emotionalState] || emotionColors.neutral}`}>
                                {speaker.emotionalState}
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="p-2 bg-white/5 rounded-lg">
                                <p className="text-xs text-slate-500 uppercase">{t.age}</p>
                                <p className="text-base font-bold text-white">{speaker.ageEstimate}</p>
                            </div>
                            <div className="p-2 bg-white/5 rounded-lg">
                                <p className="text-xs text-slate-500 uppercase">{t.gender}</p>
                                <p className="text-base font-bold text-white">{speaker.gender}</p>
                            </div>
                            <div className="p-2 bg-white/5 rounded-lg">
                                <p className="text-xs text-slate-500 uppercase">{t.stress}</p>
                                <div className="flex items-center justify-center gap-1">
                                    <p className={`text-base font-bold ${speaker.stressLevel > 70 ? 'text-rose-400' : speaker.stressLevel > 40 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                        {speaker.stressLevel}%
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default SpeakerProfilesCard;
