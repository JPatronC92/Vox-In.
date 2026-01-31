use base64::{engine::general_purpose::STANDARD, Engine};
use hound::WavReader;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::io::Cursor;
use tauri::command;

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
        let prev_avg: f32 = samples[i - window_size..i].iter().map(|s| s.abs()).sum::<f32>() / window_size as f32;
        let curr_avg: f32 = samples[i..std::cmp::min(i + window_size, samples.len())].iter().map(|s| s.abs()).sum::<f32>() / window_size as f32;
        
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
        .map(|chunk| {
            chunk.iter().map(|s| s.abs()).sum::<f32>() / chunk.len() as f32
        })
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
    let reader = WavReader::new(cursor)
        .map_err(|e| format!("Failed to read WAV: {}. Note: Only WAV format supported for local analysis.", e))?;
    
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
    let silent_samples = samples.iter().filter(|s| s.abs() < silence_threshold).count();
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

/// Call Gemini API securely from Rust backend
#[command]
pub async fn analyze_with_gemini(
    audio_base64: String,
    mime_type: String,
    language: String,
) -> Result<String, String> {
    let api_key = std::env::var("GEMINI_API_KEY")
        .or_else(|_| std::env::var("API_KEY"))
        .map_err(|_| "GEMINI_API_KEY not set in environment".to_string())?;
    
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
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-preview-05-06:generateContent?key={}",
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
