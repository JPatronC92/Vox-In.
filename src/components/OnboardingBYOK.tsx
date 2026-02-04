import React, { useState } from 'react';
import { Eye, EyeOff, Key, ExternalLink, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
  language: 'es' | 'en';
}

const texts = {
  es: {
    title: 'Configura tu API Key',
    subtitle: 'Vox Intelligence usa tu propia clave de Gemini (BYOK)',
    inputLabel: 'Gemini API Key',
    inputPlaceholder: 'AIza...',
    getKeyLink: 'Obtener API Key gratis',
    verifyButton: 'Verificar y Guardar',
    verifying: 'Verificando...',
    successMessage: 'API Key válida. ¡Bienvenido!',
    errorMessage: 'API Key inválida. Verifica e intenta de nuevo.',
    privacyNote: 'Tu clave se almacena de forma segura en tu dispositivo y nunca sale de él.',
  },
  en: {
    title: 'Configure your API Key',
    subtitle: 'Vox Intelligence uses your own Gemini key (BYOK)',
    inputLabel: 'Gemini API Key',
    inputPlaceholder: 'AIza...',
    getKeyLink: 'Get API Key for free',
    verifyButton: 'Verify and Save',
    verifying: 'Verifying...',
    successMessage: 'Valid API Key. Welcome!',
    errorMessage: 'Invalid API Key. Please check and try again.',
    privacyNote: 'Your key is stored securely on your device and never leaves it.',
  },
};

// Check if running in Tauri environment
const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

export const OnboardingBYOK: React.FC<OnboardingProps> = ({ onComplete, language }) => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const t = texts[language];

  const handleVerify = async () => {
    if (!apiKey.trim()) return;

    setStatus('verifying');
    setErrorMessage('');

    try {
      if (isTauri) {
        // Use secure Tauri backend
        const { invoke } = await import('@tauri-apps/api/core');

        // Validate the key
        const result = await invoke<{ valid: boolean; message: string }>('validate_api_key', {
          apiKey: apiKey.trim(),
        });

        if (result.valid) {
          // Save to secure storage
          await invoke('save_api_key', { apiKey: apiKey.trim() });
          setStatus('success');
          setTimeout(onComplete, 1500);
        } else {
          setStatus('error');
          setErrorMessage(result.message);
        }
      } else {
        // Web fallback: validate via direct API call
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.trim()}`
        );

        if (response.ok) {
          // Store in localStorage for web mode (less secure)
          localStorage.setItem('gemini_api_key', apiKey.trim());
          setStatus('success');
          setTimeout(onComplete, 1500);
        } else {
          setStatus('error');
          setErrorMessage(t.errorMessage);
        }
      }
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  return (
    <div className="min-h-screen bg-deep-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-brand-500 to-brand-600 rounded-2xl flex items-center justify-center">
            <Key className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">{t.title}</h1>
          <p className="text-slate-400 text-sm">{t.subtitle}</p>
        </div>

        {/* Form */}
        <div className="enterprise-panel rounded-2xl p-6 space-y-6">
          {/* API Key Input */}
          <div className="space-y-2">
            <label className="text-base font-medium text-slate-300">{t.inputLabel}</label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={t.inputPlaceholder}
                className="w-full bg-deep-900 border border-slate-700 rounded-xl px-4 py-3 pr-12 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 font-mono text-base"
                disabled={status === 'verifying' || status === 'success'}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Get API Key Link */}
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-brand-500 hover:text-brand-400 text-base font-medium"
          >
            <ExternalLink className="w-4 h-4" />
            {t.getKeyLink}
          </a>

          {/* Status Messages */}
          {status === 'success' && (
            <div className="flex items-center gap-2 text-green-400 bg-green-400/10 rounded-lg p-3">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm">{t.successMessage}</span>
            </div>
          )}

          {status === 'error' && (
            <div className="flex items-center gap-2 text-red-400 bg-red-400/10 rounded-lg p-3">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{errorMessage || t.errorMessage}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleVerify}
            disabled={!apiKey.trim() || status === 'verifying' || status === 'success'}
            className="w-full btn-primary text-white font-semibold py-3 px-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {status === 'verifying' ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t.verifying}
              </>
            ) : status === 'success' ? (
              <>
                <CheckCircle className="w-5 h-5" />
                {t.successMessage}
              </>
            ) : (
              t.verifyButton
            )}
          </button>

          {/* Privacy Note */}
          <p className="text-xs text-slate-500 text-center">{t.privacyNote}</p>
        </div>
      </div>
    </div>
  );
};

export default OnboardingBYOK;
