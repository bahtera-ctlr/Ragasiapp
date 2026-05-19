'use client';

import { useEffect } from 'react';
import LoginPage from './components/LoginPage'

export default function Home() {
  useEffect(() => {
    // Fix corrupt refresh token on app start
    try {
      const sbAuthToken = localStorage.getItem('sb-dnbxgxctcrtpjcnkpatp-auth-token');
      if (sbAuthToken) {
        try {
          const parsed = JSON.parse(sbAuthToken);
          // If refresh_token is null or missing, clear it
          if (!parsed.refresh_token) {
            localStorage.removeItem('sb-dnbxgxctcrtpjcnkpatp-auth-token');
            console.log('Cleared corrupt Supabase token');
          }
        } catch (e) {
          // Token is corrupt, remove it
          localStorage.removeItem('sb-dnbxgxctcrtpjcnkpatp-auth-token');
          console.log('Removed corrupt token from localStorage');
        }
      }
    } catch (error) {
      console.error('Error clearing token:', error);
    }
  }, []);

  return <LoginPage />
}
