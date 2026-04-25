'use client';

import { useState } from 'react';
import { logIn, signUp, getUserProfile, UserRole } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type AuthMode = 'login' | 'signup';

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'admin_keuangan', label: 'Admin Keuangan' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'fakturis', label: 'Fakturis' },
  { value: 'admin_logistik', label: 'Admin Logistik' },
  { value: 'admin_ekspedisi', label: 'Admin Ekspedisi' },
  { value: 'super_admin', label: 'Super Admin' },
];

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('admin_keuangan');

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

      // Get current user
      const { data: authUser } = await supabase.auth.getUser();
      if (!authUser.user) {
        setError('Gagal mendapatkan data user');
        setLoading(false);
        return;
      }

      // Get user profile untuk mendapatkan role
      let profile = null;
      const { data: existingProfile } = await getUserProfile(authUser.user.id);
      
      if (existingProfile) {
        profile = existingProfile;
      } else {
        // Profile belum ada - auto-create dengan default role (admin_keuangan)
        // User bisa ubah role di profile page nanti
        const { data: newProfile, error: createError } = await supabase
          .from('users')
          .insert([
            {
              id: authUser.user.id,
              email: authUser.user.email || '',
              name: authUser.user.user_metadata?.name || 'User',
              role: 'admin_keuangan', // Default role
            },
          ])
          .select()
          .single();

        if (createError || !newProfile) {
          setError('Gagal membuat profil user: ' + (createError?.message || 'Unknown error'));
          setLoading(false);
          return;
        }

        profile = newProfile;
      }

      if (!profile) {
        setError('Gagal mendapatkan profil user');
        setLoading(false);
        return;
      }

      setSuccess('Login berhasil! Redirecting...');

      // Redirect berdasarkan role - LANGSUNG KE ROLE PAGE, BUKAN /dashboard
      const roleRoutes: Record<string, string> = {
        admin_keuangan: '/admin-keuangan',
        marketing: '/marketing',
        fakturis: '/fakturis',
        admin_logistik: '/admin-logistik-in',
        admin_ekspedisi: '/admin-logistik-out',
        super_admin: '/admin-keuangan',
      };

      console.log('Profile role:', profile?.role);
      console.log('Profile data:', profile);
      
      const targetRoute = roleRoutes[profile?.role] || '/dashboard';
      console.log('Redirecting to:', targetRoute);
      
      // Redirect langsung tanpa delay - session sudah established
      router.push(targetRoute);
    } catch (err) {
      setError('Terjadi error: ' + String(err));
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (!name.trim()) {
      setError('Nama harus diisi');
      setLoading(false);
      return;
    }

    const result = await signUp({ email, password, name, role });

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess('Akun berhasil dibuat! Silakan cek email Anda untuk verifikasi.');
      // Reset form
      setEmail('');
      setPassword('');
      setName('');
      setRole('admin_keuangan');
      setTimeout(() => setMode('login'), 2000);
    }
    setLoading(false);
  };

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
          {/* Tab Navigation */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => {
                setMode('login');
                setError(null);
                setSuccess(null);
              }}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                mode === 'login'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => {
                setMode('signup');
                setError(null);
                setSuccess(null);
              }}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                mode === 'signup'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Signup
            </button>
          </div>

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
          {mode === 'login' && (
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
          )}

          {/* Signup Form */}
          {mode === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nama</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Masukkan nama"
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

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
                  minLength={6}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                {loading ? 'Loading...' : 'Buat Akun'}
              </button>
            </form>
          )}

          {/* Footer */}
          <p className="text-center text-sm text-gray-500 mt-4">
            {mode === 'login'
              ? "Belum punya akun? Klik tab Signup di atas"
              : 'Sudah punya akun? Klik tab Login di atas'}
          </p>
        </div>
      </div>
    </div>
  );
}
