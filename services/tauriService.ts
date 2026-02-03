/**
 * Tauri bridge service for invoking Rust commands
 * All Gemini API calls go through secure Rust backend
 */

import { ForensicReport, Language, LocalAnalysis } from '../types';

// Check if running inside Tauri
const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

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
 * Reset API Key (delete from secure storage)
 */
export async function resetApiKey(): Promise<void> {
    return invokeTauri('delete_api_key', {});
}

export async function checkApiKey(): Promise<string | null> {
    return invokeTauri('get_api_key', {});
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
        // console.warn('Share intent listening not available outside Tauri');
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

/**
 * Open native file picker (Android/iOS/Desktop)
 * Returns the file as a Blob (ready for processing)
 */
export async function selectAudioFile(): Promise<Blob | null> {
    if (!isTauri) {
        throw new Error('Native file picker not available on web');
    }

    try {
        const { open } = await import('@tauri-apps/plugin-dialog');
        const { readFile } = await import('@tauri-apps/plugin-fs');

        const selected = await open({
            multiple: false,
            filters: [{
                name: 'Audio',
                extensions: ['wav', 'mp3', 'm4a', 'aac', 'ogg', 'opus']
            }]
        });

        if (!selected) return null;

        // On mobile 'selected' is likely a path string
        const path = selected as string;

        // Read file contents
        const contents = await readFile(path);

        // Guess MIME type (basic)
        let mimeType = 'audio/wav';
        if (path.endsWith('.mp3')) mimeType = 'audio/mpeg';
        if (path.endsWith('.m4a')) mimeType = 'audio/mp4';
        if (path.endsWith('.ogg')) mimeType = 'audio/ogg';

        return new Blob([contents], { type: mimeType });

    } catch (error) {
        console.error('Failed to pick file:', error);
        return null;
    }
}
