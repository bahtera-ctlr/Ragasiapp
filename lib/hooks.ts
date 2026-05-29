'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { UserRole } from '@/lib/auth';
import { User } from '@supabase/supabase-js';

type UserProfile = {
  id: string;
  role?: UserRole;
  [key: string]: unknown;
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check initial session
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        console.log('useAuth: checking session...', { session: session?.user?.email, error });

        if (error) {
          // Token expired/invalid — clear local session to stop repeated 400 errors
          await supabase.auth.signOut({ scope: 'local' });
          setLoading(false);
          return;
        }

        if (!session?.user) {
          setLoading(false);
          return;
        }

        setUser(session.user);
        console.log('useAuth: User set:', session.user.email);

        // Cek cache di sessionStorage dulu (non-blocking optimization)
        const cachedProfile = sessionStorage.getItem(`profile_${session.user.id}`);
        if (cachedProfile) {
          try {
            const parsed = JSON.parse(cachedProfile);
            console.log('useAuth: Using cached profile:', parsed.role);
            setUserProfile(parsed as UserProfile);
            setLoading(false);
            return; // Skip database query jika cache ada
          } catch (e) {
            console.warn('useAuth: Invalid cache, fetching from DB');
          }
        }

        // Jika tidak ada cache, fetch dari database
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle(); // Gunakan maybeSingle agar tidak error jika tidak ada

        if (profileError) {
          console.error('useAuth: Error getting profile:', profileError);
        } else if (profile) {
          console.log('useAuth: Profile loaded:', profile.role);
          setUserProfile(profile as UserProfile);
          // Cache untuk kali berikutnya
          sessionStorage.setItem(`profile_${session.user.id}`, JSON.stringify(profile));
        } else {
          console.warn('useAuth: Profile not found, using default');
          // Default profile jika tidak ada
          const defaultProfile: UserProfile = {
            id: session.user.id,
            role: 'admin_keuangan',
          };
          setUserProfile(defaultProfile);
          sessionStorage.setItem(`profile_${session.user.id}`, JSON.stringify(defaultProfile));
        }

        setLoading(false);
      } catch (error) {
        console.error('useAuth: Error in checkAuth:', error);
        setLoading(false);
      }
    };

    checkAuth();

    // Listen untuk auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('useAuth: Auth state changed:', event, session?.user?.email);
      
      if (session?.user) {
        setUser(session.user);
        
        // Cek cache dulu
        const cachedProfile = sessionStorage.getItem(`profile_${session.user.id}`);
        if (cachedProfile) {
          try {
            const parsed = JSON.parse(cachedProfile);
            setUserProfile(parsed as UserProfile);
            return;
          } catch (e) {
            console.warn('useAuth: Invalid cache on auth change');
          }
        }
        
        // Fetch profile jika tidak ada cache
        supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle()
          .then(({ data }) => {
            if (data) {
              console.log('useAuth: Profile synced:', data.role);
              setUserProfile(data as UserProfile);
              sessionStorage.setItem(`profile_${session.user.id}`, JSON.stringify(data));
            }
          });
      } else {
        setUser(null);
        setUserProfile(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []); // Only run once on mount

  return { user, userProfile, loading };
}

export function useRoleCheck(requiredRoles: UserRole[]) {
  const { userProfile, loading } = useAuth();
  const hasAccess = useMemo(
    () => !loading && !!userProfile && !!userProfile.role && requiredRoles.includes(userProfile.role),
    [loading, userProfile, requiredRoles]
  );

  return { hasAccess, loading };
}
