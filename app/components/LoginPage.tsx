'use client';

import { useEffect, useState } from 'react';
import { logIn } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Auto-redirect jika sudah login
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        router.replace('/dashboard');
      } else {
        setCheckingSession(false);
      }
    });
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const result = await logIn({ email, password });

      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      // Ambil auth user dan profile secara parallel (tidak serial)
      const { data: authUser } = await supabase.auth.getUser();
      if (!authUser.user) {
        setError('Gagal mendapatkan data user');
        setLoading(false);
        return;
      }

      // Parallel fetch profile dan cek apakah perlu create
      const { data: existingProfile } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.user.id)
        .maybeSingle(); // Use maybeSingle untuk avoid error jika tidak ada

      let profile = existingProfile;

      // Jika profile belum ada, create dengan default role (non-blocking)
      if (!existingProfile) {
        // Fire and forget - tidak perlu tunggu, langsung redirect
        const createProfileAsync = async () => {
          const { data: newProfile } = await supabase
            .from('users')
            .insert([
              {
                id: authUser.user.id,
                email: authUser.user.email || '',
                name: authUser.user.user_metadata?.name || 'User',
                role: 'admin_keuangan',
              },
            ])
            .select()
            .single();
          
          if (newProfile) {
            // Cache profile di localStorage untuk menghindari fetch ulang
            sessionStorage.setItem(
              `profile_${authUser.user.id}`,
              JSON.stringify(newProfile)
            );
          }
        };
        
        createProfileAsync(); // Tidak await - biar berjalan background
        
        // Gunakan default profile untuk redirect
        profile = {
          id: authUser.user.id,
          email: authUser.user.email || '',
          name: authUser.user.user_metadata?.name || 'User',
          role: 'admin_keuangan',
        };
      } else {
        // Cache profile yang sudah ada
        sessionStorage.setItem(
          `profile_${authUser.user.id}`,
          JSON.stringify(profile)
        );
      }

      setSuccess('Login berhasil! Redirecting...');

      // Redirect berdasarkan role - LANGSUNG TANPA DELAY
      const roleRoutes: Record<string, string> = {
        admin_keuangan: '/admin-keuangan',
        marketing: '/marketing',
        fakturis: '/fakturis',
        admin_logistik: '/admin-logistik-in',
        admin_ekspedisi: '/admin-logistik-out',
        petugas_ekspedisi: '/petugas-ekspedisi',
        super_admin: '/admin-super',
      };

      const targetRoute = roleRoutes[profile?.role] || '/dashboard';
      console.log('Login berhasil! Redirecting ke:', targetRoute);
      
      // Redirect IMMEDIATELY
      router.push(targetRoute);
    } catch (err) {
      setError('Terjadi error: ' + String(err));
      setLoading(false);
    }
  };

  if (checkingSession) {
    return <div className="min-h-screen bg-black flex items-center justify-center"><div className="text-gray-400 text-sm">Memuat...</div></div>;
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2">Ragasiapp</h1>
          <p className="text-gray-400">GO FIGHT WIN</p>
        </div>

        {/* Auth Card */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-8">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Login</h2>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-600 rounded-lg text-red-200 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-900/30 border border-green-600 rounded-lg text-green-200 text-sm">
              {success}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Masukkan email"
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              {loading ? 'Loading...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
