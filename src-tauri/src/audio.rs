use base64::{engine::general_purpose::STANDARD, Engine};
use hound::WavReader;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::io::Cursor;
use tauri::{command, AppHandle};
use tauri_plugin_store::StoreExt;

const STORE_FILE: &str = "vox_config.json";
const API_KEY_STORE_KEY: &str = "gemini_api_key";

/// Audio metadata extracted by Rust
#[derive(Debug, Serialize, Deserialize)]
pub struct AudioMetadata {
    pub duration_seconds: f32,
    pub sample_rate: u32,
    pub channels: u16,
    pub bits_per_sample: u16,
    pub file_hash: String,
}

/// Local analysis results from Rust processing
#[derive(Debug, Serialize, Deserialize)]
pub struct LocalAnalysis {
    pub metadata: AudioMetadata,
    pub rms_level: f32,
    pub peak_amplitude: f32,
    pub silence_ratio: f32,
    pub splice_timestamps: Vec<f32>,
    pub waveform_data: Vec<f32>,
}

/// Speaker profile from Gemini analysis
#[derive(Debug, Serialize, Deserialize)]
pub struct Speaker {
    pub id: i32,
    #[serde(rename = "ageEstimate")]
    pub age_estimate: String,
    pub gender: String,
    #[serde(rename = "emotionalState")]
    pub emotional_state: String,
    #[serde(rename = "stressLevel")]
    pub stress_level: i32,
    #[serde(rename = "speakingDuration")]
    pub speaking_duration: Option<f32>,
    #[serde(rename = "detectedVia")]
    pub detected_via: String,
}

/// Environment profile
#[derive(Debug, Serialize, Deserialize)]
pub struct EnvironmentProfile {
    #[serde(rename = "roomType")]
    pub room_type: String,
    #[serde(rename = "environmentalMarkers")]
    pub environmental_markers: Vec<String>,
}

/// Splice detection results
#[derive(Debug, Serialize, Deserialize)]
pub struct SpliceDetection {
    #[serde(rename = "cutsDetected")]
    pub cuts_detected: i32,
    pub timestamps: Vec<f32>,
}

/// Anomaly detection results
#[derive(Debug, Serialize, Deserialize)]
pub struct AnomalyDetection {
    #[serde(rename = "overallScore")]
    pub overall_score: i32,
    #[serde(rename = "riskLevel")]
    pub risk_level: String,
    #[serde(rename = "technicalFlags")]
    pub technical_flags: Vec<String>,
    #[serde(rename = "prosodicFlags")]
    pub prosodic_flags: Vec<String>,
    #[serde(rename = "emotionalFlags")]
    pub emotional_flags: Vec<String>,
    #[serde(rename = "environmentalFlags")]
    pub environmental_flags: Vec<String>,
    #[serde(rename = "spliceDetection")]
    pub splice_detection: SpliceDetection,
}

/// Deepfake detection results
#[derive(Debug, Serialize, Deserialize)]
pub struct DeepfakeDetection {
    #[serde(rename = "isDeepfake")]
    pub is_deepfake: bool,
    #[serde(rename = "confidenceScore")]
    pub confidence_score: i32,
    #[serde(rename = "detectionFlags")]
    pub detection_flags: Vec<String>,
}

/// Complete forensic report matching TypeScript interface
#[derive(Debug, Serialize, Deserialize)]
pub struct ForensicReport {
    #[serde(rename = "speakerCount")]
    pub speaker_count: i32,
    pub speakers: Vec<Speaker>,
    #[serde(rename = "environmentProfile")]
    pub environment_profile: EnvironmentProfile,
    #[serde(rename = "anomalyDetection")]
    pub anomaly_detection: AnomalyDetection,
    #[serde(rename = "deepfakeDetection")]
    pub deepfake_detection: DeepfakeDetection,
    pub transcription: String,
    pub summary: String,
}

/// Get API key from secure storage
fn get_api_key_from_store(app: &AppHandle) -> Result<String, String> {
    let store = app
        .store(STORE_FILE)
        .map_err(|e| format!("Failed to open store: {}", e))?;

    match store.get(API_KEY_STORE_KEY) {
        Some(value) => value
            .as_str()
            .map(|s| s.to_string())
            .ok_or_else(|| "API key is not a valid string".to_string()),
        None => Err("No API key found. Please configure your Gemini API key.".to_string()),
    }
}

/// Compute SHA-256 hash of audio data
fn compute_hash(data: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data);
    format!("{:x}", hasher.finalize())
}

/// Detect potential splices/cuts in audio by finding discontinuities
fn detect_splices(samples: &[f32], sample_rate: u32, threshold: f32) -> Vec<f32> {
    let mut splices = Vec::new();
    let window_size = (sample_rate as usize) / 100; // 10ms windows

    for i in (window_size..samples.len()).step_by(window_size) {
        let prev_avg: f32 = samples[i - window_size..i]
            .iter()
            .map(|s| s.abs())
            .sum::<f32>()
            / window_size as f32;
        let curr_avg: f32 = samples[i..std::cmp::min(i + window_size, samples.len())]
            .iter()
            .map(|s| s.abs())
            .sum::<f32>()
            / window_size as f32;

        let diff = (curr_avg - prev_avg).abs();
        if diff > threshold && prev_avg > 0.01 {
            splices.push(i as f32 / sample_rate as f32);
        }
    }
    splices
}

/// Generate downsampled waveform data for visualization
fn generate_waveform(samples: &[f32], target_points: usize) -> Vec<f32> {
    if samples.is_empty() {
        return vec![];
    }

    let chunk_size = samples.len() / target_points.max(1);
    if chunk_size == 0 {
        return samples.to_vec();
    }

    samples
        .chunks(chunk_size)
        .map(|chunk| chunk.iter().map(|s| s.abs()).sum::<f32>() / chunk.len() as f32)
        .collect()
}

/// Analyze audio locally using Rust - no API calls
#[command]
pub async fn analyze_audio_local(audio_base64: String) -> Result<LocalAnalysis, String> {
    // Decode base64 audio
    let audio_bytes = STANDARD
        .decode(&audio_base64)
        .map_err(|e| format!("Failed to decode base64: {}", e))?;

    // Compute hash for integrity
    let file_hash = compute_hash(&audio_bytes);

    // Try to read as WAV
    let cursor = Cursor::new(&audio_bytes);
    let reader = WavReader::new(cursor).map_err(|e| {
        format!(
            "Failed to read WAV: {}. Note: Only WAV format supported for local analysis.",
            e
        )
    })?;

    let spec = reader.spec();
    let sample_rate = spec.sample_rate;
    let channels = spec.channels;
    let bits_per_sample = spec.bits_per_sample;

    // Read samples
    let samples: Vec<f32> = match spec.sample_format {
        hound::SampleFormat::Float => reader
            .into_samples::<f32>()
            .filter_map(|s| s.ok())
            .collect(),
        hound::SampleFormat::Int => reader
            .into_samples::<i32>()
            .filter_map(|s| s.ok())
            .map(|s| s as f32 / i32::MAX as f32)
            .collect(),
    };

    if samples.is_empty() {
        return Err("No audio samples found".to_string());
    }

    let duration_seconds = samples.len() as f32 / (sample_rate as f32 * channels as f32);

    // Calculate RMS level
    let rms_level = (samples.iter().map(|s| s * s).sum::<f32>() / samples.len() as f32).sqrt();

    // Calculate peak amplitude
    let peak_amplitude = samples.iter().map(|s| s.abs()).fold(0.0f32, f32::max);

    // Calculate silence ratio (samples below threshold)
    let silence_threshold = 0.01;
    let silent_samples = samples
        .iter()
        .filter(|s| s.abs() < silence_threshold)
        .count();
    let silence_ratio = silent_samples as f32 / samples.len() as f32;

    // Detect potential splices
    let splice_timestamps = detect_splices(&samples, sample_rate, 0.15);

    // Generate waveform for visualization (500 points)
    let waveform_data = generate_waveform(&samples, 500);

    Ok(LocalAnalysis {
        metadata: AudioMetadata {
            duration_seconds,
            sample_rate,
            channels,
            bits_per_sample,
            file_hash,
        },
        rms_level,
        peak_amplitude,
        silence_ratio,
        splice_timestamps,
        waveform_data,
    })
}

/// Transcribe audio using Gemini (ASR)
#[command]
pub async fn transcribe_audio(
    app: AppHandle,
    audio_base64: String,
    mime_type: String,
    language: String,
) -> Result<String, String> {
    let api_key = get_api_key_from_store(&app)?;

    let prompt = if language == "es" {
        "Transcribe este audio a texto de forma literal. Devuelve solo el texto."
    } else {
        "Transcribe this audio to text literally. Return only the text."
    };

    let request_body = serde_json::json!({
        "contents": [{
            "parts": [
                {
                    "inlineData": {
                        "mimeType": mime_type,
                        "data": audio_base64
                    }
                },
                {
                    "text": prompt
                }
            ]
        }]
    });

    let client = reqwest::Client::new();
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={}",
        api_key
    );

    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("HTTP request failed: {}", e))?;

    let status = response.status();
    let body = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    if !status.is_success() {
        return Err(format!("API error ({}): {}", status, body));
    }

    // Parse response and extract transcription
    let parsed: serde_json::Value =
        serde_json::from_str(&body).map_err(|e| format!("Failed to parse response: {}", e))?;

    let text = parsed["candidates"][0]["content"]["parts"][0]["text"]
        .as_str()
        .unwrap_or(if language == "es" {
            "No se detectó voz."
        } else {
            "No voice detected."
        });

    Ok(text.trim().to_string())
}

/// Full forensic analysis using Gemini
#[command]
pub async fn analyze_full(
    app: AppHandle,
    audio_base64: String,
    mime_type: String,
    language: String,
    segment_start: Option<f32>,
    segment_end: Option<f32>,
) -> Result<ForensicReport, String> {
    let api_key = get_api_key_from_store(&app)?;

    let segment_instruction = match (segment_start, segment_end) {
        (Some(start), Some(end)) => {
            if language == "es" {
                format!("Analiza solo de {:.2}s a {:.2}s.", start, end)
            } else {
                format!("Analyze only from {:.2}s to {:.2}s.", start, end)
            }
        }
        _ => {
            if language == "es" {
                "Analiza la grabación completa.".to_string()
            } else {
                "Analyze the full recording.".to_string()
            }
        }
    };

    let prompt = if language == "es" {
        format!(
            r#"Eres un experto en análisis forense de audio. Tu tarea es analizar esta grabación para determinar:
{}

1. DETECCIÓN DE HABLANTES: Identifica TODAS las personas presentes (incluyendo las que solo respiran o están en silencio).
2. PERFIL POR HABLANTE: Para cada persona detectada, estima edad, género, estado emocional y nivel de estrés (0-100).
3. DETECCIÓN DE EDICIÓN: Busca cortes, empalmes, discontinuidades o manipulaciones en el audio.
4. DETECCIÓN DE DEEPFAKE: Evalúa si el audio podría ser generado por IA.
5. ENTORNO: Describe el espacio y marcadores ambientales.

IMPORTANTE: TODA LA RESPUESTA DEBE ESTAR EN ESPAÑOL.

Responde en JSON con esta estructura exacta:
{{
  "speakerCount": número,
  "speakers": [{{ "id": número, "ageEstimate": "texto", "gender": "texto", "emotionalState": "texto", "stressLevel": número, "speakingDuration": número, "detectedVia": "voice|breathing|ambient" }}],
  "environmentProfile": {{ "roomType": "texto", "environmentalMarkers": ["texto"] }},
  "anomalyDetection": {{ "overallScore": número, "riskLevel": "BAJO|MEDIO|ALTO", "technicalFlags": ["texto"], "prosodicFlags": ["texto"], "emotionalFlags": ["texto"], "environmentalFlags": ["texto"], "spliceDetection": {{ "cutsDetected": número, "timestamps": [número] }} }},
  "deepfakeDetection": {{ "isDeepfake": boolean, "confidenceScore": número, "detectionFlags": ["texto"] }},
  "transcription": "texto",
  "summary": "texto"
}}"#,
            segment_instruction
        )
    } else {
        format!(
            r#"You are an expert in audio forensic analysis. Your task is to analyze this recording to determine:
{}

1. SPEAKER DETECTION: Identify ALL people present (including those only breathing or silent).
2. PROFILE PER SPEAKER: For each person detected, estimate age, gender, emotional state and stress level (0-100).
3. EDIT DETECTION: Look for cuts, splices, discontinuities or manipulations in the audio.
4. DEEPFAKE DETECTION: Evaluate if the audio could be AI-generated.
5. ENVIRONMENT: Describe the space and environmental markers.

IMPORTANT: THE ENTIRE RESPONSE MUST BE IN ENGLISH.

Respond in JSON with this exact structure:
{{
  "speakerCount": number,
  "speakers": [{{ "id": number, "ageEstimate": "text", "gender": "text", "emotionalState": "text", "stressLevel": number, "speakingDuration": number, "detectedVia": "voice|breathing|ambient" }}],
  "environmentProfile": {{ "roomType": "text", "environmentalMarkers": ["text"] }},
  "anomalyDetection": {{ "overallScore": number, "riskLevel": "LOW|MEDIUM|HIGH", "technicalFlags": ["text"], "prosodicFlags": ["text"], "emotionalFlags": ["text"], "environmentalFlags": ["text"], "spliceDetection": {{ "cutsDetected": number, "timestamps": [number] }} }},
  "deepfakeDetection": {{ "isDeepfake": boolean, "confidenceScore": number, "detectionFlags": ["text"] }},
  "transcription": "text",
  "summary": "text"
}}"#,
            segment_instruction
        )
    };

    let request_body = serde_json::json!({
        "contents": [{
            "parts": [
                {
                    "inlineData": {
                        "mimeType": mime_type,
                        "data": audio_base64
                    }
                },
                {
                    "text": prompt
                }
            ]
        }],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    });

    let client = reqwest::Client::new();
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={}",
        api_key
    );

    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("HTTP request failed: {}", e))?;

    let status = response.status();
    let body = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    if !status.is_success() {
        return Err(format!("API error ({}): {}", status, body));
    }

    // Parse the Gemini response
    let parsed: serde_json::Value =
        serde_json::from_str(&body).map_err(|e| format!("Failed to parse response: {}", e))?;

    let report_text = parsed["candidates"][0]["content"]["parts"][0]["text"]
        .as_str()
        .ok_or_else(|| "No text in Gemini response".to_string())?;

    // Parse the ForensicReport from the JSON text
    let report: ForensicReport = serde_json::from_str(report_text).map_err(|e| {
        format!(
            "Failed to parse forensic report: {} - Raw: {}",
            e, report_text
        )
    })?;

    Ok(report)
}

/// Legacy function - keeping for backward compatibility but now uses keychain
#[command]
pub async fn analyze_with_gemini(
    app: AppHandle,
    audio_base64: String,
    mime_type: String,
    language: String,
) -> Result<String, String> {
    let api_key = get_api_key_from_store(&app)?;

    let prompt = if language == "es" {
        r#"Eres un experto en análisis forense de audio. Analiza esta grabación para:
1. DETECCIÓN DE HABLANTES: Identifica TODAS las personas presentes (incluyendo las que solo respiran).
2. PERFIL POR HABLANTE: Edad, género, estado emocional, nivel de estrés (0-100).
3. DETECCIÓN DE DEEPFAKE: Evalúa si el audio podría ser generado por IA.
4. ENTORNO: Describe el espacio y marcadores ambientales.
5. TRANSCRIPCIÓN: Transcribe el contenido verbal.
RESPONDE EN ESPAÑOL."#
    } else {
        r#"You are an expert in audio forensic analysis. Analyze this recording for:
1. SPEAKER DETECTION: Identify ALL people present (including those only breathing).
2. PROFILE PER SPEAKER: Age, gender, emotional state, stress level (0-100).
3. DEEPFAKE DETECTION: Evaluate if the audio could be AI-generated.
4. ENVIRONMENT: Describe the space and environmental markers.
5. TRANSCRIPTION: Transcribe verbal content.
RESPOND IN ENGLISH."#
    };

    let request_body = serde_json::json!({
        "contents": [{
            "parts": [
                {
                    "inlineData": {
                        "mimeType": mime_type,
                        "data": audio_base64
                    }
                },
                {
                    "text": prompt
                }
            ]
        }],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    });

    let client = reqwest::Client::new();
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={}",
        api_key
    );

    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("HTTP request failed: {}", e))?;

    let status = response.status();
    let body = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    if !status.is_success() {
        return Err(format!("API error ({}): {}", status, body));
    }

    Ok(body)
}
