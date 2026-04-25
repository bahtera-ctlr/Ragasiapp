'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { logOut } from '@/lib/auth';

type OrderItem = {
  product_id: string;
  product_name: string;
  qty: number;
  price: number;
  discount: number;
  subtotal: number;
};

type OrderDetails = {
  id: string;
  items?: OrderItem[];
  created_at?: string;
  [key: string]: unknown;
};
import { getOrderById, updateOrder } from '@/lib/orders';
import { useAuth } from '@/lib/hooks';
import { LoadingSpinner } from '@/app/components/UIComponents';

export default function EditOrderPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;
  
  const { user, loading } = useAuth();

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [items, setItems] = useState<OrderItem[]>([]);

  useEffect(() => {
    if (loading || !user) return;
    fetchOrder();
  }, [loading, user, fetchOrder]);

  const fetchOrder = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getOrderById(orderId);
      if (result.error) {
        alert('Gagal fetch order: ' + result.error);
        router.back();
        return;
      }

      if (result.data) {
        setOrder(result.data);
        setItems(result.data.items || []);
      }
    } finally {
      setIsLoading(false);
    }
  }, [orderId, router]);

  const handleUpdateItem = (idx: number, field: string, value: string | number) => {
    const newItems = [...items];
    newItems[idx] = {
      ...newItems[idx],
      [field]: value,
    };
    setItems(newItems);
  };

  const handleRemoveItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        product_id: '',
        product_name: '',
        qty: 1,
        price: 0,
        discount: 0,
        subtotal: 0,
      },
    ]);
  };

  const calculateTotalAmount = () => {
    return items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
  };

  const handleSaveOrder = async () => {
    if (items.length === 0) {
      alert('Minimal ada 1 item');
      return;
    }

    setIsSaving(true);
    try {
      const result = await updateOrder(orderId, {
        items: items,
        total_amount: calculateTotalAmount(),
      });

      if (result.error) {
        alert('Gagal update order: ' + result.error);
      } else {
        alert('Order berhasil diupdate!');
        router.back();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await logOut();
    router.push('/');
  };

  if (loading || isLoading) return <LoadingSpinner />;

  if (!order) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Order tidak ditemukan</p>
          <button
            onClick={() => router.back()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  const createdDate = new Date(order.created_at);
  const formattedDate = createdDate.toLocaleDateString('id-ID', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  });
  const formattedTime = createdDate.toLocaleTimeString('id-ID', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Edit Sales Order</h1>
            <p className="text-gray-400 text-sm">
              {order.outlet_name || order.outlet_id} - {formattedDate} {formattedTime}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Order Info */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <p className="text-gray-400 text-sm">Order ID</p>
              <p className="text-white font-semibold text-xs">{order.id.slice(0, 8)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Outlet</p>
              <p className="text-white font-semibold">{order.outlet_name || order.outlet_id}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Status</p>
              <span className={`px-3 py-1 rounded text-sm font-medium inline-block ${
                order.status === 'pending'
                  ? 'bg-yellow-900 text-yellow-200'
                  : 'bg-green-900 text-green-200'
              }`}>
                {order.status}
              </span>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Created</p>
              <p className="text-white">{formattedDate} {formattedTime}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Total Amount</p>
              <p className="text-white font-semibold">Rp {calculateTotalAmount().toLocaleString('id-ID')}</p>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-800 border-b border-gray-700">
                  <th className="px-6 py-3 text-left text-sm font-medium">Product</th>
                  <th className="px-6 py-3 text-left text-sm font-medium">Qty</th>
                  <th className="px-6 py-3 text-left text-sm font-medium">Price</th>
                  <th className="px-6 py-3 text-left text-sm font-medium">Discount %</th>
                  <th className="px-6 py-3 text-left text-sm font-medium">Subtotal</th>
                  <th className="px-6 py-3 text-center text-sm font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const subtotal = (item.qty || 0) * (item.price || 0) * (1 - (item.discount || 0) / 100);
                  return (
                    <tr key={idx} className="border-b border-gray-700 hover:bg-gray-800">
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          value={item.product_name || ''}
                          onChange={(e) => handleUpdateItem(idx, 'product_name', e.target.value)}
                          className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm"
                          placeholder="Product name"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="number"
                          min="1"
                          value={item.qty || 1}
                          onChange={(e) => handleUpdateItem(idx, 'qty', Number(e.target.value))}
                          className="w-20 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="number"
                          min="0"
                          value={item.price || 0}
                          onChange={(e) => handleUpdateItem(idx, 'price', Number(e.target.value))}
                          className="w-28 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm"
                          placeholder="Price"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.discount || 0}
                          onChange={(e) => handleUpdateItem(idx, 'discount', Number(e.target.value))}
                          className="w-20 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm"
                        />
                      </td>
                      <td className="px-6 py-4 text-white font-semibold">
                        Rp {subtotal.toLocaleString('id-ID')}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleRemoveItem(idx)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Add Item Button */}
          <div className="border-t border-gray-700 p-4">
            <button
              onClick={handleAddItem}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
            >
              + Tambah Item
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => router.back()}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSaveOrder}
            disabled={isSaving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </main>
    </div>
  );
}
