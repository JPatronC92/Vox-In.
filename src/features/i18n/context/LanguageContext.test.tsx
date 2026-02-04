import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { LanguageProvider, useLanguage } from './LanguageContext';

// Mock Component to consume context
const TestComponent = () => {
  const { lang, setLang, t } = useLanguage();
  return (
    <div>
      <div data-testid="lang-display">{lang}</div>
      <div data-testid="translation-display">{t.startRecording}</div>
      <button onClick={() => setLang('es')}>Set ES</button>
      <button onClick={() => setLang('en')}>Set EN</button>
    </div>
  );
};

describe('LanguageContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('provides default language (es)', () => {
    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );
    expect(screen.getByTestId('lang-display').textContent).toBe('es');
  });

  it('loads language from localStorage', () => {
    localStorage.setItem('vox_lang', 'en');
    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );
    expect(screen.getByTestId('lang-display').textContent).toBe('en');
  });

  it('updates language and persists to localStorage', () => {
    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );

    fireEvent.click(screen.getByText('Set EN'));
    expect(screen.getByTestId('lang-display').textContent).toBe('en');
    expect(localStorage.getItem('vox_lang')).toBe('en');
  });
});
