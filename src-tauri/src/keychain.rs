use serde::{Deserialize, Serialize};
use tauri::command;

const API_KEY_STORE_KEY: &str = "gemini_api_key";
const STORE_FILE: &str = "vox_config.json";

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiKeyValidation {
    pub valid: bool,
    pub message: String,
}

/// Save API key to secure storage
#[command]
pub async fn save_api_key(app: tauri::AppHandle, api_key: String) -> Result<(), String> {
    use tauri_plugin_store::StoreExt;

    let store = app
        .store(STORE_FILE)
        .map_err(|e| format!("Failed to open store: {}", e))?;

    store.set(API_KEY_STORE_KEY, serde_json::json!(api_key));
    store
        .save()
        .map_err(|e| format!("Failed to save store: {}", e))?;

    Ok(())
}

/// Retrieve API key from secure storage
#[command]
pub async fn get_api_key(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_store::StoreExt;

    let store = app
        .store(STORE_FILE)
        .map_err(|e| format!("Failed to open store: {}", e))?;

    match store.get(API_KEY_STORE_KEY) {
        Some(value) => {
            let key = value.as_str().map(|s| s.to_string());
            Ok(key)
        }
        None => Ok(None),
    }
}

/// Delete API key from storage (for logout/reset)
#[command]
pub async fn delete_api_key(app: tauri::AppHandle) -> Result<(), String> {
    use tauri_plugin_store::StoreExt;

    let store = app
        .store(STORE_FILE)
        .map_err(|e| format!("Failed to open store: {}", e))?;

    let _ = store.delete(API_KEY_STORE_KEY);
    store
        .save()
        .map_err(|e| format!("Failed to save store: {}", e))?;

    Ok(())
}

/// Validate API key by making a test request to Gemini
#[command]
pub async fn validate_api_key(api_key: String) -> Result<ApiKeyValidation, String> {
    let client = reqwest::Client::new();
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models?key={}",
        api_key
    );

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    let status = response.status();

    if status.is_success() {
        Ok(ApiKeyValidation {
            valid: true,
            message: "API key validated successfully".to_string(),
        })
    } else if status.as_u16() == 400 || status.as_u16() == 403 {
        Ok(ApiKeyValidation {
            valid: false,
            message: "Invalid API key. Please check and try again.".to_string(),
        })
    } else {
        Ok(ApiKeyValidation {
            valid: false,
            message: format!("Validation failed with status: {}", status),
        })
    }
}
