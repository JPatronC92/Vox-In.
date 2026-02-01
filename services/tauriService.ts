/**
 * Tauri bridge service for invoking Rust commands
 * All Gemini API calls go through secure Rust backend
 */

import { ForensicReport, Language } from '../types';

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
 * Invoke a Tauri command
 */
async function invokeTauri<T>(cmd: string, args: Record<string, unknown>): Promise<T> {
    if (!isTauri) {
        throw new Error('Tauri environment required. This app only runs via Tauri.');
    }
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke(cmd, args);
}

/**
 * Analyze audio locally using Rust (fast, free, offline)
 * Only works for WAV format
 */
export async function analyzeAudioLocal(audioBase64: string): Promise<LocalAnalysis | null> {
    if (!isTauri) {
        console.warn('Local analysis not available outside Tauri');
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
 * Transcribe audio using Gemini via secure Rust backend
 */
export async function transcribeAudio(
    audioBase64: string,
    mimeType: string,
    language: Language
): Promise<string> {
    return invokeTauri<string>('transcribe_audio', {
        audioBase64,
        mimeType,
        language
    });
}

/**
 * Full forensic analysis using Gemini via secure Rust backend
 */
export async function analyzeVoiceNote(
    audioBase64: string,
    mimeType: string,
    language: Language,
    segment?: { start: number; end: number }
): Promise<ForensicReport> {
    return invokeTauri<ForensicReport>('analyze_full', {
        audioBase64,
        mimeType,
        language,
        segmentStart: segment?.start ?? null,
        segmentEnd: segment?.end ?? null
    });
}

/**
 * Check if running in Tauri environment
 */
export function isTauriEnvironment(): boolean {
    return isTauri;
}

/**
 * Get environment info for debugging
 */
export function getEnvironmentInfo() {
    return {
        isTauri,
        platform: isTauri ? 'native' : 'web',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
    };
}

/**
 * Listen for shared files (Share Intent on Android/iOS)
 */
export async function listenForSharedFiles(
    callback: (urls: string[]) => void
): Promise<() => void> {
    if (!isTauri) {
        console.warn('Share intent listening not available outside Tauri');
        return () => { };
    }

    try {
        const { onOpenUrl, getCurrent } = await import('@tauri-apps/plugin-deep-link');

        // Check if app was opened with a URL
        const initialUrls = await getCurrent();
        if (initialUrls && initialUrls.length > 0) {
            callback(initialUrls);
        }

        // Listen for future URLs
        const unlisten = await onOpenUrl((urls) => {
            callback(urls);
        });

        return unlisten;
    } catch (error) {
        console.error('Failed to setup share intent listener:', error);
        return () => { };
    }
}
