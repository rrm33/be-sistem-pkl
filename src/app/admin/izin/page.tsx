"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Cookies from 'js-cookie';
import { toast } from 'sonner';
import {
  FileText, Search, Filter, Check, X, AlertCircle, Clock,
  CheckCircle, XCircle, Calendar, Download, Eye,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

type Student = {
  id: number;
  namaLengkap: string;
  kelas: string | null;
  jurusan: { nama: string } | null;
  perusahaan: { nama: string } | null;
};

type IzinRecord = {
  id: number;
  siswaId: number;
  siswa: Student;
  tipeIzin: 'SAKIT' | 'IZIN_KETERANGAN';
  tanggalMulai: string;
  tanggalSelesai: string;
  lampiran: string | null;
  keterangan: string | null;
  status: 'PENDING' | 'DISETUJUI' | 'DITOLAK';
  feedback: string | null;
  processedAt: string | null;
  processedByName: string | null;
  processedByRole: string | null;
  createdAt: string;
};

export default function IzinSakitPage() {
  const [records, setRecords] = useState<IzinRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('PENDING');
  const [filterKelas, setFilterKelas] = useState('');
  const [kelasList, setKelasList] = useState<string[]>([]);

  // Action states
  const [selectedRecord, setSelectedRecord] = useState<IzinRecord | null>(null);
  const [feedback, setFeedback] = useState('');
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

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

  const fetchRecords = useCallback(async () => {
    setIsLoading(true);
    try {
      const op = getOperatorInfo();
      const params = new URLSearchParams();
      if (op) {
        params.set('role', op.role);
        params.set('userId', String(op.id));
      }
      if (filterStatus) params.set('status', filterStatus);
      if (filterKelas) params.set('kelas', filterKelas);
      if (search) params.set('search', search);

      const res = await fetch(`${API_URL}/izin?${params.toString()}`);
      const data = await res.json();
      setRecords(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Gagal mengambil data pengajuan');
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, [filterStatus, filterKelas, search]);

  const fetchClasses = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/siswa`);
      const data = await res.json();
      const set = new Set<string>();
      (data as any[]).forEach(s => { if (s.kelas) set.add(s.kelas); });
      setKelasList(Array.from(set).sort());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const handleActionSubmit = async () => {
    if (!selectedRecord || !actionType) return;
    if (actionType === 'REJECT' && !feedback.trim()) {
      toast.error('Alasan penolakan wajib diisi');
      return;
    }

    const op = getOperatorInfo();
    if (!op) {
      toast.error('Sesi Anda telah berakhir, silakan login kembali');
      return;
    }

    setIsActionLoading(true);
    try {
      const status = actionType === 'APPROVE' ? 'DISETUJUI' : 'DITOLAK';
      const res = await fetch(`${API_URL}/izin/${selectedRecord.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          feedback: actionType === 'APPROVE' ? (feedback.trim() || 'Disetujui') : feedback.trim(),
          processedById: op.id,
          processedByName: op.nama,
          processedByRole: op.role
        })
      });

      if (res.ok) {
        toast.success(`Pengajuan berhasil ${status.toLowerCase()}`);
        setActionType(null);
        setSelectedRecord(null);
        setFeedback('');
        fetchRecords();
      } else {
        const err = await res.json();
        toast.error(err.message || 'Gagal memproses pengajuan');
      }
    } catch {
      toast.error('Terjadi kesalahan koneksi server');
    } finally {
      setIsActionLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('id-ID', {
        day: '2-digit', month: 'long', year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200"><Clock size={12} /> Pending</span>;
      case 'DISETUJUI':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle size={12} /> Disetujui</span>;
      case 'DITOLAK':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200"><XCircle size={12} /> Ditolak</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-smk-blue uppercase tracking-wider mb-1">
            <FileText size={16} /> Izin & Sakit Siswa
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Kelola Pengajuan Izin</h1>
          <p className="text-sm text-slate-500">Persetujuan surat keterangan sakit dan izin tertulis siswa PKL.</p>
        </div>
      </div>

      {/* Filter Options */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {['PENDING', 'DISETUJUI', 'DITOLAK'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                  filterStatus === st ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {st === 'PENDING' ? 'Perlu Diproses' : st === 'DISETUJUI' ? 'Disetujui' : 'Ditolak'}
              </button>
            ))}
          </div>

          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama siswa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-smk-blue focus:bg-white transition-all"
            />
          </div>

          <div className="w-[150px]">
            <select
              value={filterKelas}
              onChange={(e) => setFilterKelas(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-smk-blue focus:bg-white transition-all"
            >
              <option value="">Semua Kelas</option>
              {kelasList.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Table Data */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-smk-blue/30 border-t-smk-blue rounded-full animate-spin"></div>
            <p className="text-sm text-slate-500">Memuat data pengajuan...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center p-6">
            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mb-4">
              <FileText size={28} />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Tidak ada pengajuan</h3>
            <p className="text-sm text-slate-500 max-w-sm mt-1">Tidak ditemukan data pengajuan izin atau sakit yang sesuai dengan filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                  <th className="px-6 py-4">Siswa</th>
                  <th className="px-6 py-4">Tipe Izin</th>
                  <th className="px-6 py-4">Tanggal Masa Izin</th>
                  <th className="px-6 py-4">Alasan / Keterangan</th>
                  <th className="px-6 py-4">Lampiran</th>
                  {filterStatus !== 'PENDING' && <th className="px-6 py-4">Diproses Oleh</th>}
                  <th className="px-6 py-4 text-center">Status / Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800">{r.siswa?.namaLengkap}</div>
                      <div className="text-xs text-slate-500">{r.siswa?.kelas} • {r.siswa?.jurusan?.nama || 'Jurusan'}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{r.siswa?.perusahaan?.nama || 'DUDI Belum Diplot'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold ${
                        r.tipeIzin === 'SAKIT' 
                          ? 'bg-red-50 text-red-700 border border-red-100' 
                          : 'bg-amber-50 text-amber-700 border border-amber-100'
                      }`}>
                        {r.tipeIzin === 'SAKIT' ? 'Sakit' : 'Izin'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <Calendar size={13} className="text-slate-400" />
                        <div>
                          <div>{formatDate(r.tanggalMulai)}</div>
                          {r.tanggalMulai !== r.tanggalSelesai && (
                            <div className="text-[10px] text-slate-400 italic">s.d {formatDate(r.tanggalSelesai)}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-[250px]">
                      <p className="text-xs text-slate-700 line-clamp-2" title={r.keterangan || ''}>
                        {r.keterangan || '-'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      {r.lampiran ? (
                        <a
                          href={`${API_URL}/uploads/izin/${r.lampiran}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all"
                        >
                          <Eye size={12} /> Lihat Surat
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Tidak ada surat</span>
                      )}
                    </td>
                    {filterStatus !== 'PENDING' && (
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-700">{r.processedByName || '-'}</div>
                        <div className="text-[10px] text-slate-400 capitalize">{r.processedByRole?.toLowerCase() || ''}</div>
                        {r.processedAt && (
                          <div className="text-[10px] text-slate-400 mt-0.5">{formatDate(r.processedAt)}</div>
                        )}
                        {r.feedback && (
                          <div className="text-xs text-slate-500 mt-1 bg-slate-100 p-1.5 rounded border italic">
                            &quot;{r.feedback}&quot;
                          </div>
                        )}
                      </td>
                    )}
                    <td className="px-6 py-4 text-center">
                      {r.status === 'PENDING' ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedRecord(r);
                              setActionType('APPROVE');
                            }}
                            className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl transition-all border border-emerald-200"
                            title="Setujui Pengajuan"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedRecord(r);
                              setActionType('REJECT');
                            }}
                            className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-all border border-red-200"
                            title="Tolak Pengajuan"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        renderStatusBadge(r.status)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation & Reject Modal */}
      {selectedRecord && actionType && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-100 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                actionType === 'APPROVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
              }`}>
                {actionType === 'APPROVE' ? <Check size={20} /> : <X size={20} />}
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">
                  {actionType === 'APPROVE' ? 'Setujui Pengajuan Izin' : 'Tolak Pengajuan Izin'}
                </h3>
                <p className="text-xs text-slate-500">Konfirmasi status kehadiran siswa.</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-600">
              <div><span className="font-semibold">Nama Siswa:</span> {selectedRecord.siswa?.namaLengkap}</div>
              <div><span className="font-semibold">Tipe Izin:</span> {selectedRecord.tipeIzin === 'SAKIT' ? 'Sakit' : 'Izin'}</div>
              <div><span className="font-semibold">Rentang:</span> {formatDate(selectedRecord.tanggalMulai)} s.d {formatDate(selectedRecord.tanggalSelesai)}</div>
            </div>

            {actionType === 'REJECT' ? (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Alasan Penolakan</label>
                <textarea
                  placeholder="Contoh: Lampiran surat dokter buram atau tidak valid..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-red-500 focus:bg-white transition-all resize-none"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Catatan Tambahan (Opsional)</label>
                <input
                  type="text"
                  placeholder="Semoga lekas sembuh..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  setActionType(null);
                  setSelectedRecord(null);
                  setFeedback('');
                }}
                disabled={isActionLoading}
                className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold rounded-xl text-xs hover:bg-slate-50 transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleActionSubmit}
                disabled={isActionLoading}
                className={`px-4 py-2 text-white font-semibold rounded-xl text-xs transition-all ${
                  actionType === 'APPROVE' 
                    ? 'bg-emerald-600 hover:bg-emerald-700' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isActionLoading ? 'Memproses...' : actionType === 'APPROVE' ? 'Setujui' : 'Tolak'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
