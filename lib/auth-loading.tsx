// lib/auth-loading.tsx
// Shared loading screen component

export function AuthLoadingScreen() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="flex justify-center mb-4">
          <div className="animate-spin">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-blue-400 rounded-full"></div>
          </div>
        </div>
        <p className="text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

export function AccessDeniedScreen() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4 text-red-500">🔒 Access Denied</h1>
        <p className="text-gray-400 mb-8">Anda tidak memiliki akses ke halaman ini</p>
        <a
          href="/dashboard"
          className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded text-white transition inline-block"
        >
          Kembali ke Dashboard
        </a>
      </div>
    </div>
  );
}
