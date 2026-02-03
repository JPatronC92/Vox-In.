import { renderHook, act } from '@testing-library/react';
import { useLogger } from '../hooks/useLogger';
import { describe, it, expect } from 'vitest';

describe('useLogger', () => {
    it('should initialize empty', () => {
        const { result } = renderHook(() => useLogger());
        expect(result.current.logs).toEqual([]);
    });

    it('should add logs correctly', () => {
        const { result } = renderHook(() => useLogger());

        act(() => {
            result.current.addLog('Test log');
        });

        expect(result.current.logs).toHaveLength(1);
        expect(result.current.logs[0]).toBe('OK // Test log');

        act(() => {
            result.current.addLog('Error log', true);
        });

        expect(result.current.logs).toHaveLength(2);
        expect(result.current.logs[0]).toBe('ERR // Error log');
        expect(result.current.logs[1]).toBe('OK // Test log');
    });

    it('should limit logs to 30', () => {
        const { result } = renderHook(() => useLogger());

        act(() => {
            for (let i = 0; i < 35; i++) {
                result.current.addLog(`Log ${i}`);
            }
        });

        expect(result.current.logs).toHaveLength(30);
        // The last added log should be at index 0
        expect(result.current.logs[0]).toBe('OK // Log 34');
    });
});
