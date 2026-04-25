'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { UserRole } from '@/lib/auth';

type AuthUser = {
  id: string;
  email?: string | null;
  [key: string]: unknown;
};

type UserProfile = {
  id: string;
  role?: UserRole;
  [key: string]: unknown;
};

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check initial session
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        console.log('useAuth: checking session...', { session: session?.user?.email, error });

        if (error || !session?.user) {
          console.log('useAuth: No session found');
          setLoading(false);
          return;
        }

        setUser(session.user);
        console.log('useAuth: User set:', session.user.email);

        // Get user profile
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error('useAuth: Error getting profile:', profileError);
        } else {
          console.log('useAuth: Profile loaded:', profile?.role);
          setUserProfile(profile as UserProfile);
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
        // Fetch profile when auth state changes
        supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            if (data) {
              console.log('useAuth: Profile synced:', data.role);
              setUserProfile(data as UserProfile);
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
    () => !loading && !!userProfile && requiredRoles.includes(userProfile.role),
    [loading, userProfile, requiredRoles]
  );

  return { hasAccess, loading };
}
