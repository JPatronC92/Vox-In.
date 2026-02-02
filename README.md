# Vox Intelligence Pro

Plataforma de análisis forense de audio con IA.

## Características

- 🎤 **Grabación y carga de audio**
- 🔍 **Transcripción automática** (Gemini AI)
- 👥 **Detección de múltiples hablantes**
- 🎭 **Perfilado emocional**
- ✂️ **Detección de cortes/ediciones**
- 🤖 **Detección de deepfakes**
- 🔐 **BYOK** - Usa tu propia API key de Gemini

## Requisitos

- Node.js 18+
- Rust (para Tauri)
- Android NDK 27+ (para Android build)

## Desarrollo

```bash
# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npx tauri dev

# Compilar para producción
npx tauri build
```

## Arquitectura

| Capa | Tecnología | Propósito |
|------|------------|-----------|
| Frontend | React + TypeScript | UI |
| Backend | Rust (Tauri) | Audio processing, API proxy |
| AI | Gemini 2.0 Flash | Transcripción, análisis |
| Storage | Keychain/EncryptedSharedPrefs | API key seguro |

## Estructura

```
├── App.tsx           # Componente principal
├── components/       # UI components
├── hooks/            # React hooks
├── i18n/             # Traducciones (ES/EN)
├── services/         # Tauri bridge
└── src-tauri/        # Rust backend
    ├── src/audio.rs  # Procesamiento de audio
    └── src/keychain.rs # Storage seguro
```

## Licencia

Privado
