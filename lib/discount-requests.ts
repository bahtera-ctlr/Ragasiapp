import { supabase } from './supabase';

export interface DiscountRequest {
  id: string;
  marketing_id: string;
  outlet_id: string;
  product_id: string;
  discount_percentage: number;
  reason: string;
  start_date: string;
  end_date: string;
  status: 'pending' | 'approved' | 'rejected';
  approval_notes?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  outlet?: { name?: string; nio?: string };
  product?: { nama_barang?: string };
  marketing_user?: { name?: string; email?: string };
}

export interface LimitRequest {
  id: string;
  marketing_id: string;
  outlet_id: string;
  current_limit: number;
  requested_limit: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approval_notes?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  // Joined data
  outlet?: { name?: string; nio?: string };
  marketing_user?: { name?: string; email?: string };
}

export interface WithdrawalHistory {
  id: string;
  marketing_id: string;
  outlet_id: string;
  amount: number;
  withdrawal_date: string;
  notes?: string;
  created_at: string;
  // Joined data
  outlet?: { name?: string; nio?: string };
  marketing_user?: { name?: string; email?: string };
}

/**
 * Create a new discount request
 */
export async function createDiscountRequest(
  outletId: string,
  productId: string,
  discountPercentage: number,
  reason: string,
  startDate: string,
  endDate: string
): Promise<{ data?: DiscountRequest; error?: string }> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: 'User not authenticated' };
    }

    // Insert discount request
    const { data, error } = await supabase
      .from('discount_requests')
      .insert([
        {
          marketing_id: user.id,
          outlet_id: outletId,
          product_id: productId,
          discount_percentage: discountPercentage,
          reason,
          start_date: startDate,
          end_date: endDate,
          status: 'pending'
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating discount request:', error);
      return { error: error.message };
    }

    return { data: data as DiscountRequest };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error in createDiscountRequest:', err);
    return { error: errMsg };
  }
}

/**
 * Get all discount requests for current user
 */
export async function getDiscountRequests(): Promise<{ data?: DiscountRequest[]; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .from('discount_requests')
      .select(`
        *,
        outlet:outlets(id, name, nio),
        product:products(id, nama_barang)
      `)
      .eq('marketing_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching discount requests:', error);
      return { error: error.message };
    }

    return { data: data as DiscountRequest[] };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error in getDiscountRequests:', err);
    return { error: errMsg };
  }
}

/**
 * Create a new limit request
 */
export async function createLimitRequest(
  outletId: string,
  currentLimit: number,
  requestedLimit: number,
  reason: string
): Promise<{ data?: LimitRequest; error?: string }> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: 'User not authenticated' };
    }

    // Insert limit request
    const { data, error } = await supabase
      .from('limit_requests')
      .insert([
        {
          marketing_id: user.id,
          outlet_id: outletId,
          current_limit: currentLimit,
          requested_limit: requestedLimit,
          reason,
          status: 'pending'
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating limit request:', error);
      return { error: error.message };
    }

    return { data: data as LimitRequest };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error in createLimitRequest:', err);
    return { error: errMsg };
  }
}

/**
 * Get all limit requests for current user
 */
export async function getLimitRequests(): Promise<{ data?: LimitRequest[]; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .from('limit_requests')
      .select(`
        *,
        outlet:outlets(id, name, nio)
      `)
      .eq('marketing_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching limit requests:', error);
      return { error: error.message };
    }

    return { data: data as LimitRequest[] };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error in getLimitRequests:', err);
    return { error: errMsg };
  }
}

/**
 * Add withdrawal history record
 */
export async function createWithdrawalHistory(
  outletId: string,
  amount: number,
  withdrawalDate: string,
  notes?: string
): Promise<{ data?: WithdrawalHistory; error?: string }> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: 'User not authenticated' };
    }

    // Insert withdrawal history
    const { data, error } = await supabase
      .from('withdrawal_history')
      .insert([
        {
          marketing_id: user.id,
          outlet_id: outletId,
          amount,
          withdrawal_date: withdrawalDate,
          notes
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating withdrawal history:', error);
      return { error: error.message };
    }

    return { data: data as WithdrawalHistory };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error in createWithdrawalHistory:', err);
    return { error: errMsg };
  }
}

/**
 * Get withdrawal history for current user
 */
export async function getWithdrawalHistory(): Promise<{ data?: WithdrawalHistory[]; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .from('withdrawal_history')
      .select(`
        *,
        outlet:outlets(id, name, nio)
      `)
      .eq('marketing_id', user.id)
      .order('withdrawal_date', { ascending: false });

    if (error) {
      console.error('Error fetching withdrawal history:', error);
      return { error: error.message };
    }

    return { data: data as WithdrawalHistory[] };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error in getWithdrawalHistory:', err);
    return { error: errMsg };
  }
}

/**
 * Get all discount requests (admin only - for approval)
 */
export async function getAllDiscountRequests(): Promise<{ data?: DiscountRequest[]; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: 'User not authenticated' };
    }

    // Get user role to verify admin access
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || userData.role !== 'super_admin') {
      return { error: 'Only super admin can view all discount requests' };
    }

    const { data, error } = await supabase
      .from('discount_requests')
      .select(`
        *,
        outlet:outlets(id, name, nio),
        product:products(id, nama_barang)
      `)
      .order('created_at', { ascending: false });

    // Fetch marketing user data separately if needed
    if (data && data.length > 0) {
      const marketingIds = [...new Set(data.map(d => d.marketing_id))];
      const { data: usersData } = await supabase
        .from('users')
        .select('id, name, email')
        .in('id', marketingIds);

      const usersMap = (usersData || []).reduce((acc: any, user) => {
        acc[user.id] = { name: user.name, email: user.email };
        return acc;
      }, {});

      // Attach marketing user data to each discount request
      (data as any).forEach((request: any) => {
        request.marketing_user = usersMap[request.marketing_id] || { name: 'Unknown', email: 'unknown@example.com' };
      });
    }

    if (error) {
      console.error('Error fetching all discount requests:', error);
      return { error: error.message };
    }

    return { data: data as DiscountRequest[] };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error in getAllDiscountRequests:', err);
    return { error: errMsg };
  }
}

/**
 * Approve discount request (admin only)
 */
export async function approveDiscountRequest(
  requestId: string,
  approvalNotes?: string
): Promise<{ data?: DiscountRequest; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .from('discount_requests')
      .update({
        status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        approval_notes: approvalNotes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select()
      .single();

    if (error) {
      console.error('Error approving discount request:', error);
      return { error: error.message };
    }

    return { data: data as DiscountRequest };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error in approveDiscountRequest:', err);
    return { error: errMsg };
  }
}

/**
 * Reject discount request (admin only)
 */
export async function rejectDiscountRequest(
  requestId: string,
  rejectionReason: string
): Promise<{ data?: DiscountRequest; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .from('discount_requests')
      .update({
        status: 'rejected',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        approval_notes: rejectionReason,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select()
      .single();

    if (error) {
      console.error('Error rejecting discount request:', error);
      return { error: error.message };
    }

    return { data: data as DiscountRequest };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error in rejectDiscountRequest:', err);
    return { error: errMsg };
  }
}

/**
 * Get all limit requests (admin only - for approval)
 */
export async function getAllLimitRequests(): Promise<{ data?: LimitRequest[]; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: 'User not authenticated' };
    }

    // Get user role to verify admin access
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || userData.role !== 'super_admin') {
      return { error: 'Only super admin can view all limit requests' };
    }

    const { data, error } = await supabase
      .from('limit_requests')
      .select(`
        *,
        outlet:outlets(id, name, nio)
      `)
      .order('created_at', { ascending: false });

    // Fetch marketing user data separately if needed
    if (data && data.length > 0) {
      const marketingIds = [...new Set(data.map(d => d.marketing_id))];
      const { data: usersData } = await supabase
        .from('users')
        .select('id, name, email')
        .in('id', marketingIds);

      const usersMap = (usersData || []).reduce((acc: any, user) => {
        acc[user.id] = { name: user.name, email: user.email };
        return acc;
      }, {});

      // Attach marketing user data to each limit request
      (data as any).forEach((request: any) => {
        request.marketing_user = usersMap[request.marketing_id] || { name: 'Unknown', email: 'unknown@example.com' };
      });
    }

    if (error) {
      console.error('Error fetching all limit requests:', error);
      return { error: error.message };
    }

    return { data: data as LimitRequest[] };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error in getAllLimitRequests:', err);
    return { error: errMsg };
  }
}

/**
 * Approve limit request (admin only)
 */
export async function approveLimitRequest(
  requestId: string,
  approvalNotes?: string
): Promise<{ data?: LimitRequest; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .from('limit_requests')
      .update({
        status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        approval_notes: approvalNotes || null
      })
      .eq('id', requestId)
      .select()
      .single();

    if (error) {
      console.error('Error approving limit request:', error);
      return { error: error.message };
    }

    return { data: data as LimitRequest };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error in approveLimitRequest:', err);
    return { error: errMsg };
  }
}

/**
 * Reject limit request (admin only)
 */
export async function rejectLimitRequest(
  requestId: string,
  rejectionReason: string
): Promise<{ data?: LimitRequest; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .from('limit_requests')
      .update({
        status: 'rejected',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        approval_notes: rejectionReason
      })
      .eq('id', requestId)
      .select()
      .single();

    if (error) {
      console.error('Error rejecting limit request:', error);
      return { error: error.message };
    }

    return { data: data as LimitRequest };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error in rejectLimitRequest:', err);
    return { error: errMsg };
  }
}
