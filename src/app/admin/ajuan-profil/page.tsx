"use client";

import React, { useState, useEffect } from 'react';
import { UserCheck, Check, X, Eye, CheckCircle2, Clock, XCircle, User, MapPin, Phone, Mail, FileText, Sparkles, Filter } from 'lucide-react';
import { toast } from 'sonner';
import Swal from 'sweetalert2';

export default function AjuanProfilAdminPage() {
  const [ajuanList, setAjuanList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('PENDING');
  const [selectedAjuan, setSelectedAjuan] = useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchAjuanList();
  }, [selectedStatus]);

  const fetchAjuanList = async () => {
    setIsLoading(true);
    try {
      const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/pengajuan-edit?status=${selectedStatus}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setAjuanList(data);
      } else {
        toast.error('Gagal memuat daftar ajuan edit profil');
      }
    } catch (e) {
      toast.error('Kesalahan koneksi server');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveSingle = (id: number, namaSiswa: string) => {
    Swal.fire({
      title: 'Setujui Ajuan Profil?',
      text: `Apakah Anda yakin ingin menyetujui perubahan data profil untuk ${namaSiswa}? Data siswa di database akan langsung diperbarui.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10B981',
      cancelButtonColor: '#64748B',
      confirmButtonText: 'Ya, Setujui',
      cancelButtonText: 'Batal'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/pengajuan-edit/${id}/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ approvedBy: 'Administrator' })
          });
          if (res.ok) {
            toast.success(`Ajuan profil ${namaSiswa} berhasil disetujui`);
            fetchAjuanList();
            if (isDetailModalOpen) setIsDetailModalOpen(false);
          } else {
            const err = await res.json();
            toast.error(err.message || 'Gagal menyetujui ajuan');
          }
        } catch (e) {
          toast.error('Kesalahan koneksi server');
        }
      }
    });
  };

  const handleRejectSingle = (id: number, namaSiswa: string) => {
    Swal.fire({
      title: 'Tolak Ajuan Profil',
      input: 'textarea',
      inputLabel: 'Alasan Penolakan *',
      inputPlaceholder: 'Tuliskan alasan penolakan untuk siswa...',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#64748B',
      confirmButtonText: 'Tolak Ajuan',
      cancelButtonText: 'Batal',
      preConfirm: (alasan) => {
        if (!alasan || alasan.trim() === '') {
          Swal.showValidationMessage('Alasan penolakan wajib diisi!');
          return false;
        }
        return alasan.trim();
      }
    }).then(async (result) => {
      if (result.isConfirmed && result.value) {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/pengajuan-edit/${id}/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ alasanPenolakan: result.value, approvedBy: 'Administrator' })
          });
          if (res.ok) {
            toast.success(`Ajuan profil ${namaSiswa} telah ditolak`);
            fetchAjuanList();
            if (isDetailModalOpen) setIsDetailModalOpen(false);
          } else {
            const err = await res.json();
            toast.error(err.message || 'Gagal menolak ajuan');
          }
        } catch (e) {
          toast.error('Kesalahan koneksi server');
        }
      }
    });
  };

  const handleApproveAllWithPin = () => {
    const pendingCount = ajuanList.filter(a => a.status === 'PENDING').length;
    if (pendingCount === 0 && selectedStatus === 'PENDING') {
      toast.info('Tidak ada ajuan berstatus Menunggu (PENDING) saat ini.');
      return;
    }

    Swal.fire({
      title: 'Setujui SEMUA Ajuan Profil?',
      text: `Anda akan menyetujui ${pendingCount > 0 ? pendingCount : ''} pengajuan edit profil siswa yang berstatus PENDING secara sekaligus. Masukkan PIN Keamanan Admin untuk konfirmasi.`,
      icon: 'warning',
      input: 'password',
      inputAttributes: {
        maxlength: '12',
        autocapitalize: 'off',
        autocorrect: 'off',
        placeholder: 'Masukkan PIN Admin (Default: 123456)'
      },
      inputLabel: 'Verifikasi PIN Keamanan Admin *',
      showCancelButton: true,
      confirmButtonColor: '#10B981',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Setujui Semua',
      cancelButtonText: 'Batal',
      allowOutsideClick: false,
      preConfirm: async (pinValue) => {
        if (!pinValue || pinValue.trim() === '') {
          Swal.showValidationMessage('PIN Keamanan Admin wajib diisi!');
          return false;
        }
        try {
          const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
          const username = userStr ? JSON.parse(userStr).username : '';
          const verifyRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/auth/verify-pin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, pin: pinValue.trim() }),
          });
          if (!verifyRes.ok) {
            const data = await verifyRes.json();
            Swal.showValidationMessage(data.message || 'PIN Keamanan Admin Salah!');
            return false;
          }
          return true;
        } catch (e) {
          Swal.showValidationMessage('Gagal memverifikasi PIN Keamanan Admin.');
          return false;
        }
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        setIsProcessing(true);
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/pengajuan-edit/approve-all`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ approvedBy: 'Administrator' })
          });
          if (res.ok) {
            const data = await res.json();
            toast.success(data.message || 'Seluruh ajuan berhasil disetujui');
            fetchAjuanList();
          } else {
            const err = await res.json();
            toast.error(err.message || 'Gagal menyetujui seluruh ajuan');
          }
        } catch (e) {
          toast.error('Kesalahan koneksi server');
        } finally {
          setIsProcessing(false);
        }
      }
    });
  };

  const getChangedFields = (ajuan: any) => {
    if (ajuan.itemPerubahan && ajuan.itemPerubahan.trim() !== '') {
      return ajuan.itemPerubahan.split(', ').map((s: string) => s.trim()).filter(Boolean);
    }

    const fields = [];
    if (ajuan.namaLengkap && ajuan.namaLengkap !== ajuan.siswa?.namaLengkap) fields.push('Nama Lengkap');
    if (ajuan.nik && ajuan.nik !== ajuan.siswa?.nik) fields.push('NIK');
    if (ajuan.kk && ajuan.kk !== ajuan.siswa?.kk) fields.push('No KK');
    if (ajuan.tmpLahir && ajuan.tmpLahir !== ajuan.siswa?.tmpLahir) fields.push('Tempat Lahir');

    const oldDate = ajuan.siswa?.tglLahir ? new Date(ajuan.siswa.tglLahir).toISOString().split('T')[0] : '';
    const newDate = ajuan.tglLahir ? new Date(ajuan.tglLahir).toISOString().split('T')[0] : '';
    if (newDate && newDate !== oldDate) fields.push('Tgl Lahir');

    if (ajuan.bpjs && ajuan.bpjs !== ajuan.siswa?.bpjs) fields.push('No BPJS');
    if (ajuan.hp && ajuan.hp !== ajuan.siswa?.hp) fields.push('No HP Siswa');
    if (ajuan.hpOrtu && ajuan.hpOrtu !== ajuan.siswa?.hpOrtu) fields.push('No HP Ortu');
    if (ajuan.alamat && ajuan.alamat !== ajuan.siswa?.alamat) fields.push('Alamat / Lokasi');
    if (ajuan.email && ajuan.email !== ajuan.siswa?.email) fields.push('Email');
    if (ajuan.jk && ajuan.jk !== ajuan.siswa?.jk) fields.push('Jenis Kelamin');
    if (ajuan.foto && ajuan.foto !== ajuan.siswa?.foto) fields.push('Foto Profil');
    return fields;
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-smk-blue uppercase tracking-wider mb-1">
            <UserCheck size={16} /> Manajemen Persetujuan Data
          </div>
          <h1 className="text-2xl font-black text-slate-900 leading-tight">Ajuan Edit Profil Siswa</h1>
          <p className="text-sm text-slate-500 font-medium">
            Review dan setujui perubahan data biodata yang diajukan oleh siswa PKL.
          </p>
        </div>

        <button
          onClick={handleApproveAllWithPin}
          disabled={isProcessing}
          className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all border border-emerald-500 shrink-0 cursor-pointer disabled:opacity-50"
        >
          <Sparkles size={18} />
          Setujui SEMUA Ajuan (Bulk Approve)
        </button>
      </div>

      {/* Filter Status Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        {[
          { label: 'Menunggu Persetujuan', value: 'PENDING', icon: Clock, color: 'text-amber-600 bg-amber-50 border-amber-200' },
          { label: 'Disetujui', value: 'DISETUJUI', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
          { label: 'Ditolak', value: 'DITOLAK', icon: XCircle, color: 'text-red-600 bg-red-50 border-red-200' },
          { label: 'Semua Riwayat', value: 'ALL', icon: Filter, color: 'text-slate-600 bg-slate-100 border-slate-200' }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = selectedStatus === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setSelectedStatus(tab.value)}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer border ${
                isActive
                  ? 'bg-smk-blue text-white border-smk-blue shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 font-medium">Memuat data ajuan...</div>
        ) : ajuanList.length === 0 ? (
          <div className="p-12 text-center">
            <UserCheck size={48} className="mx-auto text-slate-300 mb-3" />
            <h3 className="font-bold text-slate-700 text-lg">Tidak ada ajuan profil</h3>
            <p className="text-slate-400 text-sm mt-1">Belum ada siswa yang mengajukan perubahan data untuk status ini.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Tgl Ajuan</th>
                  <th className="px-6 py-4">Siswa</th>
                  <th className="px-6 py-4">Kelas & Jurusan</th>
                  <th className="px-6 py-4">Item Perubahan</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {ajuanList.map((ajuan) => {
                  const changedFields = getChangedFields(ajuan);
                  return (
                    <tr key={ajuan.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                        {new Date(ajuan.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{ajuan.siswa?.namaLengkap || '-'}</div>
                        <div className="text-xs text-slate-400">NISN: {ajuan.siswa?.nisn}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs font-bold text-slate-800">{ajuan.siswa?.kelas || '-'}</div>
                        <div className="text-xs text-slate-500">{ajuan.siswa?.jurusan?.nama || '-'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {changedFields.map((f: string, idx: number) => (
                            <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[11px] font-semibold rounded-md border border-blue-200">
                              {f}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          ajuan.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-700 border border-amber-200'
                            : ajuan.status === 'DISETUJUI'
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            : 'bg-red-100 text-red-700 border border-red-200'
                        }`}>
                          {ajuan.status === 'PENDING' && <Clock size={12} />}
                          {ajuan.status === 'DISETUJUI' && <CheckCircle2 size={12} />}
                          {ajuan.status === 'DITOLAK' && <XCircle size={12} />}
                          {ajuan.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedAjuan(ajuan);
                              setIsDetailModalOpen(true);
                            }}
                            className="p-2 text-slate-600 hover:text-smk-blue hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Lihat Komparasi Data"
                          >
                            <Eye size={18} />
                          </button>
                          {ajuan.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleApproveSingle(ajuan.id, ajuan.siswa.namaLengkap)}
                                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                title="Setujui Ajuan"
                              >
                                <Check size={18} />
                              </button>
                              <button
                                onClick={() => handleRejectSingle(ajuan.id, ajuan.siswa.namaLengkap)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Tolak Ajuan"
                              >
                                <X size={18} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Side-by-Side Comparison Modal */}
      {isDetailModalOpen && selectedAjuan && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-lg font-black text-slate-900">Perbandingan Data Profil Siswa</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {selectedAjuan.siswa?.namaLengkap} ({selectedAjuan.siswa?.kelas})
                </p>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
              <div className="grid grid-cols-2 gap-4 bg-slate-100 p-3 rounded-xl font-bold text-xs uppercase text-slate-500 tracking-wider text-center">
                <div>Data Lama (Database Saat Ini)</div>
                <div className="text-emerald-700">Data Baru (Diajukan Siswa)</div>
              </div>

              {(() => {
                const changedList = getChangedFields(selectedAjuan);
                return [
                  { label: 'Nama Lengkap', oldVal: selectedAjuan.siswa.namaLengkap, newVal: selectedAjuan.namaLengkap },
                  { label: 'NIK', oldVal: selectedAjuan.siswa.nik, newVal: selectedAjuan.nik },
                  { label: 'No KK', oldVal: selectedAjuan.siswa.kk, newVal: selectedAjuan.kk },
                  { label: 'Tempat Lahir', oldVal: selectedAjuan.siswa.tmpLahir, newVal: selectedAjuan.tmpLahir },
                  { label: 'No BPJS', oldVal: selectedAjuan.siswa.bpjs, newVal: selectedAjuan.bpjs },
                  { label: 'No HP Siswa', oldVal: selectedAjuan.siswa.hp, newVal: selectedAjuan.hp },
                  { label: 'No HP Ortu', oldVal: selectedAjuan.siswa.hpOrtu, newVal: selectedAjuan.hpOrtu },
                  { label: 'Email', oldVal: selectedAjuan.siswa.email, newVal: selectedAjuan.email },
                  { label: 'Jenis Kelamin', oldVal: selectedAjuan.siswa.jk, newVal: selectedAjuan.jk },
                  { label: 'Alamat / Lokasi', oldVal: selectedAjuan.siswa.alamat, newVal: selectedAjuan.alamat },
                ].map((item, idx) => {
                  const isChanged = changedList.includes(item.label);
                  return (
                  <div key={idx} className={`p-4 rounded-xl border ${isChanged ? 'bg-amber-50/50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                      <span>{item.label}</span>
                      {isChanged && <span className="px-2 py-0.5 bg-amber-200 text-amber-800 text-[10px] font-extrabold rounded-md">DIUBAH</span>}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-slate-700 break-words font-medium">{item.oldVal || '-'}</div>
                      <div className={`break-words font-bold ${isChanged ? 'text-emerald-700' : 'text-slate-700'}`}>
                        {item.newVal || item.oldVal || '-'}
                      </div>
                    </div>
                  </div>
                );
              })})()}

              {selectedAjuan.alasanPenolakan && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="text-xs font-bold text-red-700 uppercase tracking-wider mb-1">Alasan Penolakan:</div>
                  <div className="text-red-900 font-medium">{selectedAjuan.alasanPenolakan}</div>
                </div>
              )}

              {selectedAjuan.status !== 'PENDING' && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs font-semibold text-slate-600">
                  <div>
                    Status: <span className={`font-bold uppercase ${selectedAjuan.status === 'DISETUJUI' ? 'text-emerald-700' : 'text-red-700'}`}>{selectedAjuan.status}</span>
                  </div>
                  <div>
                    Diproses Oleh: <span className="font-bold text-slate-900">{selectedAjuan.approvedBy || 'Administrator'}</span>
                    {selectedAjuan.approvedAt && (
                      <span className="text-slate-400 ml-1">
                        pada {new Date(selectedAjuan.approvedAt).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} WIB
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {selectedAjuan.status === 'PENDING' && (
              <div className="p-6 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
                <button
                  onClick={() => handleRejectSingle(selectedAjuan.id, selectedAjuan.siswa.namaLengkap)}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm"
                >
                  Tolak Ajuan
                </button>
                <button
                  onClick={() => handleApproveSingle(selectedAjuan.id, selectedAjuan.siswa.namaLengkap)}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm"
                >
                  Setujui Ajuan
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
