import React, { useEffect } from 'react';

const EnvDebug: React.FC = () => {
  useEffect(() => {
    console.log('Environment variables:', {
      VITE_OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY 
        ? '***' + import.meta.env.VITE_OPENAI_API_KEY.slice(-4) 
        : 'Not found',
      NODE_ENV: import.meta.env.MODE,
      PROD: import.meta.env.PROD,
      DEV: import.meta.env.DEV
    });
  }, []);

  return null; // This component doesn't render anything
};

export default EnvDebug;
