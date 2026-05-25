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

export interface InvoiceHistory {
  id?: string;
  gudang?: string;
  no_faktur?: number;
  salesman?: string;
  no_outlet?: number;
  outlet_id?: string;
  outlet_name?: string;  // Added: outlet name from join
  nama_barang: string;
  tgl: string;
  qty?: string;
  sat?: string;
  disc?: number;
  dpp?: number;
  penjualan?: number;
  bln?: number;
  principle?: string;
  komposisi?: string;
  me?: string;
  lh_lb?: string;
  created_by?: string;
  created_at: string;
  updated_at?: string;
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

// All columns used in raw data table + pivot
const INVOICE_COLS = 'outlet_name,no_outlet,nama_barang,bln,tgl,penjualan,principle,me,no_faktur,salesman,qty,sat,gudang,disc,dpp,lh_lb,komposisi';
// Subset needed for filtered pivot + raw data table (excludes gudang,disc,dpp,lh_lb,komposisi)
const FILTERED_COLS = 'outlet_name,no_outlet,nama_barang,bln,tgl,penjualan,principle,me,no_faktur,qty,sat,salesman';

async function invoiceAuthCheck(): Promise<{ userId: string } | { error: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'User not authenticated' };
  const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (!userData || userData.role !== 'super_admin') return { error: 'Only super admin can view invoice history' };
  return { userId: user.id };
}

// Read-only auth check: allows super_admin + marketing
async function invoiceReadAuthCheck(): Promise<{ userId: string } | { error: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'User not authenticated' };
  const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (!userData || !['super_admin', 'marketing'].includes(userData.role)) {
    return { error: 'Access denied' };
  }
  return { userId: user.id };
}

type FilterOptionsResult = {
  count?: number;
  outlets?: string[];
  namaBarang?: string[];
  principles?: string[];
  mes?: string[];
  error?: string;
};

type FilterOptionsRpcPayload = {
  outlets: string[];
  nama_barang: string[];
  principles: string[];
  mes: string[];
  count: number;
};

async function callFilterOptionsRpc(): Promise<FilterOptionsResult> {
  const { data, error } = await supabase.rpc('get_invoice_filter_options');
  if (error) return { error: error.message };
  const d = data as FilterOptionsRpcPayload;
  return {
    count: d.count,
    outlets: d.outlets || [],
    namaBarang: d.nama_barang || [],
    principles: d.principles || [],
    mes: d.mes || [],
  };
}

/**
 * Get count + all distinct filter option values via a single DB-level DISTINCT query.
 * Uses the get_invoice_filter_options() RPC function — no max_rows limit.
 */
export async function getInvoiceFilterOptions(): Promise<FilterOptionsResult> {
  try {
    const auth = await invoiceAuthCheck();
    if ('error' in auth) return { error: auth.error };
    return await callFilterOptionsRpc();
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/** Read-only version for marketing + super_admin. */
export async function getInvoiceFilterOptionsReadOnly(): Promise<FilterOptionsResult> {
  try {
    const auth = await invoiceReadAuthCheck();
    if ('error' in auth) return { error: auth.error };
    return await callFilterOptionsRpc();
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/** @deprecated Use getInvoiceFilterOptions() instead. Kept for upload-refresh after CSV insert. */
export async function getAllInvoiceHistory(): Promise<{ data?: InvoiceHistory[]; error?: string }> {
  try {
    const auth = await invoiceAuthCheck();
    if ('error' in auth) return { error: auth.error };
    const { data, error } = await supabase.from('invoice_history').select(INVOICE_COLS).range(0, 999);
    if (error) return { error: error.message };
    return { data: (data || []) as InvoiceHistory[] };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Fetch ALL invoice rows matching the given filters using parallel pagination (5 pages at once).
 * ~5x faster than sequential pagination for large datasets.
 */
export async function getFilteredInvoiceHistory(filters: {
  outlet_name?: string;
  nama_barang?: string;
  principle?: string;
  me?: string;
}): Promise<{ data?: InvoiceHistory[]; error?: string }> {
  try {
    const auth = await invoiceAuthCheck();
    if ('error' in auth) return { error: auth.error };

    const PAGE_SIZE = 1000;
    const BATCH = 5;
    const allData: InvoiceHistory[] = [];
    let startPage = 0;

    const buildQuery = (start: number, end: number) => {
      let q = supabase.from('invoice_history').select(FILTERED_COLS).order('tgl', { ascending: false });
      if (filters.outlet_name) q = q.eq('outlet_name', filters.outlet_name);
      if (filters.nama_barang) q = q.eq('nama_barang', filters.nama_barang);
      if (filters.principle) q = q.eq('principle', filters.principle);
      if (filters.me) q = q.eq('me', filters.me);
      return q.range(start, end);
    };

    while (allData.length < 100000) {
      const results = await Promise.all(
        Array.from({ length: BATCH }, (_, i) => buildQuery(
          (startPage + i) * PAGE_SIZE,
          (startPage + i + 1) * PAGE_SIZE - 1
        ))
      );

      let done = false;
      for (const { data, error } of results) {
        if (error) return { error: error.message };
        if (!data || data.length === 0) { done = true; break; }
        allData.push(...(data as InvoiceHistory[]));
        if (data.length < PAGE_SIZE) { done = true; break; }
      }
      if (done) break;
      startPage += BATCH;
    }

    console.log(`Filtered fetch: ${allData.length} records`);
    return { data: allData };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/** @deprecated Use getInvoiceFilterOptionsReadOnly() instead. */
export async function getAllInvoiceHistoryReadOnly(): Promise<{ data?: InvoiceHistory[]; error?: string }> {
  try {
    const auth = await invoiceReadAuthCheck();
    if ('error' in auth) return { error: auth.error };
    const { data, error } = await supabase.from('invoice_history').select(INVOICE_COLS).range(0, 999);
    if (error) return { error: error.message };
    return { data: (data || []) as InvoiceHistory[] };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/** Read-only: fetch all filtered invoice rows with parallel pagination (~5x faster). */
export async function getFilteredInvoiceHistoryReadOnly(filters: {
  outlet_name?: string;
  nama_barang?: string;
  principle?: string;
  me?: string;
}): Promise<{ data?: InvoiceHistory[]; error?: string }> {
  try {
    const auth = await invoiceReadAuthCheck();
    if ('error' in auth) return { error: auth.error };

    const PAGE_SIZE = 1000;
    const BATCH = 5;
    const allData: InvoiceHistory[] = [];
    let startPage = 0;

    const buildQuery = (start: number, end: number) => {
      let q = supabase.from('invoice_history').select(FILTERED_COLS).order('tgl', { ascending: false });
      if (filters.outlet_name) q = q.eq('outlet_name', filters.outlet_name);
      if (filters.nama_barang) q = q.eq('nama_barang', filters.nama_barang);
      if (filters.principle) q = q.eq('principle', filters.principle);
      if (filters.me) q = q.eq('me', filters.me);
      return q.range(start, end);
    };

    while (allData.length < 100000) {
      const results = await Promise.all(
        Array.from({ length: BATCH }, (_, i) => buildQuery(
          (startPage + i) * PAGE_SIZE,
          (startPage + i + 1) * PAGE_SIZE - 1
        ))
      );

      let done = false;
      for (const { data, error } of results) {
        if (error) return { error: error.message };
        if (!data || data.length === 0) { done = true; break; }
        allData.push(...(data as InvoiceHistory[]));
        if (data.length < PAGE_SIZE) { done = true; break; }
      }
      if (done) break;
      startPage += BATCH;
    }

    return { data: allData };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Delete ALL rows in invoice_history. Super admin only.
 * Uses batched fetch-then-delete (500 rows at a time) to avoid PostgREST bulk-delete restrictions.
 */
export async function deleteAllInvoiceHistory(): Promise<{ count?: number; error?: string }> {
  try {
    const auth = await invoiceAuthCheck();
    if ('error' in auth) return { error: auth.error };

    let totalDeleted = 0;

    while (true) {
      // Fetch a batch of IDs to delete
      const { data: rows, error: fetchError } = await supabase
        .from('invoice_history')
        .select('id')
        .limit(500);

      if (fetchError) return { error: fetchError.message };
      if (!rows || rows.length === 0) break;

      const ids = rows.map((r: { id: string }) => r.id);

      const { error: deleteError } = await supabase
        .from('invoice_history')
        .delete()
        .in('id', ids);

      if (deleteError) return { error: deleteError.message };
      totalDeleted += ids.length;

      if (ids.length < 500) break; // last batch
    }

    return { count: totalDeleted };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Batch import invoice history from CSV
 * Supports chunk sizes up to 5000 per batch to handle large files (10K+ rows)
 */
export async function batchInsertInvoiceHistory(
  records: InvoiceHistory[],
  chunkSize: number = 5000
): Promise<{ count?: number; error?: string }> {
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
      return { error: 'Only super admin can import invoice history' };
    }

    // Prepare records with created_by and timestamps
    const recordsToInsert = records.map(record => ({
      ...record,
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    // Batch insert in configurable chunks (default 5000) to handle large files
    // Using 5000 instead of 1000 to support 10K+ row imports more efficiently
    let totalInserted = 0;
    const errors: string[] = [];

    for (let i = 0; i < recordsToInsert.length; i += chunkSize) {
      const chunk = recordsToInsert.slice(i, i + chunkSize);
      const { error } = await supabase
        .from('invoice_history')
        .insert(chunk);

      if (error) {
        console.error(`Error inserting chunk ${Math.floor(i / chunkSize) + 1}:`, error);
        errors.push(`Chunk ${Math.floor(i / chunkSize) + 1}: ${error.message}`);
        // Continue with next chunk instead of stopping
      } else {
        totalInserted += chunk.length;
      }
    }

    // If we inserted at least some records, return success with partial info
    if (totalInserted > 0) {
      if (errors.length > 0) {
        return { 
          count: totalInserted, 
          error: `Inserted ${totalInserted}/${records.length}. Errors: ${errors.join('; ')}` 
        };
      }
      return { count: totalInserted };
    } else {
      return { error: errors.join('; ') || 'No records inserted' };
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error in batchInsertInvoiceHistory:', err);
    return { error: errMsg };
  }
}

/**
 * Get all outlets with NIO mapping for invoice history enrichment
 */
export async function getOutletsByNio(): Promise<{ [nioKey: string]: { id: string; name: string } } | null> {
  try {
    const { data, error } = await supabase
      .from('outlets')
      .select('id, name, nio')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching outlets:', error);
      return null;
    }

    // Create a mapping from NIO to outlet info
    const nioMap: { [key: string]: { id: string; name: string } } = {};
    (data || []).forEach((outlet: any) => {
      if (outlet.nio) {
        // Support various formats - string representation of the nio
        const nioStr = String(outlet.nio).trim();
        nioMap[nioStr] = {
          id: outlet.id,
          name: outlet.name || `Outlet ${outlet.nio}`
        };
      }
    });

    return nioMap;
  } catch (err) {
    console.error('Error in getOutletsByNio:', err);
    return null;
  }
}

/**
 * Enrich invoice history records with outlet_id by matching NIO
 * Returns records with outlet_id populated if matched
 */
export async function enrichInvoiceHistoryWithOutletId(
  records: InvoiceHistory[]
): Promise<InvoiceHistory[]> {
  try {
    const nioMap = await getOutletsByNio();
    if (!nioMap) {
      console.warn('Could not load outlet NIO mapping, records will have outlet_id = null');
      return records;
    }

    return records.map(record => {
      // Try to match no_outlet (which is actually NIO) to outlet_id
      if (record.no_outlet) {
        const nioStr = String(record.no_outlet).trim();
        const outletInfo = nioMap[nioStr];
        if (outletInfo) {
          return {
            ...record,
            outlet_id: outletInfo.id
          };
        }
      }
      return record;
    });
  } catch (err) {
    console.error('Error in enrichInvoiceHistoryWithOutletId:', err);
    return records;
  }
}

/**
 * Enhanced batch insert that enriches with outlet_id
 */
export async function batchInsertInvoiceHistoryWithOutlets(
  records: InvoiceHistory[],
  chunkSize: number = 5000
): Promise<{ count?: number; error?: string }> {
  // Enrich records with outlet_id first
  const enrichedRecords = await enrichInvoiceHistoryWithOutletId(records);
  // Then do regular batch insert
  return batchInsertInvoiceHistory(enrichedRecords, chunkSize);
}
