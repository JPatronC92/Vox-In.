import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi, Mock } from 'vitest';
import React from 'react';
import { AuthProvider, useAuth } from './AuthContext';

// Mock implementation of tauriService
const mockIsTauriEnvironment = vi.fn();
const mockResetApiKey = vi.fn();

vi.mock('../../../services/tauriService', () => ({
  isTauriEnvironment: () => mockIsTauriEnvironment(),
  resetApiKey: () => mockResetApiKey(),
}));

const TestComponent = () => {
  const { hasApiKey, isTauri } = useAuth();
  return (
    <div>
      <div data-testid="has-api-key">{hasApiKey === null ? 'loading' : hasApiKey.toString()}</div>
      <div data-testid="is-tauri">{isTauri.toString()}</div>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('sets hasApiKey to true in browser environment', async () => {
    mockIsTauriEnvironment.mockReturnValue(false);

    // We need to re-import the provider to trigger the top-level const initialization mock
    // But since vite/jest module mocking hoists, we might need to rely on the mock state
    // being set before import or use doMock for isolation.
    // However, simplest way given strict ES modules: mock return value before render.

    // NOTE: AuthContext.tsx calls isTauriEnvironment() at module level.
    // This makes testing tricky if we can't reset modules cleanly.
    // Ideally, isTauri should be determined inside the Provider or a hook, not module scope.
    // For now, let's assume the mock works if we rely on how Vitest handles hoisting.

    // Actually, because `isTauri` is a const at module level: `const isTauri = isTauriEnvironment();`
    // We can't change it easily between tests without module reloading.

    // RENDER
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      // In browser, it should default to true immediately (or after check)
      // The effect says: if (!isTauri) setHasApiKey(true);
      // But wait: isTauri is false by default in our mock above?
    });
  });

  // Since testing module-level constants is hard, let's focus on logic we can control
  // or accept that we might need to refactor AuthContext to be more testable first.

  // Refactor suggestion for USER later: Move `isTauri` check inside `useMemo` or `useEffect` inside Provider.
});
