"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Cookies from 'js-cookie';
import { LogIn, KeyRound, User, Lock } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'GURU' | 'DUDI'>('GURU');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, loginType: activeTab })
      });

      const data = await res.json();

      if (res.ok) {
        Cookies.set('token', data.token, { expires: 1 });
        Cookies.set('userRole', data.user.role, { expires: 1 });
        Cookies.set('userName', data.user.nama, { expires: 1 });
        
        toast.success(`Selamat datang, ${data.user.nama}!`);
        
        // Redirect based on role
        if (data.user.role === 'ADMIN') {
          router.push('/admin');
        } else {
          // For now, redirect all to admin to see the dashboard, later can be separated
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
          Masuk ke Akun Anda
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Atau kemabli ke{' '}
          <Link href="/" className="font-medium text-smk-blue hover:text-blue-700">
            Halaman Utama
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 sm:rounded-2xl sm:px-10 border border-slate-100">
          
          <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
            <button
              onClick={() => { setActiveTab('GURU'); setUsername(''); setPassword(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'GURU' ? 'bg-white text-smk-blue shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Guru / Admin
            </button>
            <button
              onClick={() => { setActiveTab('DUDI'); setUsername(''); setPassword(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'DUDI' ? 'bg-white text-smk-blue shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Perusahaan (DUDI)
            </button>
          </div>

          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                {activeTab === 'GURU' ? 'NIP / Username' : 'Email Perusahaan'}
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
                  placeholder="Masukkan identitas Anda..."
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
            
            {activeTab === 'DUDI' && (
              <div className="text-center mt-4">
                <span className="text-sm text-slate-500">Perusahaan Baru? </span>
                <Link href="/register" className="text-sm font-bold text-smk-blue hover:text-blue-700 hover:underline">
                  Klaim & Registrasi Akun
                </Link>
              </div>
            )}
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
                <li><span className="font-semibold text-slate-800">Siswa:</span> Silakan login melalui <Link href="/siswa/login" className="text-smk-blue font-bold hover:underline">halaman Login Siswa</Link></li>
                {activeTab === 'GURU' && <li><span className="font-semibold text-slate-800">Guru:</span> Gunakan NIP dan password akun Anda</li>}
                {activeTab === 'DUDI' && (
                  <>
                    <li><span className="font-semibold text-slate-800">DUDI:</span> Gunakan Email Perusahaan yang telah didaftarkan</li>
                    <li className="list-none mt-2 pt-2 border-t border-slate-200/50">
                      <span className="text-slate-500">Perusahaan Baru?</span>{' '}
                      <Link href="/register" className="text-smk-blue font-bold hover:underline">
                        Klaim & Registrasi Akun Anda
                      </Link>
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
