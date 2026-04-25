import { supabase } from '@/lib/supabase';
import { UserRole } from './auth';

export async function checkUserRole(userId: string): Promise<UserRole | null> {
  try {
    const { data } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (!data) return null;
    return data.role;
  } catch {
    return null;
  }
}

export async function requireRole(userId: string, requiredRoles: UserRole[]) {
  const role = await checkUserRole(userId);
  if (!role || !requiredRoles.includes(role)) {
    throw new Error('Unauthorized: Insufficient permissions');
  }
  return role;
}

export const rolePermissions: Record<UserRole, string[]> = {
  super_admin: [
    'manage_users',
    'manage_roles',
    'view_reports',
    'manage_inventory',
    'manage_sales',
    'manage_finance',
    'manage_marketing',
    'manage_logistics',
    'manage_expedition',
  ],
  admin_keuangan: [
    'view_finance_reports',
    'manage_invoices',
    'view_inventory',
    'view_sales',
  ],
  marketing: [
    'manage_campaigns',
    'view_sales',
    'view_inventory_low_stock',
  ],
  fakturis: [
    'manage_invoices',
    'manage_receipts',
    'view_sales',
  ],
  admin_logistik: [
    'manage_inventory',
    'view_orders',
    'manage_warehouse',
  ],
  admin_ekspedisi: [
    'view_orders',
    'manage_shipments',
    'track_delivery',
  ],
};

export function hasPermission(role: UserRole, permission: string): boolean {
  const permissions = rolePermissions[role] || [];
  return permissions.includes(permission);
}

export const roleColors: Record<UserRole, string> = {
  admin_keuangan: 'bg-green-900 text-green-200',
  marketing: 'bg-purple-900 text-purple-200',
  fakturis: 'bg-blue-900 text-blue-200',
  admin_logistik: 'bg-orange-900 text-orange-200',
  admin_ekspedisi: 'bg-red-900 text-red-200',
  super_admin: 'bg-yellow-900 text-yellow-200',
};

export const roleLabels: Record<UserRole, string> = {
  admin_keuangan: 'Admin Keuangan',
  marketing: 'Marketing',
  fakturis: 'Fakturis',
  admin_logistik: 'Admin Logistik',
  admin_ekspedisi: 'Admin Ekspedisi',
  super_admin: 'Super Admin',
};
