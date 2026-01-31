
import { GoogleGenAI, Type } from "@google/genai";
import { ForensicReport, Language } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function transcribeAudio(
  audioBase64: string,
  mimeType: string,
  lang: Language
): Promise<string> {
  const model = "gemini-2.5-flash-preview-05-20";
  const prompt = lang === 'es'
    ? "Transcribe este audio a texto de forma literal. Devuelve solo el texto."
    : "Transcribe this audio to text literally. Return only the text.";

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ inlineData: { data: audioBase64, mimeType } }, { text: prompt }] }],
    });
    return response.text?.trim() || (lang === 'es' ? "No se detectó voz." : "No voice detected.");
  } catch (error) {
    throw new Error(lang === 'es' ? "Error en transcripción." : "Transcription error.");
  }
}

export async function analyzeVoiceNote(
  audioBase64: string,
  mimeType: string,
  lang: Language,
  segment?: { start: number; end: number }
): Promise<ForensicReport> {
  const model = "gemini-2.5-pro-preview-05-06";

  const instruction = lang === 'es'
    ? `Eres un experto en análisis forense de audio. Tu tarea es analizar esta grabación para determinar:
       ${segment ? `Analiza solo de ${segment.start.toFixed(2)}s a ${segment.end.toFixed(2)}s.` : "Analiza la grabación completa."}
       
       1. DETECCIÓN DE HABLANTES: Identifica TODAS las personas presentes (incluyendo las que solo respiran o están en silencio).
       2. PERFIL POR HABLANTE: Para cada persona detectada, estima edad, género, estado emocional y nivel de estrés (0-100).
       3. DETECCIÓN DE EDICIÓN: Busca cortes, empalmes, discontinuidades o manipulaciones en el audio.
       4. DETECCIÓN DE DEEPFAKE: Evalúa si el audio podría ser generado por IA.
       5. ENTORNO: Describe el espacio y marcadores ambientales.
       
       IMPORTANTE: TODA LA RESPUESTA DEBE ESTAR EN ESPAÑOL.`
    : `You are an expert in audio forensic analysis. Your task is to analyze this recording to determine:
       ${segment ? `Analyze only from ${segment.start.toFixed(2)}s to ${segment.end.toFixed(2)}s.` : "Analyze the full recording."}
       
       1. SPEAKER DETECTION: Identify ALL people present (including those only breathing or silent).
       2. PROFILE PER SPEAKER: For each person detected, estimate age, gender, emotional state and stress level (0-100).
       3. EDIT DETECTION: Look for cuts, splices, discontinuities or manipulations in the audio.
       4. DEEPFAKE DETECTION: Evaluate if the audio could be AI-generated.
       5. ENVIRONMENT: Describe the space and environmental markers.
       
       IMPORTANT: THE ENTIRE RESPONSE MUST BE IN ENGLISH.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ inlineData: { data: audioBase64, mimeType } }, { text: instruction }] }],
      config: {
        thinkingConfig: { thinkingBudget: 32768 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            speakerCount: { type: Type.NUMBER },
            speakers: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.NUMBER },
                  ageEstimate: { type: Type.STRING },
                  gender: { type: Type.STRING },
                  emotionalState: { type: Type.STRING },
                  stressLevel: { type: Type.NUMBER },
                  speakingDuration: { type: Type.NUMBER },
                  detectedVia: { type: Type.STRING },
                }
              }
            },
            environmentProfile: {
              type: Type.OBJECT,
              properties: {
                roomType: { type: Type.STRING },
                environmentalMarkers: { type: Type.ARRAY, items: { type: Type.STRING } },
              }
            },
            anomalyDetection: {
              type: Type.OBJECT,
              properties: {
                overallScore: { type: Type.NUMBER },
                riskLevel: { type: Type.STRING },
                technicalFlags: { type: Type.ARRAY, items: { type: Type.STRING } },
                prosodicFlags: { type: Type.ARRAY, items: { type: Type.STRING } },
                emotionalFlags: { type: Type.ARRAY, items: { type: Type.STRING } },
                environmentalFlags: { type: Type.ARRAY, items: { type: Type.STRING } },
                spliceDetection: {
                  type: Type.OBJECT,
                  properties: {
                    cutsDetected: { type: Type.NUMBER },
                    timestamps: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                  }
                }
              }
            },
            deepfakeDetection: {
              type: Type.OBJECT,
              properties: {
                isDeepfake: { type: Type.BOOLEAN },
                confidenceScore: { type: Type.NUMBER },
                detectionFlags: { type: Type.ARRAY, items: { type: Type.STRING } },
              }
            },
            transcription: { type: Type.STRING },
            summary: { type: Type.STRING }
          }
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    throw new Error(lang === 'es' ? "Fallo en el análisis." : "Analysis failed.");
  }
}
