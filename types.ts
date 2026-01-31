
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
