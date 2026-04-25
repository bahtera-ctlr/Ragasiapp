import { supabase } from './supabase';

export interface OrderItem {
  product_id: string;
  product_name: string;
  qty: number;
  price: number;
  discount: number;
  subtotal: number;
}

export interface CreateOrderInput {
  outlet_id: string;
  marketing_id: string;
  items: OrderItem[];
  total_amount: number;
  total_discount: number;
  notes?: string;
}

export interface UpdateOrderInput {
  status?: string;
  notes?: string;
  items?: OrderItem[];
  total_amount?: number;
}

// CREATE ORDER
export async function createOrder(input: CreateOrderInput) {
  try {
    const { data, error } = await supabase.from('orders').insert([
      {
        outlet_id: input.outlet_id,
        marketing_id: input.marketing_id,
        items: input.items,
        total_amount: input.total_amount,
        total_discount: input.total_discount,
        notes: input.notes,
      },
    ]).select();

    if (error) {
      return { error: error.message, data: null };
    }

    return { data: data?.[0], error: null };
  } catch (error) {
    return { error: String(error), data: null };
  }
}

// GET ORDERS WITH OUTLET INFO
export async function getOrders(filters?: {
  outlet_id?: string;
  status?: string;
  marketing_id?: string;
}) {
  try {
    let query = supabase.from('orders').select('*');

    if (filters?.outlet_id) {
      query = query.eq('outlet_id', filters.outlet_id);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.marketing_id) {
      query = query.eq('marketing_id', filters.marketing_id);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return { error: error.message, data: null };
    }

    // Fetch outlet info for each order
    if (data && data.length > 0) {
      const outletIds = [...new Set(data.map(ord => ord.outlet_id))];
      const { data: outletsData } = await supabase
        .from('outlets')
        .select('id, name')
        .in('id', outletIds);

      // Merge outlet data
      const outletMap = new Map(outletsData?.map(o => [o.id, o.name]) || []);
      const enhancedData = data.map(order => ({
        ...order,
        outlet_name: outletMap.get(order.outlet_id) || order.outlet_id
      }));

      return { data: enhancedData, error: null };
    }

    return { data, error: null };
  } catch (error) {
    return { error: String(error), data: null };
  }
}

// GET ORDER BY ID
export async function getOrderById(orderId: string) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error) {
      return { error: error.message, data: null };
    }

    // Fetch outlet name
    if (data) {
      const { data: outletData } = await supabase
        .from('outlets')
        .select('id, name')
        .eq('id', data.outlet_id)
        .single();

      return { data: { ...data, outlet_name: outletData?.name || data.outlet_id }, error: null };
    }

    return { data, error: null };
  } catch (error) {
    return { error: String(error), data: null };
  }
}

// UPDATE ORDER
export async function updateOrder(orderId: string, input: UpdateOrderInput) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select();

    if (error) {
      return { error: error.message, data: null };
    }

    return { data: data?.[0], error: null };
  } catch (error) {
    return { error: String(error), data: null };
  }
}

// DELETE ORDER
export async function deleteOrder(orderId: string) {
  try {
    const { error } = await supabase.from('orders').delete().eq('id', orderId);

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  } catch (error) {
    return { error: String(error) };
  }
}

// ====== INVOICE FUNCTIONS ======

export interface CreateInvoiceInput {
  order_id: string;
  outlet_id: string;
  amount: number;
  notes?: string;
}

// CREATE INVOICE
export async function createInvoice(input: CreateInvoiceInput) {
  try {
    const { data, error } = await supabase.from('invoices').insert([
      {
        order_id: input.order_id,
        outlet_id: input.outlet_id,
        amount: input.amount,
        status: 'posted',
        notes: input.notes,
      },
    ]).select();

    if (error) {
      return { error: error.message, data: null };
    }

    return { data: data?.[0], error: null };
  } catch (error) {
    return { error: String(error), data: null };
  }
}

// GET INVOICES
export async function getInvoices(filters?: {
  outlet_id?: string;
  status?: string;
}) {
  try {
    // Fetch invoices without inner join to avoid RLS issues
    let query = supabase.from('invoices').select('*');

    if (filters?.outlet_id) {
      query = query.eq('outlet_id', filters.outlet_id);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data: invoicesData, error: invoicesError } = await query.order('created_at', { ascending: false });

    if (invoicesError) {
      console.error('Error fetching invoices:', invoicesError);
      return { error: invoicesError.message, data: null };
    }

    if (!invoicesData || invoicesData.length === 0) {
      console.log('No invoices found');
      return { data: [], error: null };
    }

    // Fetch outlet data separately
    const outletIds = [...new Set(invoicesData.map(inv => inv.outlet_id))];
    const { data: outletsData, error: outletsError } = await supabase
      .from('outlets')
      .select('*')
      .in('id', outletIds);

    if (outletsError) {
      console.error('Error fetching outlets:', outletsError);
      // Return invoices without outlet data if fetch fails
      return { data: invoicesData, error: null };
    }

    // Create outlet map
    const outletMap = new Map((outletsData || []).map(o => [o.id, o]));

    // Fetch order data to get items
    const orderIds = [...new Set(invoicesData.map(inv => inv.order_id))];
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('id, items, shipping_request')
      .in('id', orderIds);

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      // Continue without order items if fetch fails
    }

    console.log('Orders fetched:', ordersData?.length, 'orders');
    console.log('Sample order items:', ordersData?.[0]?.items);

    // Create order items map
    const orderItemsMap = new Map((ordersData || []).map(o => [o.id, o.items]));
    const shippingRequestMap = new Map((ordersData || []).map(o => [o.id, o.shipping_request]));

    // Merge outlet data and order items
    const enhancedData = invoicesData.map(invoice => ({
      ...invoice,
      outlet: outletMap.get(invoice.outlet_id) || null,
      items: orderItemsMap.get(invoice.order_id) || [],
      shipping_request: shippingRequestMap.get(invoice.order_id) || null
    }));

    console.log(`Fetched ${enhancedData.length} invoices with outlet data and items`);
    if (enhancedData.length > 0) {
      console.log('Sample outlet data:', enhancedData[0]?.outlet);
      console.log('Sample invoice items:', enhancedData[0]?.items);
    }
    return { data: enhancedData, error: null };
  } catch (error) {
    console.error('Error in getInvoices:', error);
    return { error: String(error), data: null };
  }
}

// GET PENDING INVOICES BY MARKETING ID (draft/posted - not yet released by finance)
export async function getPendingInvoicesByMarketing(marketingId: string) {
  try {
    // Fetch all invoices with draft/posted status (pending finance review)
    const { data: invoicesData, error: invoicesError } = await supabase
      .from('invoices')
      .select('*')
      .in('status', ['draft', 'posted'])
      .order('created_at', { ascending: false });

    if (invoicesError) {
      console.error('Error fetching pending invoices:', invoicesError);
      return { error: invoicesError.message, data: null };
    }

    if (!invoicesData || invoicesData.length === 0) {
      return { data: [], error: null };
    }

    // Get the order IDs from invoices
    const orderIds = [...new Set(invoicesData.map(inv => inv.order_id))];

    if (orderIds.length === 0) {
      return { data: [], error: null };
    }

    // Fetch orders to filter by marketing_id AND get order created_at, items and shipping_request
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('id, created_at, items, shipping_request')
      .eq('marketing_id', marketingId)
      .in('id', orderIds);

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      return { error: ordersError.message, data: null };
    }

    if (!ordersData || ordersData.length === 0) {
      return { data: [], error: null };
    }

    // Filter invoices to only those with matching orders
    const matchingOrderIds = ordersData.map(o => o.id);
    const orderMap = new Map(ordersData.map(o => [o.id, o]));
    const filteredInvoices = invoicesData.filter(inv => 
      matchingOrderIds.includes(inv.order_id)
    );

    // Fetch outlet data
    if (filteredInvoices.length > 0) {
      const { data: outletsData } = await supabase
        .from('outlets')
        .select('*');

      // Merge outlet and order data
      const outletMap = new Map((outletsData || []).map(o => [o.id, o]));
      const enhancedData = filteredInvoices.map(invoice => ({
        ...invoice,
        outlet: outletMap.get(invoice.outlet_id) || null,
        order_created_at: orderMap.get(invoice.order_id)?.created_at || invoice.created_at,
        items: orderMap.get(invoice.order_id)?.items || [],
        shipping_request: orderMap.get(invoice.order_id)?.shipping_request || null
      }));

      return { data: enhancedData, error: null };
    }

    return { data: [], error: null };
  } catch (error) {
    console.error('Error in getPendingInvoicesByMarketing:', error);
    return { error: String(error), data: null };
  }
}

// GET INVOICES BY MARKETING ID - WITH OUTLET INFO (RELEASED/REJECTED/PAID)
export async function getInvoicesByMarketing(marketingId: string) {
  try {
    // Fetch all invoices with released/rejected/paid status first
    const { data: invoicesData, error: invoicesError } = await supabase
      .from('invoices')
      .select('*')
      .in('status', ['released', 'rejected', 'paid'])
      .order('created_at', { ascending: false });

    if (invoicesError) {
      console.error('Error fetching invoices:', invoicesError);
      return { error: invoicesError.message, data: null };
    }

    if (!invoicesData || invoicesData.length === 0) {
      return { data: [], error: null };
    }

    // Get the order IDs from invoices
    const orderIds = [...new Set(invoicesData.map(inv => inv.order_id))];

    if (orderIds.length === 0) {
      return { data: [], error: null };
    }

    // Fetch orders to filter by marketing_id AND get order created_at, items and shipping_request
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('id, created_at, items, shipping_request')
      .eq('marketing_id', marketingId)
      .in('id', orderIds);

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      return { error: ordersError.message, data: null };
    }

    if (!ordersData || ordersData.length === 0) {
      return { data: [], error: null };
    }

    // Filter invoices to only those with matching orders
    const matchingOrderIds = ordersData.map(o => o.id);
    const orderMap = new Map(ordersData.map(o => [o.id, o]));
    const filteredInvoices = invoicesData.filter(inv => 
      matchingOrderIds.includes(inv.order_id)
    );

    // Fetch outlet data
    if (filteredInvoices.length > 0) {
      const { data: outletsData } = await supabase
        .from('outlets')
        .select('*');

      console.log('Outlets data:', outletsData);

      // Merge outlet and order data
      const outletMap = new Map((outletsData || []).map(o => [o.id, o]));
      const enhancedData = filteredInvoices.map(invoice => ({
        ...invoice,
        outlet: outletMap.get(invoice.outlet_id) || null,
        order_created_at: orderMap.get(invoice.order_id)?.created_at || invoice.created_at,
        items: orderMap.get(invoice.order_id)?.items || [],
        shipping_request: orderMap.get(invoice.order_id)?.shipping_request || null
      }));

      return { data: enhancedData, error: null };
    }

    return { data: [], error: null };
  } catch (error) {
    console.error('Error in getInvoicesByMarketing:', error);
    return { error: String(error), data: null };
  }
}

// UPDATE INVOICE - Only before released
export async function updateInvoice(invoiceId: string, input: Partial<CreateInvoiceInput>) {
  try {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.amount !== undefined) updateData.amount = input.amount;
    if (input.notes !== undefined) updateData.notes = input.notes;

    const { data, error } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', invoiceId)
      .select();

    if (error) {
      return { error: error.message, data: null };
    }

    return { data: data?.[0], error: null };
  } catch (error) {
    return { error: String(error), data: null };
  }
}

// GET INVOICE BY ID
export async function getInvoiceById(invoiceId: string) {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        orders!inner(*)
      `)
      .eq('id', invoiceId)
      .single();

    if (error) {
      return { error: error.message, data: null };
    }

    return { data, error: null };
  } catch (error) {
    return { error: String(error), data: null };
  }
}

// RELEASE INVOICE (Approve oleh admin keuangan)
// POST INVOICE (Marketing posts invoice untuk admin keuangan review)
export async function postInvoice(invoiceId: string) {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .update({
        status: 'posted',
      })
      .eq('id', invoiceId)
      .select();

    if (error) {
      return { error: error.message, data: null };
    }

    return { data: data?.[0], error: null };
  } catch (error) {
    return { error: String(error), data: null };
  }
}

// RELEASE INVOICE (Admin Keuangan approves invoice)
export async function releaseInvoice(invoiceId: string, releasedByUserId: string, keuanganNotes?: string) {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .update({
        status: 'released',
        released_by: releasedByUserId,
        released_at: new Date().toISOString(),
        keuangan_notes: keuanganNotes || null,
        keuangan_reviewed_by: releasedByUserId,
        keuangan_reviewed_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)
      .select();

    if (error) {
      return { error: error.message, data: null };
    }

    return { data: data?.[0], error: null };
  } catch (error) {
    return { error: String(error), data: null };
  }
}

// REJECT INVOICE (Admin Keuangan rejects invoice)
export async function rejectInvoice(invoiceId: string, rejectedByUserId: string, rejectionReason: string) {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .update({
        status: 'rejected',
        keuangan_notes: rejectionReason,
        keuangan_reviewed_by: rejectedByUserId,
        keuangan_reviewed_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)
      .select();

    if (error) {
      return { error: error.message, data: null };
    }

    return { data: data?.[0], error: null };
  } catch (error) {
    return { error: String(error), data: null };
  }
}

// ====== SHIPMENT FUNCTIONS ======

export interface CreateShipmentInput {
  order_id: string;
}

// CREATE SHIPMENT
export async function createShipment(input: CreateShipmentInput) {
  try {
    const { data, error } = await supabase.from('shipments').insert([
      {
        order_id: input.order_id,
        status: 'pending',
      },
    ]).select();

    if (error) {
      return { error: error.message, data: null };
    }

    return { data: data?.[0], error: null };
  } catch (error) {
    return { error: String(error), data: null };
  }
}

// UPDATE SHIPMENT STATUS
export async function updateShipmentStatus(
  shipmentId: string,
  status: 'pending' | 'packing' | 'packed' | 'shipped' | 'delivered',
  notes?: string
) {
  try {
    const updateData: Record<string, unknown> = {
      status,
    };

    if (status === 'packing' || status === 'packed') {
      updateData.packing_notes = notes;
    } else if (status === 'shipped' || status === 'delivered') {
      updateData.delivery_notes = notes;
    }

    const { data, error } = await supabase
      .from('shipments')
      .update(updateData)
      .eq('id', shipmentId)
      .select();

    if (error) {
      return { error: error.message, data: null };
    }

    return { data: data?.[0], error: null };
  } catch (error) {
    return { error: String(error), data: null };
  }
}

// GET SHIPMENTS
export async function getShipments(filters?: { status?: string }) {
  try {
    let query = supabase.from('shipments').select(`
      *,
      orders!inner(*)
    `);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return { error: error.message, data: null };
    }

    return { data, error: null };
  } catch (error) {
    return { error: String(error), data: null };
  }
}

// ====== LOGISTIK IN FUNCTIONS ======

// GET RELEASED INVOICES FOR LOGISTIK IN
export async function getReleasedInvoices() {
  try {
    // Fetch all released invoices
    const { data: invoicesData, error: invoicesError } = await supabase
      .from('invoices')
      .select('*')
      .eq('status', 'released')
      .order('released_at', { ascending: false });

    if (invoicesError) {
      console.error('Error fetching released invoices:', invoicesError);
      return { error: invoicesError.message, data: null };
    }

    if (!invoicesData || invoicesData.length === 0) {
      return { data: [], error: null };
    }

    // Fetch order items from the orders table, also include order outlet_id for fallback matching
    const orderIds = [...new Set(invoicesData.map(inv => inv.order_id))].filter(Boolean);
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('id, items, outlet_id, shipping_request')
      .in('id', orderIds);

    if (ordersError) {
      console.error('Error fetching order items for released invoices:', ordersError);
    }

    const outletIds = [...new Set(invoicesData.map(inv => inv.outlet_id))].filter(Boolean);
    const orderOutletIds = [...new Set((ordersData || []).map(order => order.outlet_id))].filter(Boolean);

    // Fetch specific outlets by id or by nio to handle refreshed outlet data
    let outletsData: Record<string, unknown>[] = [];
    let outletsError: unknown = null;

    if (outletIds.length > 0) {
      const [byIdResult, byNioResult] = await Promise.all([
        supabase.from('outlets').select('id, nio, name, me').in('id', outletIds),
        supabase.from('outlets').select('id, nio, name, me').in('nio', outletIds)
      ]);

      outletsData = [...(byIdResult.data || []), ...(byNioResult.data || [])];
      outletsError = byIdResult.error || byNioResult.error;
    }

    if (orderOutletIds.length > 0) {
      const [byIdResult, byNioResult] = await Promise.all([
        supabase.from('outlets').select('id, nio, name, me').in('id', orderOutletIds),
        supabase.from('outlets').select('id, nio, name, me').in('nio', orderOutletIds)
      ]);

      outletsData = [...outletsData, ...(byIdResult.data || []), ...(byNioResult.data || [])];
      outletsError = outletsError || byIdResult.error || byNioResult.error;
    }

    // Deduplicate outlets by id
    const outletMap = new Map((outletsData || []).map((o: Record<string, unknown>) => [o.id, o]));
    const outletMapByNio = new Map((outletsData || []).map((o: Record<string, unknown>) => [String(o.nio), o]));

    if (outletsError) {
      console.error('Error fetching outlets:', outletsError);
    }

    // Merge outlet data with fallback: invoice outlet_id -> id or nio, then order outlet_id -> id or nio
    const orderItemsMap = new Map((ordersData || []).map(order => [order.id, order.items]));
    const orderOutletMap = new Map((ordersData || []).map(order => [order.id, order.outlet_id]));
    const shippingRequestMap = new Map((ordersData || []).map(order => [order.id, order.shipping_request]));

    const enhancedData = invoicesData.map(invoice => {
      const invoiceOutletId = invoice.outlet_id;
      const orderOutletId = orderOutletMap.get(invoice.order_id);

      const outletFromInvoiceId = outletMap.get(invoiceOutletId) || outletMapByNio.get(String(invoiceOutletId));
      const outletFromOrderId = orderOutletId ? outletMap.get(orderOutletId) || outletMapByNio.get(String(orderOutletId)) : null;
      const outlet = outletFromInvoiceId || outletFromOrderId || null;

      return {
        ...invoice,
        outlet,
        items: orderItemsMap.get(invoice.order_id) || [],
        shipping_request: shippingRequestMap.get(invoice.order_id) || null
      };
    });

    return { data: enhancedData, error: null };
  } catch (error) {
    console.error('Error in getReleasedInvoices:', error);
    return { error: String(error), data: null };
  }
}

// GET PACKED INVOICES FOR LOGISTIK OUT (Admin Logistik Out - ready to ship)
export async function getPackedInvoices() {
  try {
    // Fetch all packed/terpacking invoices
    const { data: invoicesData, error: invoicesError } = await supabase
      .from('invoices')
      .select('*')
      .eq('status', 'released')
      .eq('logistik_in_status', 'terpacking')
      .order('packing_verified_at', { ascending: false });

    if (invoicesError) {
      console.error('Error fetching packed invoices:', invoicesError);
      return { error: invoicesError.message, data: null };
    }

    if (!invoicesData || invoicesData.length === 0) {
      return { data: [], error: null };
    }

    // Fetch outlet data
    const { data: outletsData } = await supabase
      .from('outlets')
      .select('*');

    // Merge outlet data
    const outletMap = new Map((outletsData || []).map(o => [o.id, o]));
    const enhancedData = invoicesData.map(invoice => ({
      ...invoice,
      outlet: outletMap.get(invoice.outlet_id) || null
    }));

    return { data: enhancedData, error: null };
  } catch (error) {
    console.error('Error in getPackedInvoices:', error);
    return { error: String(error), data: null };
  }
}

// UPDATE INVOICE PACKING STATUS (Admin Logistik In)
export async function updateInvoicePackingStatus(
  invoiceId: string,
  packingOfficerName: string,
  packingNotes: string,
  verifiedBy: string,
  expedisiOfficerName?: string,
  shipmentStatus?: string,
  preservePackingVerifiedAt = false
) {
  try {
    const updateData: Record<string, unknown> = {
      logistik_in_status: 'terpacking',
      packing_officer_name: packingOfficerName,
      packing_notes: packingNotes,
      packing_verified_by: verifiedBy,
      updated_at: new Date().toISOString(),
    };

    if (!preservePackingVerifiedAt) {
      updateData.packing_verified_at = new Date().toISOString();
    }

    // If expedisi officer is provided, set shipment status and officer
    if (expedisiOfficerName) {
      updateData.shipment_status = shipmentStatus || 'planned';
      updateData.expedisi_officer_name = expedisiOfficerName;
    }

    const { data, error } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', invoiceId)
      .select();

    if (error) {
      return { error: error.message, data: null };
    }

    return { data: data?.[0], error: null };
  } catch (error) {
    return { error: String(error), data: null };
  }
}

// UPDATE INVOICE FAKTUR STATUS
export async function updateInvoiceFakturStatus(
  invoiceId: string,
  fakturOfficerName: string,
  fakturNotes: string,
  verifiedBy: string
) {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .update({
        faktur_status: 'terfaktur',
        faktur_officer_name: fakturOfficerName,
        faktur_notes: fakturNotes,
        faktur_verified_by: verifiedBy,
        faktur_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)
      .select();

    if (error) {
      return { error: error.message, data: null };
    }

    return { data: data?.[0], error: null };
  } catch (error) {
    return { error: String(error), data: null };
  }
}

// PLAN SHIPMENT (Admin Ekspedisi - Barang Siap Kirim)
export async function planShipment(
  invoiceId: string,
  expedisiOfficerName: string,
  shipmentPlan: string,
  verifiedBy: string
) {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .update({
        shipment_status: 'planned',
        expedisi_officer_name: expedisiOfficerName,
        shipment_plan: shipmentPlan,
        shipment_date: new Date().toISOString(),
        shipment_verified_by: verifiedBy,
        shipment_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)
      .select();

    if (error) {
      return { error: error.message, data: null };
    }

    return { data: data?.[0], error: null };
  } catch (error) {
    return { error: String(error), data: null };
  }
}

// UPDATE SHIPMENT DELIVERY STATUS (Admin Ekspedisi - List Kiriman)
export async function updateShipmentDelivery(
  invoiceId: string,
  deliveryStatus: 'terkirim' | 'gagal_kirim',
  deliveryNotes?: string
) {
  try {
    const updateData: Record<string, unknown> = {
      delivery_status: deliveryStatus,
      delivery_date: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (deliveryNotes) {
      updateData.delivery_notes = deliveryNotes;
    }

    // If failed, reset shipment status to ready for retry
    if (deliveryStatus === 'gagal_kirim') {
      updateData.shipment_status = 'ready';
    } else if (deliveryStatus === 'terkirim') {
      updateData.shipment_status = 'completed';
    }

    const { data, error } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', invoiceId)
      .select();

    if (error) {
      return { error: error.message, data: null };
    }

    return { data: data?.[0], error: null };
  } catch (error) {
    return { error: String(error), data: null };
  }
}

// GET READY TO SHIP INVOICES (Sudah Terfaktur & Terpacking)
export async function getReadyToShipInvoices() {
  try {
    const { data: invoicesData, error: invoicesError } = await supabase
      .from('invoices')
      .select('*')
      .eq('status', 'released')
      .eq('logistik_in_status', 'terpacking')
      .eq('faktur_status', 'terfaktur')
      .eq('shipment_status', 'ready')
      .order('created_at', { ascending: false });

    if (invoicesError) {
      console.error('Error fetching ready to ship invoices:', invoicesError);
      return { error: invoicesError.message, data: null };
    }

    if (!invoicesData || invoicesData.length === 0) {
      return { data: [], error: null };
    }

    // Fetch order data to get shipping_request
    const orderIds = [...new Set(invoicesData.map(inv => inv.order_id))].filter(Boolean);
    const { data: ordersData } = await supabase
      .from('orders')
      .select('id, shipping_request')
      .in('id', orderIds);

    // Fetch outlet data
    const outletIds = [...new Set(invoicesData.map(inv => inv.outlet_id))];
    const { data: outletsData } = await supabase
      .from('outlets')
      .select('*')
      .in('id', outletIds);

    const outletMap = new Map((outletsData || []).map(o => [o.id, o]));
    const shippingRequestMap = new Map((ordersData || []).map(o => [o.id, o.shipping_request]));
    const enhancedData = invoicesData.map(invoice => ({
      ...invoice,
      outlet: outletMap.get(invoice.outlet_id) || null,
      shipping_request: shippingRequestMap.get(invoice.order_id) || null
    }));

    return { data: enhancedData, error: null };
  } catch (error) {
    console.error('Error in getReadyToShipInvoices:', error);
    return { error: String(error), data: null };
  }
}

// GET PLANNED SHIPMENTS (List Kiriman)
export async function getPlannedShipments() {
  try {
    const { data: invoicesData, error: invoicesError } = await supabase
      .from('invoices')
      .select('*')
      .eq('shipment_status', 'planned')
      .is('delivery_status', null)
      .order('shipment_date', { ascending: false });

    if (invoicesError) {
      console.error('Error fetching planned shipments:', invoicesError);
      return { error: invoicesError.message, data: null };
    }

    if (!invoicesData || invoicesData.length === 0) {
      return { data: [], error: null };
    }

    // Fetch order data to get shipping_request
    const orderIds = [...new Set(invoicesData.map(inv => inv.order_id))].filter(Boolean);
    const { data: ordersData } = await supabase
      .from('orders')
      .select('id, shipping_request')
      .in('id', orderIds);

    // Fetch outlet data
    const outletIds = [...new Set(invoicesData.map(inv => inv.outlet_id))];
    const { data: outletsData } = await supabase
      .from('outlets')
      .select('*')
      .in('id', outletIds);

    const outletMap = new Map((outletsData || []).map(o => [o.id, o]));
    const shippingRequestMap = new Map((ordersData || []).map(o => [o.id, o.shipping_request]));
    const enhancedData = invoicesData.map(invoice => ({
      ...invoice,
      outlet: outletMap.get(invoice.outlet_id) || null,
      shipping_request: shippingRequestMap.get(invoice.order_id) || null
    }));

    return { data: enhancedData, error: null };
  } catch (error) {
    console.error('Error in getPlannedShipments:', error);
    return { error: String(error), data: null };
  }
}

// GET COMPLETED SHIPMENTS (Selesai Kirim)
export async function getCompletedShipments() {
  try {
    const { data: invoicesData, error: invoicesError } = await supabase
      .from('invoices')
      .select('*')
      .in('shipment_status', ['completed', 'ready'])
      .in('delivery_status', ['terkirim', 'gagal_kirim'])
      .order('delivery_date', { ascending: false });

    if (invoicesError) {
      console.error('Error fetching completed shipments:', invoicesError);
      return { error: invoicesError.message, data: null };
    }

    if (!invoicesData || invoicesData.length === 0) {
      return { data: [], error: null };
    }

    // Fetch order data to get shipping_request
    const orderIds = [...new Set(invoicesData.map(inv => inv.order_id))].filter(Boolean);
    const { data: ordersData } = await supabase
      .from('orders')
      .select('id, shipping_request')
      .in('id', orderIds);

    // Fetch outlet data
    const outletIds = [...new Set(invoicesData.map(inv => inv.outlet_id))];
    const { data: outletsData } = await supabase
      .from('outlets')
      .select('*')
      .in('id', outletIds);

    const outletMap = new Map((outletsData || []).map(o => [o.id, o]));
    const shippingRequestMap = new Map((ordersData || []).map(o => [o.id, o.shipping_request]));
    const enhancedData = invoicesData.map(invoice => ({
      ...invoice,
      outlet: outletMap.get(invoice.outlet_id) || null,
      shipping_request: shippingRequestMap.get(invoice.order_id) || null
    }));

    return { data: enhancedData, error: null };
  } catch (error) {
    console.error('Error in getCompletedShipments:', error);
    return { error: String(error), data: null };
  }
}
