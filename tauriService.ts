/**
 * Tauri bridge service for invoking Rust commands
 * Falls back to web-only mode when not running in Tauri
 */

import { ForensicReport, Language } from './types';

// Check if running inside Tauri
const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

interface LocalAnalysis {
    metadata: {
        duration_seconds: number;
        sample_rate: number;
        channels: number;
        bits_per_sample: number;
        file_hash: string;
    };
    rms_level: number;
    peak_amplitude: number;
    silence_ratio: number;
    splice_timestamps: number[];
    waveform_data: number[];
}

/**
 * Invoke a Tauri command if available
 */
async function invokeTauri<T>(cmd: string, args: Record<string, unknown>): Promise<T> {
    if (!isTauri) {
        throw new Error('Not running in Tauri environment');
    }
    // @ts-ignore - Tauri global
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke(cmd, args);
}

/**
 * Analyze audio locally using Rust (fast, free, offline)
 * Only works for WAV format in Tauri environment
 */
export async function analyzeAudioLocal(audioBase64: string): Promise<LocalAnalysis | null> {
    if (!isTauri) {
        console.log('Local analysis not available in web mode');
        return null;
    }

    try {
        return await invokeTauri<LocalAnalysis>('analyze_audio_local', {
            audioBase64
        });
    } catch (error) {
        console.error('Local analysis failed:', error);
        return null;
    }
}

/**
 * Analyze audio with Gemini AI via secure Rust backend
 */
export async function analyzeWithGemini(
    audioBase64: string,
    mimeType: string,
    language: Language
): Promise<ForensicReport> {
    if (isTauri) {
        // Use secure Rust backend
        const response = await invokeTauri<string>('analyze_with_gemini', {
            audioBase64,
            mimeType,
            language
        });

        // Parse Gemini response
        const parsed = JSON.parse(response);
        const candidates = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidates) {
            return JSON.parse(candidates);
        }
        throw new Error('Invalid Gemini response structure');
    } else {
        // Fallback to direct API call (less secure, web-only)
        const { analyzeVoiceNote } = await import('./geminiService');
        return analyzeVoiceNote(audioBase64, mimeType, language);
    }
}

/**
 * Check if hybrid mode is available (Tauri + Rust)
 */
export function isHybridModeAvailable(): boolean {
    return isTauri;
}

/**
 * Get environment info for debugging
 */
export function getEnvironmentInfo() {
    return {
        isTauri,
        platform: isTauri ? 'desktop' : 'web',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
    };
}
