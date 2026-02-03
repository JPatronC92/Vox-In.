import { useState, useCallback } from 'react';

export const useLogger = () => {
    const [logs, setLogs] = useState<string[]>([]);

    const addLog = useCallback((msg: string, isError = false) => {
        setLogs(prev => [`${isError ? 'ERR' : 'OK'} // ${msg}`, ...prev].slice(0, 30));
    }, []);

    const clearLogs = useCallback(() => {
        setLogs([]);
    }, []);

    return { logs, addLog, clearLogs };
};
