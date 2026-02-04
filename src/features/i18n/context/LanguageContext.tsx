import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Store } from '@tauri-apps/plugin-store';
import { Language } from '../../../types';
import { translations } from '../../../i18n/translations';
import { isTauriEnvironment } from '../../../services/tauriService';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (typeof translations)['es'];
  isLoaded: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize from localStorage if possible (web fallback), otherwise default to 'es'
  const [lang, setLangState] = useState<Language>(() => {
    if (!isTauriEnvironment()) {
      const saved = localStorage.getItem('vox_lang');
      if (saved === 'es' || saved === 'en') {
        return saved as Language;
      }
    }
    return 'es';
  });

  const [isLoaded, setIsLoaded] = useState(!isTauriEnvironment());

  useEffect(() => {
    const initStore = async () => {
      if (isTauriEnvironment()) {
        try {
          const store = new Store('vox_settings.json');
          const saved = await store.get<string>('language');
          if (saved && (saved === 'es' || saved === 'en')) {
            setLangState(saved as Language);
          }
        } catch (error) {
          console.warn('Failed to load language from store:', error);
        } finally {
          setIsLoaded(true);
        }
      } else {
        setIsLoaded(true);
      }
    };

    initStore();
  }, []);

  const setLang = async (newLang: Language) => {
    setLangState(newLang);
    try {
      if (isTauriEnvironment()) {
        const store = new Store('vox_settings.json');
        await store.set('language', newLang);
        await store.save();
      } else {
        localStorage.setItem('vox_lang', newLang);
      }
    } catch (error) {
      console.error('Failed to save language preference:', error);
    }
  };

  const t = translations[lang];

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, isLoaded }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
