"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { KeyRound, Mail, Lock, Building2, CheckCircle2, ChevronLeft, Search, ChevronDown } from 'lucide-react';
import Link from 'next/link';

type UnclaimedDudi = {
  id: number;
  nama: string;
  alamat?: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const [dudiList, setDudiList] = useState<UnclaimedDudi[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);

  // Form states
  const [perusahaanId, setPerusahaanId] = useState<number | "">("");
  const [kodeAkses, setKodeAkses] = useState("");
  const [email, setEmail] = useState("");
  const [passwordNew, setPasswordNew] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Custom searchable select states
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQueryDudi, setSearchQueryDudi] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  useEffect(() => {
    fetchUnclaimedDudi();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const getCleanAlamat = (alamat?: string) => {
    if (!alamat) return "";
    return alamat.split('\nMaps:')[0].split('\nGoogle Maps:')[0].trim();
  };

  const filteredDudiList = dudiList.filter(dudi => {
    const cleanAl = getCleanAlamat(dudi.alamat);
    return dudi.nama.toLowerCase().includes(searchQueryDudi.toLowerCase()) ||
      cleanAl.toLowerCase().includes(searchQueryDudi.toLowerCase());
  });

  const selectedDudiObj = dudiList.find(d => d.id === perusahaanId);

  const fetchUnclaimedDudi = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/unclaimed-dudi`);
      if (res.ok) {
        const data = await res.json();
        setDudiList(data);
      } else {
        toast.error("Gagal memuat daftar perusahaan");
      }
    } catch (err) {
      console.error(err);
      toast.error("Gagal terhubung ke server");
    } finally {
      setIsLoadingList(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!perusahaanId) {
      toast.error("Silakan pilih perusahaan Anda");
      return;
    }
    if (passwordNew !== passwordConfirm) {
      toast.error("Konfirmasi password tidak cocok");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Memproses klaim akun perusahaan...");

    try {
      const res = await fetch(`${API_BASE}/auth/claim-dudi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          perusahaanId: Number(perusahaanId),
          email,
          passwordNew,
          kodeAkses
        })
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Registrasi & Klaim Akun Berhasil! Silakan login.", { id: toastId });
        router.push('/login');
      } else {
        toast.error(data.message || "Gagal melakukan registrasi", { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error("Terjadi kesalahan koneksi server", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          Registrasi & Klaim Akun DUDI
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Klaim profil perusahaan Anda untuk mulai memantau absensi siswa.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 sm:rounded-2xl sm:px-10 border border-slate-100">
          
          <form className="space-y-5" onSubmit={handleRegister}>
            {/* 1. Pilih Perusahaan */}
            <div ref={dropdownRef} className="relative">
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Pilih Perusahaan / DUDI <span className="text-red-500">*</span>
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                  <Building2 className="h-5 w-5 text-slate-400" />
                </div>
                
                {/* Trigger Button */}
                <button
                  type="button"
                  onClick={() => !isLoadingList && setIsDropdownOpen(prev => !prev)}
                  disabled={isLoadingList}
                  className="w-full pl-10 pr-10 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-smk-blue/20 focus:border-smk-blue sm:text-sm text-left transition-all bg-slate-50 flex justify-between items-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-h-[46px]"
                >
                  <span className="truncate text-slate-700">
                    {selectedDudiObj 
                      ? `${selectedDudiObj.nama} ${selectedDudiObj.alamat ? `(${getCleanAlamat(selectedDudiObj.alamat)})` : ''}` 
                      : (isLoadingList ? "Memuat daftar DUDI..." : "-- Cari & Pilih Perusahaan Anda --")}
                  </span>
                  <ChevronDown size={18} className="text-slate-400 shrink-0" />
                </button>
              </div>

              {/* Searchable Dropdown Panel */}
              {isDropdownOpen && (
                <div className="absolute z-20 mt-1 w-full bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden flex flex-col max-h-64 animate-in fade-in duration-200">
                  {/* Search input field */}
                  <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center relative">
                    <Search className="absolute left-4 text-slate-400 pointer-events-none" size={16} />
                    <input
                      type="text"
                      placeholder="Ketik nama atau alamat perusahaan..."
                      value={searchQueryDudi}
                      onChange={(e) => setSearchQueryDudi(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-smk-blue"
                      onClick={(e) => e.stopPropagation()} // Prevent closing dropdown on input click
                    />
                  </div>

                  {/* List of filtered companies */}
                  <div className="overflow-y-auto max-h-48 custom-scrollbar">
                    {filteredDudiList.length === 0 ? (
                      <div className="p-4 text-sm text-slate-500 text-center">
                        Perusahaan tidak ditemukan
                      </div>
                    ) : (
                      filteredDudiList.map(dudi => (
                        <button
                          key={dudi.id}
                          type="button"
                          onClick={() => {
                            setPerusahaanId(dudi.id);
                            setIsDropdownOpen(false);
                            setSearchQueryDudi("");
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 focus:bg-slate-50 focus:outline-none transition-colors border-b border-slate-50 last:border-0 flex flex-col gap-0.5"
                        >
                          <span className="font-bold text-slate-800">{dudi.nama}</span>
                          {dudi.alamat && (
                            <span className="text-xs text-slate-500 truncate">
                              {getCleanAlamat(dudi.alamat)}
                            </span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Kode Akses Klaim */}
            <div>
              <label className="block text-sm font-semibold text-slate-700">
                Kode Akses / Claim Code <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyRound className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  required
                  value={kodeAkses}
                  onChange={(e) => setKodeAkses(e.target.value.toUpperCase())}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-smk-blue/20 focus:border-smk-blue sm:text-sm transition-all bg-slate-50 focus:bg-white uppercase tracking-wider"
                  placeholder="Masukkan 6 digit kode dari sekolah..."
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Kode ini dibagikan oleh guru pembimbing atau admin sekolah ke kontak resmi perusahaan Anda.
              </p>
            </div>

            {/* 3. Email Perusahaan Baru */}
            <div>
              <label className="block text-sm font-semibold text-slate-700">
                Email Baru Perusahaan <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-smk-blue/20 focus:border-smk-blue sm:text-sm transition-all bg-slate-50 focus:bg-white"
                  placeholder="nama@perusahaan.com"
                />
              </div>
            </div>

            {/* 4. Password Baru */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    required
                    minLength={4}
                    value={passwordNew}
                    onChange={(e) => setPasswordNew(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-smk-blue/20 focus:border-smk-blue sm:text-sm transition-all bg-slate-50 focus:bg-white"
                    placeholder="Minimal 4 karakter"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700">
                  Ulangi Password <span className="text-red-500">*</span>
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    required
                    minLength={4}
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-smk-blue/20 focus:border-smk-blue sm:text-sm transition-all bg-slate-50 focus:bg-white"
                    placeholder="Ulangi password..."
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-smk-blue hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-smk-blue disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Memproses Klaim Akun...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={18} />
                    Daftar & Aktifkan Akun
                  </div>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-6">
            <Link 
              href="/login" 
              className="flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-slate-700 font-semibold"
            >
              <ChevronLeft size={16} />
              Kembali ke Halaman Login
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
