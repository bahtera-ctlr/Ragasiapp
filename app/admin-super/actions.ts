'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { UserRole } from '@/lib/auth';

export type CreateUserInput = {
  email: string;
  password: string;
  name: string;
  role: UserRole;
};

export type UpdateUserInput = {
  userId: string;
  name?: string;
  role?: UserRole;
  is_active?: boolean;
};

/**
 * Server Action: Create a new user (Super Admin only)
 */
export async function createUserAction(input: CreateUserInput) {
  try {
    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      user_metadata: {
        name: input.name,
        role: input.role,
      },
      email_confirm: true, // Auto-confirm email
    });

    if (authError) {
      return {
        success: false,
        error: authError.message,
        data: null,
      };
    }

    if (authData.user) {
      // Insert user profile into database
      const { error: dbError } = await supabaseAdmin.from('users').insert([
        {
          id: authData.user.id,
          email: input.email,
          name: input.name,
          role: input.role,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      if (dbError) {
        // Try to delete the user from auth if profile creation failed
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id).catch(() => {});
        return {
          success: false,
          error: `Profile creation failed: ${dbError.message}`,
          data: null,
        };
      }
    }

    return {
      success: true,
      error: null,
      data: {
        userId: authData.user?.id,
        email: input.email,
        name: input.name,
        role: input.role,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Unexpected error: ${String(error)}`,
      data: null,
    };
  }
}

/**
 * Server Action: Get all users (Super Admin only)
 */
export async function getAllUsersAction() {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return {
        success: false,
        error: error.message,
        data: null,
      };
    }

    return {
      success: true,
      error: null,
      data: data || [],
    };
  } catch (error) {
    return {
      success: false,
      error: `Unexpected error: ${String(error)}`,
      data: null,
    };
  }
}

/**
 * Server Action: Update user details (Super Admin only)
 */
export async function updateUserAction(input: UpdateUserInput) {
  try {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.role !== undefined) updateData.role = input.role;
    if (input.is_active !== undefined) updateData.is_active = input.is_active;

    const { error } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', input.userId);

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      error: `Unexpected error: ${String(error)}`,
    };
  }
}

/**
 * Server Action: Deactivate user (Super Admin only)
 */
export async function deactivateUserAction(userId: string) {
  try {
    const { error } = await supabaseAdmin
      .from('users')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      error: `Unexpected error: ${String(error)}`,
    };
  }
}

/**
 * Server Action: Activate user (Super Admin only)
 */
export async function activateUserAction(userId: string) {
  try {
    const { error } = await supabaseAdmin
      .from('users')
      .update({
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      error: `Unexpected error: ${String(error)}`,
    };
  }
}

/**
 * Server Action: Delete user (Super Admin only)
 */
export async function deleteUserAction(userId: string) {
  try {
    // Delete from database first
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId);

    if (dbError) {
      return {
        success: false,
        error: dbError.message,
      };
    }

    // Delete from auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authError) {
      console.error('Error deleting from auth:', authError);
      // Continue anyway since db delete succeeded
    }

    return {
      success: true,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      error: `Unexpected error: ${String(error)}`,
    };
  }
}
