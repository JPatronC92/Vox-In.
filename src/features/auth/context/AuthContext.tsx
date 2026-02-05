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
          // Robust check for API key
          const key = await checkTauriApiKey();
          setHasApiKey(!!key);
        } catch (error) {
          console.error("Failed to check API key in Keychain/Store:", error);
          // Fallback to false so app doesn't hang in "loading" state
          setHasApiKey(false);
        }
      } else {
        setHasApiKey(true);
      }
    };
    checkApiKey();
  }, []);

  const handleResetApiKey = async () => {
    try {
      await resetTauriApiKey();
    } catch (error) {
       console.error("Failed to reset API key:", error);
    }
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
