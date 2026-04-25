'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { logOut } from '@/lib/auth';
import { LoadingSpinner } from '@/app/components/UIComponents';

interface User {
  id: string;
  email?: string;
}

interface UserProfile {
  role?: string;
  [key: string]: unknown;
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();

        if (error || !data.user) {
          router.push('/');
          return;
        }

        setUser(data.user);

        // Get user profile dari database
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profile) {
          setUserProfile(profile);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    getUser();
  }, [router]);

  const handleLogout = async () => {
    await logOut();
    router.push('/');
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  // Define available modules based on user role
  const getAvailableModules = () => {
    const modules = [];
    const role = userProfile?.role || '';

    // Modules accessible to all authenticated users
    if (role === 'super_admin' || role === 'marketing') {
      modules.push({
        name: 'Marketing Dashboard',
        path: '/marketing',
        icon: '📊',
        description: 'Manage sales orders and invoices'
      });
    }

    if (role === 'super_admin' || role === 'marketing') {
      modules.push({
        name: 'Create Sales Order',
        path: '/sales',
        icon: '🛒',
        description: 'Create new sales orders'
      });
    }

    if (role === 'super_admin' || role === 'fakturis') {
      modules.push({
        name: 'Fakturis',
        path: '/fakturis',
        icon: '📝',
        description: 'Manage invoices and documents'
      });
    }

    if (role === 'super_admin' || role === 'admin_keuangan') {
      modules.push({
        name: 'Admin Keuangan',
        path: '/admin-keuangan',
        icon: '💰',
        description: 'Financial management'
      });
    }

    if (role === 'super_admin' || role === 'admin_logistik') {
      modules.push({
        name: 'Admin Logistik (Masuk)',
        path: '/admin-logistik-in',
        icon: '📥',
        description: 'Inbound logistics'
      });
    }

    if (role === 'super_admin' || role === 'admin_ekspedisi') {
      modules.push({
        name: 'Admin Logistik (Keluar)',
        path: '/admin-logistik-out',
        icon: '📤',
        description: 'Outbound logistics'
      });
    }

    return modules;
  };

  const availableModules = getAvailableModules();

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-gray-400">Selamat datang kembali</p>
        </div>
        
        {userProfile && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* User Info Card */}
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
              <h2 className="text-lg font-semibold mb-4">Profile Anda</h2>
              <p className="text-gray-300 mb-3">
                <span className="font-semibold text-gray-200">Nama:</span> {userProfile.name}
              </p>
              <p className="text-gray-300 mb-3">
                <span className="font-semibold text-gray-200">Email:</span> {user?.email}
              </p>
              <p className="text-gray-300 mb-6">
                <span className="font-semibold text-gray-200">Role:</span>
                <span className="bg-blue-600 text-white text-sm px-2 py-1 rounded ml-2 capitalize">
                  {userProfile.role.replace('_', ' ')}
                </span>
              </p>
              
              <button
                onClick={handleLogout}
                className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition"
              >
                Logout
              </button>
            </div>

            {/* Quick Stats */}
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
              <h2 className="text-lg font-semibold mb-4">Informasi Cepat</h2>
              <p className="text-gray-300 mb-2">
                <span className="font-semibold text-gray-200">Total Modules:</span> {availableModules.length}
              </p>
              <p className="text-gray-400 text-sm">Akses modul sesuai dengan peran Anda</p>
            </div>

            {/* System Info */}
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
              <h2 className="text-lg font-semibold mb-4">Status Sistem</h2>
              <p className="text-green-400 text-sm">✓ Sistem Berjalan Normal</p>
              <p className="text-gray-400 text-sm mt-4">Tersedia {availableModules.length} modul untuk diakses</p>
            </div>
          </div>
        )}

        {/* Available Modules */}
        <div>
          <h2 className="text-2xl font-semibold mb-6">Modul Tersedia</h2>
          {availableModules.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableModules.map((module) => (
                <button
                  key={module.path}
                  onClick={() => router.push(module.path)}
                  className="bg-gray-900 border border-gray-800 hover:border-blue-600 rounded-lg p-6 text-left transition-all hover:bg-gray-800"
                >
                  <div className="text-3xl mb-3">{module.icon}</div>
                  <h3 className="text-lg font-semibold mb-2">{module.name}</h3>
                  <p className="text-gray-400 text-sm">{module.description}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 text-center">
              <p className="text-gray-400">Anda tidak memiliki akses ke modul manapun. Hubungi administrator.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
