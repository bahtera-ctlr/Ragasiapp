import { supabase } from './supabase';

export type UserRole = 'admin_keuangan' | 'marketing' | 'fakturis' | 'admin_logistik' | 'admin_ekspedisi' | 'super_admin';

export interface CreateUserInput {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}

export interface LoginInput {
  email: string;
  password: string;
}

// Sign up dengan role
export async function signUp({ email, password, name, role }: CreateUserInput) {
  try {
    // Buat user di Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role,
        },
      },
    });

    if (authError) {
      return { error: authError.message, data: null };
    }

    if (authData.user) {
      // Simpan user profile dengan role ke database
      const { error: dbError } = await supabase.from('users').insert([
        {
          id: authData.user.id,
          email,
          name,
          role,
          created_at: new Date().toISOString(),
        },
      ]);

      if (dbError) {
        return { error: dbError.message, data: null };
      }
    }

    return { data: authData, error: null };
  } catch (error) {
    return { error: String(error), data: null };
  }
}

// Login
export async function logIn({ email, password }: LoginInput) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: error.message, data: null };
    }

    return { data, error: null };
  } catch (error) {
    return { error: String(error), data: null };
  }
}

// Logout
export async function logOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { error: error.message };
    }
    return { error: null };
  } catch (error) {
    return { error: String(error) };
  }
}

// Get current user
export async function getCurrentUser() {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      return { data: null, error: error.message };
    }
    return { data: data?.user, error: null };
  } catch (error) {
    return { data: null, error: String(error) };
  }
}

// Get user profile dengan role
export async function getUserProfile(userId: string) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error: String(error) };
  }
}

// Update user role
export async function updateUserRole(userId: string, newRole: UserRole) {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ role: newRole })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error: String(error) };
  }
}
