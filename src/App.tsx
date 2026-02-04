import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';

// Contexts
import { LanguageProvider } from './features/i18n/context/LanguageContext';
import { AuthProvider } from './features/auth/context/AuthContext';
import { AudioProvider } from './features/audio/context/AudioContext';

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AudioProvider>
          <RouterProvider router={router} />
        </AudioProvider>
      </AuthProvider>
    </LanguageProvider>
  );
};

export default App;
