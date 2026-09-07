"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Cookies from 'js-cookie';
import { toast } from 'sonner';
import {
  ClipboardList, Search, Filter, ChevronLeft, ChevronRight,
  CheckCircle2, Clock, XCircle, AlertTriangle, CalendarDays, X,
  Building2, User, Users, UserCheck, UserX, TrendingUp, Plus,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

type AbsensiRecord = {
  id: number;
  tanggal: string;
  jamMasuk: string | null;
  jamKeluar: string | null;
  terlambatMenit: number;
  pulangCepatMenit: number;
  status: 'HADIR' | 'SAKIT' | 'IZIN' | 'ALPA';
  koordinatLokasi: string | null;
  jarakMeter: number | null;
  fotoMasuk: string | null;
  fotoPulang: string | null;
  siswa: {
    id: number;
    nisn: string;
    nis: string;
    namaLengkap: string;
    kelas: string | null;
    jurusan: { nama: string } | null;
  };
  perusahaan: { nama: string } | null;
  cabang: { namaCabang: string } | null;
};

type Jurusan = { id: number; nama: string };

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  HADIR: { label: 'Hadir', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle2 size={12} /> },
  SAKIT: { label: 'Sakit', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: <AlertTriangle size={12} /> },
  IZIN: { label: 'Izin', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: <Clock size={12} /> },
  ALPA: { label: 'Alpa', color: 'bg-red-100 text-red-700 border-red-200', icon: <XCircle size={12} /> },
};

function formatTime(isoStr: string | null): string {
  if (!isoStr) return '-';
  try {
    return new Date(isoStr).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  } catch { return '-'; }
}

function formatDate(isoStr: string): string {
  try {
    return new Date(isoStr).toLocaleDateString('id-ID', {
      weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return isoStr; }
}

function formatDurasi(menit: number): string {
  if (menit <= 0) return '';
  const jam = Math.floor(menit / 60);
  const sisa = menit % 60;
  if (jam > 0 && sisa > 0) return `${jam} jam ${sisa} mnt`;
  if (jam > 0) return `${jam} jam`;
  return `${sisa} mnt`;
}

type Summary = {
  totalSiswa: number;
  totalSudahAbsen: number;
  totalBelumAbsen: number;
  totalHadir: number;
  totalSakit: number;
  totalIzin: number;
  totalAlpa: number;
  totalTerlambat: number;
  tanggalDari: string;
  tanggalSampai: string;
};

function todayStr() {
  return new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local
}

export default function RekapAbsensiPage() {
  const [records, setRecords] = useState<AbsensiRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [jurusanList, setJurusanList] = useState<Jurusan[]>([]);
  const [kelasList, setKelasList] = useState<string[]>([]);
  const [siswaList, setSiswaList] = useState<any[]>([]);

  // Manual presensi override states
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualSiswaId, setManualSiswaId] = useState('');
  const [siswaSearch, setSiswaSearch] = useState('');
  const [showSiswaDropdown, setShowSiswaDropdown] = useState(false);
  const [manualTanggal, setManualTanggal] = useState(todayStr());
  const [manualStatus, setManualStatus] = useState<'HADIR' | 'SAKIT' | 'IZIN'>('HADIR');
  const [isManualLoading, setIsManualLoading] = useState(false);

  const getOperatorInfo = () => {
    const token = Cookies.get('token');
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        id: payload.sub,
        role: payload.role,
        nama: Cookies.get('userName') || 'Operator'
      };
    } catch {
      return null;
    }
  };

  // Summary
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'log-harian' | 'akumulasi-siswa'>('log-harian');

  // Student cumulative stats
  const [studentRecaps, setStudentRecaps] = useState<any[]>([]);
  const [isRecapLoading, setIsRecapLoading] = useState(false);
  const [recapPage, setRecapPage] = useState(1);
  const [recapTotalPages, setRecapTotalPages] = useState(1);
  const [recapTotal, setRecapTotal] = useState(0);

  const [search, setSearch] = useState('');
  const [filterKelas, setFilterKelas] = useState('');
  const [filterJurusan, setFilterJurusan] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  // Default ke hari ini
  const [tanggalDari, setTanggalDari] = useState(todayStr());
  const [tanggalSampai, setTanggalSampai] = useState(todayStr());

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 20;

  const [selectedRecord, setSelectedRecord] = useState<AbsensiRecord | null>(null);

  const fetchJurusan = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/jurusan`);
      const data = await res.json();
      setJurusanList(data);
    } catch { /* ignore */ }
  }, []);

  const fetchKelas = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/siswa`);
      const data = await res.json();
      setSiswaList(data);
      const kelasSet = new Set<string>();
      (data as any[]).forEach((s: any) => { if (s.kelas) kelasSet.add(s.kelas); });
      setKelasList(Array.from(kelasSet).sort());
    } catch { /* ignore */ }
  }, []);

  const fetchSummary = useCallback(async () => {
    setIsSummaryLoading(true);
    try {
      const params = new URLSearchParams();
      const op = getOperatorInfo();
      if (op) {
        params.set('role', op.role);
        params.set('userId', String(op.id));
      }
      if (filterKelas) params.set('kelas', filterKelas);
      if (filterJurusan) params.set('jurusanId', filterJurusan);
      if (tanggalDari) params.set('tanggalDari', tanggalDari);
      if (tanggalSampai) params.set('tanggalSampai', tanggalSampai);
      const res = await fetch(`${API_URL}/absensi/summary?${params.toString()}`);
      const data = await res.json();
      setSummary(data);
    } catch {
      setSummary(null);
    } finally {
      setIsSummaryLoading(false);
    }
  }, [filterKelas, filterJurusan, tanggalDari, tanggalSampai]);

  const fetchStudentRecap = useCallback(async (p = 1) => {
    setIsRecapLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) });
      const op = getOperatorInfo();
      if (op) {
        params.set('role', op.role);
        params.set('userId', String(op.id));
      }
      if (search) params.set('search', search);
      if (filterKelas) params.set('kelas', filterKelas);
      if (filterJurusan) params.set('jurusanId', filterJurusan);
      if (tanggalDari) params.set('tanggalDari', tanggalDari);
      if (tanggalSampai) params.set('tanggalSampai', tanggalSampai);

      const res = await fetch(`${API_URL}/absensi/rekap-siswa?${params.toString()}`);
      const json = await res.json();
      setStudentRecaps(json.data ?? []);
      setRecapTotal(json.total ?? 0);
      setRecapTotalPages(json.totalPages ?? 1);
      setRecapPage(json.page ?? p);
    } catch {
      setStudentRecaps([]);
    } finally {
      setIsRecapLoading(false);
    }
  }, [search, filterKelas, filterJurusan, tanggalDari, tanggalSampai]);

  const fetchRekap = useCallback(async (p = 1) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) });
      const op = getOperatorInfo();
      if (op) {
        params.set('role', op.role);
        params.set('userId', String(op.id));
      }
      if (search) params.set('search', search);
      if (filterKelas) params.set('kelas', filterKelas);
      if (filterJurusan) params.set('jurusanId', filterJurusan);
      if (tanggalDari) params.set('tanggalDari', tanggalDari);
      if (tanggalSampai) params.set('tanggalSampai', tanggalSampai);

      const res = await fetch(`${API_URL}/absensi/rekap?${params.toString()}`);
      const json = await res.json();

      let filtered: AbsensiRecord[] = json.data ?? [];
      if (filterStatus) filtered = filtered.filter((r) => r.status === filterStatus);

      setRecords(filtered);
      setTotal(json.total ?? 0);
      setTotalPages(json.totalPages ?? 1);
      setPage(json.page ?? p);
    } catch {
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, [search, filterKelas, filterJurusan, filterStatus, tanggalDari, tanggalSampai]);

  useEffect(() => { fetchJurusan(); fetchKelas(); }, [fetchJurusan, fetchKelas]);
  useEffect(() => {
    fetchRekap(1);
    fetchStudentRecap(1);
    fetchSummary();
  }, [fetchRekap, fetchStudentRecap, fetchSummary]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'log-harian') {
      fetchRekap(1);
    } else {
      fetchStudentRecap(1);
    }
  };

  const resetFilters = () => {
    setSearch(''); setFilterKelas(''); setFilterJurusan('');
    setFilterStatus(''); setTanggalDari(todayStr()); setTanggalSampai(todayStr());
  };

  const handleManualPresensi = async (force = false) => {
    if (!manualSiswaId) {
      toast.error('Silakan pilih siswa terlebih dahulu');
      return;
    }
    const op = getOperatorInfo();
    if (!op) {
      toast.error('Sesi Anda berakhir, silakan login kembali');
      return;
    }

    setIsManualLoading(true);
    try {
      const res = await fetch(`${API_URL}/absensi/manual-presensi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siswaId: Number(manualSiswaId),
          tanggal: manualTanggal,
          status: manualStatus,
          operator: {
            id: op.id,
            nama: op.nama,
            role: op.role
          },
          forceUpdate: force
        })
      });

      if (res.ok) {
        toast.success(force ? 'Berhasil memperbarui data presensi' : 'Berhasil mencatat presensi manual');
        setShowManualModal(false);
        setManualSiswaId('');
        setSiswaSearch('');
        setManualStatus('HADIR');
        fetchRekap(1);
        fetchStudentRecap(1);
        fetchSummary();
      } else {
        const err = await res.json();
        if (err.exists) {
          const proceed = window.confirm(
            'Siswa ini sudah memiliki catatan absensi pada tanggal tersebut. Apakah Anda ingin memperbarui (update) data sebelumnya?'
          );
          if (proceed) {
            handleManualPresensi(true);
            return;
          }
        } else {
          toast.error(err.message || 'Gagal mencatat presensi');
        }
      }
    } catch {
      toast.error('Kesalahan koneksi ke server');
    } finally {
      setIsManualLoading(false);
    }
  };

  const hasFilters = search || filterKelas || filterJurusan || filterStatus || tanggalDari || tanggalSampai;

  const pageNumbers = (() => {
    const nums: number[] = [];
    const maxBtn = 5;
    if (totalPages <= maxBtn) {
      for (let i = 1; i <= totalPages; i++) nums.push(i);
    } else if (page <= 3) {
      for (let i = 1; i <= maxBtn; i++) nums.push(i);
    } else if (page >= totalPages - 2) {
      for (let i = totalPages - maxBtn + 1; i <= totalPages; i++) nums.push(i);
    } else {
      for (let i = page - 2; i <= page + 2; i++) nums.push(i);
    }
    return nums;
  })();

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-smk-blue uppercase tracking-wider mb-1">
            <ClipboardList size={16} /> Rekap Kehadiran
          </div>
          <h1 className="text-2xl font-black text-slate-900 leading-tight">Rekap Absensi Semua Siswa</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Pantau kehadiran seluruh siswa PKL. Gunakan filter untuk menyaring data.
          </p>
        </div>
        <div>
          <button
            onClick={() => setShowManualModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-smk-blue hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/10 transition-all hover:scale-105"
          >
            <Plus size={15} /> Catat Presensi
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {(() => {
        const labelPeriod = summary
          ? (summary.tanggalDari === summary.tanggalSampai
            ? `${formatDate(summary.tanggalDari)}`
            : `${formatDate(summary.tanggalDari)} – ${formatDate(summary.tanggalSampai)}`)
          : '...';

        const cards = [
          {
            label: 'Total Siswa PKL',
            value: summary?.totalSiswa ?? '-',
            icon: <Users size={20} />,
            bg: 'bg-slate-100',
            text: 'text-slate-700',
            border: 'border-slate-200',
          },
          {
            label: 'Sudah Absen',
            value: summary?.totalSudahAbsen ?? '-',
            icon: <UserCheck size={20} />,
            bg: 'bg-emerald-50',
            text: 'text-emerald-700',
            border: 'border-emerald-200',
          },
          {
            label: 'Belum Absen',
            value: summary?.totalBelumAbsen ?? '-',
            icon: <UserX size={20} />,
            bg: 'bg-rose-50',
            text: 'text-rose-700',
            border: 'border-rose-200',
          },
          {
            label: 'Hadir',
            value: summary?.totalHadir ?? '-',
            icon: <CheckCircle2 size={20} />,
            bg: 'bg-green-50',
            text: 'text-green-700',
            border: 'border-green-200',
          },
          {
            label: 'Sakit',
            value: summary?.totalSakit ?? '-',
            icon: <AlertTriangle size={20} />,
            bg: 'bg-blue-50',
            text: 'text-blue-700',
            border: 'border-blue-200',
          },
          {
            label: 'Izin',
            value: summary?.totalIzin ?? '-',
            icon: <Clock size={20} />,
            bg: 'bg-amber-50',
            text: 'text-amber-700',
            border: 'border-amber-200',
          },
          {
            label: 'Alpa',
            value: summary?.totalAlpa ?? '-',
            icon: <XCircle size={20} />,
            bg: 'bg-red-50',
            text: 'text-red-700',
            border: 'border-red-200',
          },
          {
            label: 'Terlambat',
            value: summary?.totalTerlambat ?? '-',
            icon: <TrendingUp size={20} />,
            bg: 'bg-orange-50',
            text: 'text-orange-700',
            border: 'border-orange-200',
          },
        ];

        return (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <ClipboardList size={14} /> Ringkasan Kehadiran
              </div>
              <span className="text-xs font-semibold text-smk-blue bg-smk-blue/10 px-2.5 py-1 rounded-lg">
                {labelPeriod}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {cards.map((c, i) => (
                <div key={i} className={`flex flex-col items-center justify-center p-3 rounded-xl border ${c.bg} ${c.border} text-center gap-1`}>
                  {isSummaryLoading ? (
                    <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin opacity-40" />
                  ) : (
                    <>
                      <div className={`${c.text} opacity-80`}>{c.icon}</div>
                      <div className={`text-2xl font-black ${c.text}`}>{c.value}</div>
                      <div className={`text-[11px] font-bold ${c.text} opacity-70 leading-tight`}>{c.label}</div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Tab Switcher */}
      <div className="flex gap-2 border-b border-slate-200 pb-px">
        <button
          onClick={() => setActiveTab('log-harian')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'log-harian'
              ? 'border-smk-blue text-smk-blue'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Log Absensi Harian
        </button>
        <button
          onClick={() => setActiveTab('akumulasi-siswa')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'akumulasi-siswa'
              ? 'border-smk-blue text-smk-blue'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Ringkasan Akumulasi Siswa
        </button>
      </div>

      {/* Filter Panel */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Cari Nama Siswa</label>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Nama siswa..."
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-smk-blue/30"
              />
            </div>
          </div>

          <div className="min-w-[130px]">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Kelas</label>
            <select value={filterKelas} onChange={e => setFilterKelas(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-smk-blue/30">
              <option value="">Semua Kelas</option>
              {kelasList.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>

          <div className="min-w-[150px]">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Jurusan</label>
            <select value={filterJurusan} onChange={e => setFilterJurusan(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-smk-blue/30">
              <option value="">Semua Jurusan</option>
              {jurusanList.map(j => <option key={j.id} value={String(j.id)}>{j.nama}</option>)}
            </select>
          </div>

          {activeTab === 'log-harian' && (
            <div className="min-w-[130px]">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Status</label>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-smk-blue/30">
                <option value="">Semua Status</option>
                <option value="HADIR">Hadir</option>
                <option value="SAKIT">Sakit</option>
                <option value="IZIN">Izin</option>
                <option value="ALPA">Alpa</option>
              </select>
            </div>
          )}

          <div className="min-w-[145px]">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Dari Tanggal</label>
            <input type="date" value={tanggalDari} onChange={e => setTanggalDari(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-smk-blue/30" />
          </div>

          <div className="min-w-[145px]">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Sampai Tanggal</label>
            <input type="date" value={tanggalSampai} onChange={e => setTanggalSampai(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-smk-blue/30" />
          </div>

          <div className="flex gap-2">
            <button type="submit"
              className="flex items-center gap-2 px-5 py-2.5 bg-smk-blue text-white text-sm font-bold rounded-xl hover:bg-smk-blue/90 transition-colors">
              <Filter size={15} /> Terapkan
            </button>
            {hasFilters && (
              <button type="button" onClick={resetFilters}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-200 transition-colors">
                <X size={15} /> Reset
              </button>
            )}
          </div>
        </form>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span>
            Total{' '}
            <strong className="text-slate-800">
              {activeTab === 'log-harian' ? total.toLocaleString() : recapTotal.toLocaleString()}
            </strong>{' '}
            {activeTab === 'log-harian' ? 'record ditemukan' : 'siswa ditemukan'}
          </span>
          <span>
            Halaman{' '}
            <strong className="text-slate-800">
              {activeTab === 'log-harian' ? page : recapPage}
            </strong>{' '}
            dari{' '}
            <strong className="text-slate-800">
              {activeTab === 'log-harian' ? totalPages : recapTotalPages}
            </strong>
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {activeTab === 'log-harian' && (
          isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <div className="w-10 h-10 border-4 border-smk-blue border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-sm font-medium">Memuat data absensi...</p>
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <ClipboardList size={48} className="mb-4 opacity-30" />
              <p className="text-sm font-medium">Tidak ada data absensi</p>
              <p className="text-xs mt-1">Coba ubah filter atau rentang tanggal</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">No</th>
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Tanggal</th>
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Siswa</th>
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Kelas / Jurusan</th>
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Jam Masuk</th>
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Jam Pulang</th>
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">DUDI / Cabang</th>
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {records.map((rec, idx) => {
                      const cfg = STATUS_CONFIG[rec.status] ?? STATUS_CONFIG.HADIR;
                      const rowNum = (page - 1) * LIMIT + idx + 1;
                      return (
                        <tr key={rec.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-5 py-4 text-xs text-slate-400 font-medium">{rowNum}</td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <CalendarDays size={14} className="text-slate-400 shrink-0" />
                              <span className="text-sm font-semibold text-slate-800">{formatDate(rec.tanggal)}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-smk-blue/10 flex items-center justify-center text-smk-blue shrink-0">
                                <User size={15} />
                              </div>
                              <div>
                                <div className="text-sm font-bold text-slate-800 whitespace-nowrap">{rec.siswa.namaLengkap}</div>
                                <div className="text-xs text-slate-400">NIS: {rec.siswa.nis}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="text-sm font-semibold text-slate-700">{rec.siswa.kelas || '-'}</div>
                            <div className="text-xs text-slate-400 whitespace-nowrap">{rec.siswa.jurusan?.nama || '-'}</div>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-slate-800">{formatTime(rec.jamMasuk)}</div>
                            {rec.terlambatMenit > 0 && (
                              <div className="text-[11px] text-red-500 font-semibold">Terlambat {formatDurasi(rec.terlambatMenit)}</div>
                            )}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-slate-800">{formatTime(rec.jamKeluar)}</div>
                            {rec.pulangCepatMenit > 0 && (
                              <div className="text-[11px] text-amber-500 font-semibold">Lebih awal {formatDurasi(rec.pulangCepatMenit)}</div>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-col gap-1 items-start">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-extrabold rounded-lg border ${cfg.color}`}>
                                {cfg.icon} {cfg.label}
                              </span>
                              {(rec as any).dipresensikan && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-200 rounded">
                                  Manual
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1.5 text-xs text-slate-600">
                              <Building2 size={13} className="text-slate-400 shrink-0" />
                              <span className="font-medium whitespace-nowrap">
                                {rec.cabang?.namaCabang || rec.perusahaan?.nama || '-'}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <button onClick={() => setSelectedRecord(rec)}
                              className="px-3 py-1.5 text-xs font-bold text-smk-blue bg-smk-blue/10 hover:bg-smk-blue/20 rounded-lg transition-colors whitespace-nowrap">
                              Detail
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-5 py-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs text-slate-500">
                    Menampilkan <strong>{(page - 1) * LIMIT + 1}</strong>–<strong>{Math.min(page * LIMIT, total)}</strong> dari <strong>{total.toLocaleString()}</strong>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => fetchRekap(page - 1)} disabled={page <= 1}
                      className="flex items-center gap-1 px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                      <ChevronLeft size={14} /> Sebelumnya
                    </button>
                    {pageNumbers.map(p => (
                      <button key={p} onClick={() => fetchRekap(p)}
                        className={`w-9 h-9 text-xs font-bold rounded-xl transition-colors ${p === page ? 'bg-smk-blue text-white shadow-sm' : 'border border-slate-200 hover:bg-slate-50 text-slate-600'}`}>
                        {p}
                      </button>
                    ))}
                    <button onClick={() => fetchRekap(page + 1)} disabled={page >= totalPages}
                      className="flex items-center gap-1 px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                      Berikutnya <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )
        )}

        {activeTab === 'akumulasi-siswa' && (
          isRecapLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <div className="w-10 h-10 border-4 border-smk-blue border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-sm font-medium">Memuat data rekap siswa...</p>
            </div>
          ) : studentRecaps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <ClipboardList size={48} className="mb-4 opacity-30" />
              <p className="text-sm font-medium">Tidak ada data rekap siswa</p>
              <p className="text-xs mt-1">Coba ubah filter pencarian atau kelas</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">No</th>
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Siswa</th>
                      <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Kelas / Jurusan</th>
                      <th className="px-5 py-3.5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Hari Efektif</th>
                      <th className="px-5 py-3.5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Hadir</th>
                      <th className="px-5 py-3.5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Sakit</th>
                      <th className="px-5 py-3.5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Izin</th>
                      <th className="px-5 py-3.5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Alpa</th>
                      <th className="px-5 py-3.5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Terlambat</th>
                      <th className="px-5 py-3.5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Pulang Cepat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {studentRecaps.map((item, idx) => {
                      const rowNum = (recapPage - 1) * LIMIT + idx + 1;
                      return (
                        <tr key={item.siswa.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-5 py-4 text-xs text-slate-400 font-medium">{rowNum}</td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-smk-blue/10 flex items-center justify-center text-smk-blue shrink-0">
                                <User size={15} />
                              </div>
                              <div>
                                <div className="text-sm font-bold text-slate-800 whitespace-nowrap">{item.siswa.namaLengkap}</div>
                                <div className="text-xs text-slate-400">NIS: {item.siswa.nis}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="text-sm font-semibold text-slate-700">{item.siswa.kelas || '-'}</div>
                            <div className="text-xs text-slate-400 whitespace-nowrap">{item.siswa.jurusan?.nama || '-'}</div>
                          </td>
                          <td className="px-5 py-4 text-center text-sm font-bold text-slate-800">{item.totalHariEfektif} hari</td>
                          <td className="px-5 py-4 text-center">
                            <span className="inline-block px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
                              {item.totalHadir}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className="inline-block px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
                              {item.totalSakit}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className="inline-block px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-50 text-amber-700 border border-amber-100">
                              {item.totalIzin}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className="inline-block px-2.5 py-1 text-xs font-bold rounded-lg bg-red-50 text-red-700 border border-red-100">
                              {item.totalAlpa}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className={`inline-block px-2.5 py-1 text-xs font-bold rounded-lg ${item.totalTerlambat > 0 ? 'bg-orange-50 text-orange-700 border border-orange-100' : 'bg-slate-50 text-slate-500'}`}>
                              {item.totalTerlambat}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className={`inline-block px-2.5 py-1 text-xs font-bold rounded-lg ${item.totalPulangCepat > 0 ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-slate-50 text-slate-500'}`}>
                              {item.totalPulangCepat}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Recap Pagination */}
              {recapTotalPages > 1 && (
                <div className="px-5 py-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs text-slate-500">
                    Menampilkan <strong>{(recapPage - 1) * LIMIT + 1}</strong>–<strong>{Math.min(recapPage * LIMIT, recapTotal)}</strong> dari <strong>{recapTotal.toLocaleString()}</strong> siswa
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => fetchStudentRecap(recapPage - 1)} disabled={recapPage <= 1}
                      className="flex items-center gap-1 px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                      <ChevronLeft size={14} /> Sebelumnya
                    </button>
                    {(() => {
                      const nums: number[] = [];
                      const maxBtn = 5;
                      if (recapTotalPages <= maxBtn) {
                        for (let i = 1; i <= recapTotalPages; i++) nums.push(i);
                      } else if (recapPage <= 3) {
                        for (let i = 1; i <= maxBtn; i++) nums.push(i);
                      } else if (recapPage >= recapTotalPages - 2) {
                        for (let i = recapTotalPages - maxBtn + 1; i <= recapTotalPages; i++) nums.push(i);
                      } else {
                        for (let i = recapPage - 2; i <= recapPage + 2; i++) nums.push(i);
                      }
                      return nums.map(p => (
                        <button key={p} onClick={() => fetchStudentRecap(p)}
                          className={`w-9 h-9 text-xs font-bold rounded-xl transition-colors ${p === recapPage ? 'bg-smk-blue text-white shadow-sm' : 'border border-slate-200 hover:bg-slate-50 text-slate-600'}`}>
                          {p}
                        </button>
                      ));
                    })()}
                    <button onClick={() => fetchStudentRecap(recapPage + 1)} disabled={recapPage >= recapTotalPages}
                      className="flex items-center gap-1 px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                      Berikutnya <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )
        )}
      </div>

      {/* Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedRecord(null)}>
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-smk-blue to-blue-700 sticky top-0">
              <div>
                <h3 className="text-base font-black text-white">Detail Absensi</h3>
                <p className="text-xs text-blue-100 mt-0.5">{formatDate(selectedRecord.tanggal)}</p>
              </div>
              <button onClick={() => setSelectedRecord(null)} className="text-white/70 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="w-12 h-12 rounded-full bg-smk-blue/10 flex items-center justify-center text-smk-blue shrink-0">
                  <User size={22} />
                </div>
                <div>
                  <div className="font-black text-slate-900">{selectedRecord.siswa.namaLengkap}</div>
                  <div className="text-xs text-slate-500">NIS: {selectedRecord.siswa.nis} · NISN: {selectedRecord.siswa.nisn}</div>
                  <div className="text-xs text-slate-500">{selectedRecord.siswa.kelas || '-'} · {selectedRecord.siswa.jurusan?.nama || '-'}</div>
                </div>
              </div>

              <div className="flex items-center justify-center">
                {(() => {
                  const cfg = STATUS_CONFIG[selectedRecord.status] ?? STATUS_CONFIG.HADIR;
                  return (
                    <span className={`inline-flex items-center gap-2 px-5 py-2 text-sm font-extrabold rounded-xl border ${cfg.color}`}>
                      {cfg.icon} {cfg.label}
                    </span>
                  );
                })()}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-center">
                  <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Jam Masuk</div>
                  <div className="text-2xl font-black text-emerald-800">{formatTime(selectedRecord.jamMasuk)}</div>
                  {selectedRecord.terlambatMenit > 0 && (
                    <div className="text-xs text-red-500 font-bold mt-1">Terlambat {formatDurasi(selectedRecord.terlambatMenit)}</div>
                  )}
                </div>
                <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl text-center">
                  <div className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-1">Jam Pulang</div>
                  <div className="text-2xl font-black text-orange-800">{formatTime(selectedRecord.jamKeluar)}</div>
                  {selectedRecord.pulangCepatMenit > 0 && (
                    <div className="text-xs text-amber-600 font-bold mt-1">Lebih awal {formatDurasi(selectedRecord.pulangCepatMenit)}</div>
                  )}
                </div>
              </div>

              <div className="space-y-1 text-sm">
                <div className="flex items-start justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">DUDI / Cabang</span>
                  <span className="font-bold text-slate-800 text-right">
                    {selectedRecord.cabang?.namaCabang || selectedRecord.perusahaan?.nama || '-'}
                  </span>
                </div>
                {selectedRecord.jarakMeter != null && (
                  <div className="flex items-start justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Jarak GPS</span>
                    <span className="font-bold text-slate-800">{selectedRecord.jarakMeter} meter</span>
                  </div>
                )}
                {selectedRecord.koordinatLokasi && (
                  <div className="flex items-start justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Koordinat</span>
                    <span className="font-mono text-xs text-slate-700 text-right">{selectedRecord.koordinatLokasi}</span>
                  </div>
                )}
                {(selectedRecord as any).dipresensikan && (
                  <div className="flex flex-col gap-1 p-3 bg-amber-50 border border-amber-100 rounded-xl mt-3 text-xs">
                    <div className="text-amber-800 font-bold flex items-center gap-1"><AlertTriangle size={13} /> Presensi Manual</div>
                    <div className="text-slate-600 mt-0.5">
                      Siswa ini dipresensikan secara manual oleh <span className="font-semibold text-slate-800">{(selectedRecord as any).operatorName}</span> (Role: <span className="capitalize">{(selectedRecord as any).operatorRole?.toLowerCase()}</span>).
                    </div>
                  </div>
                )}
              </div>

              {(selectedRecord.fotoMasuk || selectedRecord.fotoPulang) && (
                <div className="grid grid-cols-2 gap-3">
                  {selectedRecord.fotoMasuk && (
                    <div>
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Foto Masuk</div>
                      <img src={`${API_URL}/uploads/absensi/${selectedRecord.fotoMasuk}`} alt="Foto Masuk"
                        className="w-full h-36 object-cover rounded-xl border border-slate-200" />
                    </div>
                  )}
                  {selectedRecord.fotoPulang && (
                    <div>
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Foto Pulang</div>
                      <img src={`${API_URL}/uploads/absensi/${selectedRecord.fotoPulang}`} alt="Foto Pulang"
                        className="w-full h-36 object-cover rounded-xl border border-slate-200" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Catat Presensi Manual */}
      {showManualModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-100 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Catat Presensi Siswa</h3>
                <p className="text-xs text-slate-500">Poresensikan siswa yang terkendala teknis absensi.</p>
              </div>
              <button
                onClick={() => {
                  setShowManualModal(false);
                  setManualSiswaId('');
                  setSiswaSearch('');
                  setShowSiswaDropdown(false);
                  setManualStatus('HADIR');
                }}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg transition-all"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Pilih Siswa</label>
                <div className="relative z-20">
                  <input
                    type="text"
                    placeholder="Ketik nama siswa untuk mencari..."
                    value={siswaSearch}
                    onFocus={() => setShowSiswaDropdown(true)}
                    onChange={(e) => {
                      setSiswaSearch(e.target.value);
                      setShowSiswaDropdown(true);
                    }}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-smk-blue focus:bg-white transition-all font-semibold"
                  />
                  {manualSiswaId && (
                    <span className="absolute right-3 top-3.5 text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Terpilih
                    </span>
                  )}

                  {showSiswaDropdown && (
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowSiswaDropdown(false)} 
                    />
                  )}

                  {showSiswaDropdown && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto z-30 py-1 divide-y divide-slate-50 border-t-0 animate-in fade-in slide-in-from-top-1 duration-150">
                    {(() => {
                      const filtered = siswaList
                        .filter((s: any) => {
                          const op = getOperatorInfo();
                          if (!op) return false;
                          if (op.role === 'PERUSAHAAN') return s.perusahaanId !== null;
                          if (op.role === 'PEMBIMBING') return s.guruPembimbingId !== null;
                          return true;
                        })
                        .filter((s: any) => {
                          const searchLower = siswaSearch.toLowerCase();
                          return (
                            s.namaLengkap.toLowerCase().includes(searchLower) ||
                            (s.kelas && s.kelas.toLowerCase().includes(searchLower)) ||
                            (s.nis && s.nis.toLowerCase().includes(searchLower))
                          );
                        });

                      if (filtered.length === 0) {
                        return (
                          <div className="px-4 py-3 text-xs text-slate-400 text-center italic">
                            Siswa tidak ditemukan
                          </div>
                        );
                      }

                      return filtered.map((s: any) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setManualSiswaId(String(s.id));
                            setSiswaSearch(`${s.namaLengkap} (${s.kelas || '-'})`);
                            setShowSiswaDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-xs hover:bg-slate-50 transition-colors flex flex-col ${
                            manualSiswaId === String(s.id) ? 'bg-blue-50/50' : ''
                          }`}
                        >
                          <span className="font-bold text-slate-800">{s.namaLengkap}</span>
                          <span className="text-[10px] text-slate-400 mt-0.5">
                            NIS: {s.nis || '-'} • Kelas: {s.kelas || '-'}
                          </span>
                        </button>
                      ));
                    })()}
                  </div>
                )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Tanggal Kehadiran</label>
                <input
                  type="date"
                  value={manualTanggal}
                  onChange={(e) => setManualTanggal(e.target.value)}
                  max={todayStr()}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-smk-blue focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Status Kehadiran</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['HADIR', 'SAKIT', 'IZIN'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setManualStatus(st)}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                        manualStatus === st
                          ? (st === 'HADIR' 
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm'
                              : st === 'SAKIT'
                                ? 'bg-red-50 border-red-300 text-red-700 shadow-sm'
                                : 'bg-amber-50 border-amber-300 text-amber-700 shadow-sm')
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {st === 'HADIR' ? 'Hadir' : st === 'SAKIT' ? 'Sakit' : 'Izin'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowManualModal(false);
                  setManualSiswaId('');
                  setSiswaSearch('');
                  setShowSiswaDropdown(false);
                  setManualStatus('HADIR');
                }}
                disabled={isManualLoading}
                className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold rounded-xl text-xs hover:bg-slate-50 transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleManualPresensi(false)}
                disabled={isManualLoading}
                className="px-4 py-2 bg-smk-blue hover:bg-blue-700 text-white font-semibold rounded-xl text-xs shadow-md shadow-blue-500/10 transition-all"
              >
                {isManualLoading ? 'Menyimpan...' : 'Simpan Presensi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
