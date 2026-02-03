
export type Language = 'es' | 'en';

export type EmotionalState = 'calm' | 'stressed' | 'nervous' | 'angry' | 'happy' | 'sad' | 'neutral' | 'anxious';

export interface Speaker {
  id: number;
  ageEstimate: string;
  gender: string;
  emotionalState: EmotionalState;
  stressLevel: number; // 0-100
  speakingDuration?: number; // seconds
  detectedVia: 'voice' | 'breathing' | 'ambient';
}

export interface ForensicReport {
  speakerCount: number;
  speakers: Speaker[];
  environmentProfile: {
    roomType: string;
    environmentalMarkers: string[];
  };
  anomalyDetection: {
    overallScore: number;
    riskLevel: string;
    technicalFlags: string[];
    prosodicFlags: string[];
    emotionalFlags: string[];
    environmentalFlags: string[];
    spliceDetection: {
      cutsDetected: number;
      timestamps: number[];
    };
  };
  deepfakeDetection: {
    isDeepfake: boolean;
    confidenceScore: number;
    detectionFlags: string[];
  };
  transcription: string;
  summary: string;
}

export type AnalysisStatus = 'INACTIVO' | 'CARGANDO' | 'ESCANEO' | 'DECODIFICACION' | 'ANALIZANDO' | 'COMPLETADO' | 'ERROR';

export interface AudioMetadata {
  duration_seconds: number;
  sample_rate: number;
  channels: number;
  bits_per_sample: number;
  file_hash: string;
}

export interface LocalAnalysis {
  metadata: AudioMetadata;
  rms_level: number;
  peak_amplitude: number;
  silence_ratio: number;
  splice_timestamps: number[];
  waveform_data: number[];
}
