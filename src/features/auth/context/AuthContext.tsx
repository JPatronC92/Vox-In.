import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  isTauriEnvironment,
  resetApiKey as resetTauriApiKey,
  checkApiKey as checkTauriApiKey,
} from '../../../services/tauriService';

interface AuthContextType {
  hasApiKey: boolean | null;
  isTauri: boolean;
  setHasApiKey: (hasKey: boolean) => void;
  handleResetApiKey: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isTauri] = useState(() => isTauriEnvironment());
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

  useEffect(() => {
    const checkApiKey = async () => {
      if (isTauri) {
        try {
          const key = await checkTauriApiKey();
          setHasApiKey(!!key);
        } catch {
          setHasApiKey(false);
        }
      } else {
        setHasApiKey(true);
      }
    };
    checkApiKey();
  }, []);

  const handleResetApiKey = async () => {
    await resetTauriApiKey();
    setHasApiKey(false);
    window.location.reload();
  };

  return (
    <AuthContext.Provider value={{ hasApiKey, isTauri, setHasApiKey, handleResetApiKey }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
