mod audio;
mod keychain;

use audio::{analyze_audio_local, analyze_full, analyze_with_gemini, transcribe_audio};
use keychain::{delete_api_key, get_api_key, save_api_key, validate_api_key};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().build())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            // Audio analysis commands
            analyze_audio_local,
            analyze_with_gemini,
            transcribe_audio,
            analyze_full,
            // API key management commands
            save_api_key,
            get_api_key,
            delete_api_key,
            validate_api_key
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
