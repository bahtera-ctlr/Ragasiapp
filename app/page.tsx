'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import LoginPage from './components/LoginPage'

export default function Home() {
  useEffect(() => {
    // Clear invalid session on app start to prevent repeated 400 refresh errors
    const clearInvalidSession = async () => {
      try {
        const { error } = await supabase.auth.getSession();
        if (error) {
          await supabase.auth.signOut({ scope: 'local' });
        }
      } catch {
        // ignore
      }
    };
    clearInvalidSession();
  }, []);

  return <LoginPage />
}
