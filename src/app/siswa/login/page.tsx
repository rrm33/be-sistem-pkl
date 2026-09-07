"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Cookies from 'js-cookie';
import { LogIn, KeyRound, User, Lock } from 'lucide-react';
import Link from 'next/link';

export default function SiswaLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, loginType: 'SISWA' })
      });

      const data = await res.json();

      if (res.ok) {
        Cookies.set('token', data.token, { expires: 1 });
        Cookies.set('userRole', data.user.role, { expires: 1 });
        Cookies.set('userName', data.user.nama, { expires: 1 });
        
        toast.success(`Selamat datang, ${data.user.nama}!`);
        
        // Redirect based on role
        if (data.user.role === 'SISWA') {
          router.push('/siswa/dashboard');
        } else if (data.user.role === 'ADMIN') {
          router.push('/admin');
        } else {
          router.push('/admin');
        }
      } else {
        toast.error(data.message || 'Username atau Password salah');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat menghubungi server');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          Login Siswa
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Atau kembali ke{' '}
          <Link href="/" className="font-medium text-smk-blue hover:text-blue-700">
            Halaman Utama
          </Link>
          <br/>
          Bukan siswa? <Link href="/login" className="font-medium text-smk-orange hover:text-orange-700">Login Guru/DUDI</Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 sm:rounded-2xl sm:px-10 border border-slate-100">
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                NISN
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-smk-blue/20 focus:border-smk-blue sm:text-sm transition-all bg-slate-50 focus:bg-white"
                  placeholder="Masukkan NISN Anda..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-smk-blue/20 focus:border-smk-blue sm:text-sm transition-all bg-slate-50 focus:bg-white"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-smk-blue hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-smk-blue disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Memproses...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <LogIn size={18} />
                    Masuk Sekarang
                  </div>
                )}
              </button>
            </div>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-500">
                  Petunjuk Login
                </span>
              </div>
            </div>

            <div className="mt-6 text-sm text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <ul className="space-y-2 list-disc list-inside">
                <li><span className="font-semibold text-slate-800">Siswa:</span> Gunakan NISN sebagai username dan password akun Anda.</li>
                <li>Jika Anda belum memiliki password, tanyakan kepada Admin atau Wali Kelas.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
