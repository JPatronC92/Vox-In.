import { useState } from 'react';
import { ForensicReport, AnalysisStatus, Language, LocalAnalysis } from '../types';
import { analyzeVoiceNote, transcribeAudio, analyzeAudioLocal } from '../services/tauriService';

interface UseAnalysisProps {
  addLog: (msg: string, isError?: boolean) => void;
  lang: Language;
  isTauri: boolean;
}

export const useAnalysis = ({ addLog, lang, isTauri }: UseAnalysisProps) => {
  const [status, setStatus] = useState<AnalysisStatus>('INACTIVO');
  const [report, setReport] = useState<ForensicReport | null>(null);
  const [localAnalysis, setLocalAnalysis] = useState<LocalAnalysis | null>(null);
  const [preTranscription, setPreTranscription] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const performLocalAnalysis = async (base64: string) => {
    if (isTauri) {
      addLog('Iniciando análisis local (Rust)...');
      try {
        const localResult = await analyzeAudioLocal(base64);
        if (localResult) {
          setLocalAnalysis(localResult);
          const hash = localResult.metadata.file_hash;
          addLog(`Análisis local completado. Hash: ${hash.substring(0, 8)}...`);
          return hash;
        } else {
          addLog('Aviso: Formato no soportado para análisis local profundo.', true);
          return null;
        }
      } catch (e) {
        console.error(e);
        addLog('Error en análisis local', true);
        return null;
      }
    }
    return null;
  };

  const performASR = async (base64: string, type: string) => {
    setIsTranscribing(true);
    setPreTranscription(null);
    try {
      const text = await transcribeAudio(base64, type, lang);
      setPreTranscription(text);
      addLog(lang === 'es' ? 'Transcripción lista.' : 'Transcription ready.');
    } catch (e) {
      addLog(lang === 'es' ? 'Error en ASR' : 'ASR Error', true);
    } finally {
      setIsTranscribing(false);
    }
  };

  const runAnalysis = async (
    currentBase64: string | null,
    mimeType: string,
    segment?: { start: number; end: number }
  ) => {
    if (!currentBase64) return;
    setStatus('ANALIZANDO');
    addLog(lang === 'es' ? 'Iniciando análisis forense...' : 'Starting forensic analysis...');
    try {
      const result = await analyzeVoiceNote(currentBase64, mimeType, lang, segment);

      // MERGE HYBRID DATA
      if (localAnalysis) {
        result.anomalyDetection.spliceDetection = {
          cutsDetected: localAnalysis.splice_timestamps.length,
          timestamps: localAnalysis.splice_timestamps,
        };

        result.anomalyDetection.technicalFlags.push(`RMS: ${localAnalysis.rms_level.toFixed(4)}`);
        result.anomalyDetection.technicalFlags.push(
          `Silence Ratio: ${(localAnalysis.silence_ratio * 100).toFixed(1)}%`
        );

        if (localAnalysis.rms_level < 0.05) {
          result.environmentProfile.environmentalMarkers.push(
            'Nivel de señal muy bajo (posible grabación lejana)'
          );
        }
      }

      setReport(result);
      setStatus('COMPLETADO');
      addLog(lang === 'es' ? 'Análisis finalizado.' : 'Analysis completed.');
      return true; // Indicate success to switch tabs
    } catch (e) {
      setStatus('ERROR');
      addLog(lang === 'es' ? 'Error de diagnóstico' : 'Diagnostic error', true);
      return false;
    }
  };

  return {
    status,
    setStatus,
    report,
    localAnalysis,
    setLocalAnalysis,
    preTranscription,
    isTranscribing,
    performLocalAnalysis,
    performASR,
    runAnalysis,
  };
};
