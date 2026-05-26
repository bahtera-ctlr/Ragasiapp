import { supabase } from '@/lib/supabase';

export interface SalesReportRow {
  id?: string;
  no_outlet?: string;
  nama_outlet: string;
  status?: string;
  me?: string;
  cluster?: string;
  kelompok?: string;
  target?: number;
  pencapaian?: number;
  pt_persen?: number;
  pt_selisih?: number;
  t_poin?: number;
  p_poin?: number;
  poin_persen?: number;
  report_name?: string;
  created_by?: string;
  created_at?: string;
}

const SALES_COLS = 'id,no_outlet,nama_outlet,status,me,cluster,kelompok,target,pencapaian,pt_persen,pt_selisih,t_poin,p_poin,poin_persen,report_name,created_at';

async function salesAuthCheck(): Promise<{ userId: string } | { error: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'User not authenticated' };
  const { data } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (!data || data.role !== 'super_admin') return { error: 'Only super admin can modify sales report' };
  return { userId: user.id };
}

async function salesReadAuthCheck(): Promise<{ userId: string } | { error: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'User not authenticated' };
  const { data } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (!data || !['super_admin', 'marketing'].includes(data.role)) return { error: 'Access denied' };
  return { userId: user.id };
}

/** Fetch all rows from sales_report. Readable by super_admin + marketing. */
export async function getSalesReport(): Promise<{ data?: SalesReportRow[]; reportName?: string; error?: string }> {
  try {
    const auth = await salesReadAuthCheck();
    if ('error' in auth) return { error: auth.error };

    const PAGE_SIZE = 1000;
    const allData: SalesReportRow[] = [];
    let page = 0;

    while (true) {
      const { data, error } = await supabase
        .from('sales_report')
        .select(SALES_COLS)
        .order('created_at', { ascending: true })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (error) return { error: error.message };
      if (!data || data.length === 0) break;
      allData.push(...(data as SalesReportRow[]));
      if (data.length < PAGE_SIZE) break;
      page++;
    }

    const reportName = allData[0]?.report_name ?? '';
    return { data: allData, reportName };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/** Delete all existing rows then batch-insert new ones. Super admin only. */
export async function replaceSalesReport(
  rows: Omit<SalesReportRow, 'id' | 'created_at'>[],
  reportName: string
): Promise<{ count?: number; error?: string }> {
  try {
    const auth = await salesAuthCheck();
    if ('error' in auth) return { error: auth.error };

    // Delete all existing rows in chunks
    while (true) {
      const { data: existing } = await supabase.from('sales_report').select('id').limit(500);
      if (!existing || existing.length === 0) break;
      const ids = existing.map((r: { id: string }) => r.id);
      const { error: delErr } = await supabase.from('sales_report').delete().in('id', ids);
      if (delErr) return { error: delErr.message };
      if (ids.length < 500) break;
    }

    if (rows.length === 0) return { count: 0 };

    // Batch insert in chunks of 500
    const CHUNK = 500;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK).map(r => ({
        ...r,
        report_name: reportName,
        created_by: auth.userId,
      }));
      const { error: insErr } = await supabase.from('sales_report').insert(chunk);
      if (insErr) return { error: insErr.message };
      inserted += chunk.length;
    }

    return { count: inserted };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/** Delete all rows from sales_report. Super admin only. */
export async function deleteAllSalesReport(): Promise<{ count?: number; error?: string }> {
  try {
    const auth = await salesAuthCheck();
    if ('error' in auth) return { error: auth.error };

    let total = 0;
    while (true) {
      const { data } = await supabase.from('sales_report').select('id').limit(500);
      if (!data || data.length === 0) break;
      const ids = data.map((r: { id: string }) => r.id);
      const { error } = await supabase.from('sales_report').delete().in('id', ids);
      if (error) return { error: error.message };
      total += ids.length;
      if (ids.length < 500) break;
    }
    return { count: total };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
