mod audio;

use audio::{analyze_audio_local, analyze_with_gemini};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            analyze_audio_local,
            analyze_with_gemini
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
