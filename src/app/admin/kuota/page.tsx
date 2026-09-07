"use client";

import React, { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Search, X, Briefcase, Building2, GraduationCap, Calculator, Users } from "lucide-react";
import { toast } from 'sonner';
import ConfirmModal from '../../../components/ConfirmModal';
import Swal from 'sweetalert2';

type Perusahaan = {
  id: number;
  nama: string;
  logo: string | null;
};

type Jurusan = {
  id: number;
  nama: string;
};

type KuotaDudi = {
  id: number;
  perusahaanId: number;
  jurusanId: number;
  kuotaPria: number;
  kuotaWanita: number;
  perusahaan: Perusahaan;
  jurusan: Jurusan;
};

export default function AdminKuota() {
  const [kuotas, setKuotas] = useState<KuotaDudi[]>([]);
  const [perusahaans, setPerusahaans] = useState<Perusahaan[]>([]);
  const [jurusans, setJurusans] = useState<Jurusan[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    id: 0,
    perusahaanId: '',
    jurusanId: '',
    kuotaPria: 0,
    kuotaWanita: 0
  });

  const API_URL = `${process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}`}/kuota-dudi`;

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [resKuota, resPerusahaan, resJurusan] = await Promise.all([
        fetch(API_URL),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}`}/perusahaan`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}`}/jurusan`)
      ]);
      const dataKuota = await resKuota.json();
      const dataPerusahaan = await resPerusahaan.json();
      const dataJurusan = await resJurusan.json();
      
      setKuotas(Array.isArray(dataKuota) ? dataKuota : []);
      setPerusahaans(Array.isArray(dataPerusahaan) ? dataPerusahaan : []);
      setJurusans(Array.isArray(dataJurusan) ? dataJurusan : []);
    } catch (error) {
      console.error(error);
      toast.error('Gagal memuat data kuota DUDI');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = (kuota: KuotaDudi | null = null) => {
    if (kuota) {
      setFormData({
        id: kuota.id,
        perusahaanId: kuota.perusahaanId.toString(),
        jurusanId: kuota.jurusanId.toString(),
        kuotaPria: kuota.kuotaPria,
        kuotaWanita: kuota.kuotaWanita
      });
      setIsEditing(true);
    } else {
      setFormData({
        id: 0,
        perusahaanId: '',
        jurusanId: '',
        kuotaPria: 0,
        kuotaWanita: 0
      });
      setIsEditing(false);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.perusahaanId || !formData.jurusanId) {
      toast.error("Perusahaan dan Jurusan wajib dipilih!");
      return;
    }

    try {
      const url = isEditing ? `${API_URL}/${formData.id}` : API_URL;
      const method = isEditing ? "PATCH" : "POST";
      
      const payload = {
        perusahaanId: Number(formData.perusahaanId),
        jurusanId: Number(formData.jurusanId),
        kuotaPria: Number(formData.kuotaPria),
        kuotaWanita: Number(formData.kuotaWanita)
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        fetchData();
        setIsModalOpen(false);
        toast.success(isEditing ? 'Data kuota berhasil diperbarui!' : 'Data kuota baru berhasil ditambahkan!');
      } else {
        const errorData = await res.json();
        toast.error(errorData.message || 'Gagal menyimpan data');
      }
    } catch (error) {
      console.error(error);
      toast.error('Terjadi kesalahan server');
    }
  };

  const handleDelete = (id: number) => {
    setDeleteId(id);
  };

  const executeDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`${API_URL}/${deleteId}`, { method: "DELETE" });
      if (res.ok) {
        fetchData();
        Swal.fire('Terhapus!', 'Data kuota berhasil dihapus.', 'success');
      } else {
        const data = await res.json();
        Swal.fire('Peringatan', data.message || 'Gagal menghapus data', 'warning');
      }
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'Terjadi kesalahan server', 'error');
    } finally {
      setDeleteId(null);
    }
  };

  const filteredKuotas = (Array.isArray(kuotas) ? kuotas : []).filter(k => 
    k?.perusahaan?.nama?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    k?.jurusan?.nama?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalKuotaPria = kuotas.reduce((acc, curr) => acc + curr.kuotaPria, 0);
  const totalKuotaWanita = kuotas.reduce((acc, curr) => acc + curr.kuotaWanita, 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Briefcase className="text-smk-blue" size={28} />
            Kuota DUDI
          </h1>
          <p className="text-sm text-slate-500 mt-1">Kelola dan pantau kapasitas penerimaan siswa di setiap perusahaan.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-gradient-to-r from-smk-blue to-[#266f9f] hover:from-[#1a4f6e] hover:to-smk-blue text-white px-5 py-2.5 rounded-xl transition-all duration-300 shadow-lg shadow-smk-blue/30 flex items-center gap-2 font-medium group"
        >
          <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
          <span>Tambah Kuota</span>
        </button>
      </div>

      {/* Cards Ringkasan */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <Building2 size={24} />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-500">DUDI Terdaftar</div>
            <div className="text-2xl font-bold text-slate-800">{perusahaans.length}</div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
            <Calculator size={24} />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-500">Total Kuota Tersedia</div>
            <div className="text-2xl font-bold text-slate-800">{totalKuotaPria + totalKuotaWanita} <span className="text-sm font-medium text-slate-500">Siswa</span></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shrink-0">
            <Users size={24} />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-500">Rasio Pria / Wanita</div>
            <div className="text-lg font-bold text-slate-800">
              <span className="text-blue-600">{totalKuotaPria} L</span> / <span className="text-pink-600">{totalKuotaWanita} P</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
          <div className="relative w-full sm:w-72 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-smk-blue transition-colors" size={20} />
            <input
              type="text"
              placeholder="Cari DUDI atau Jurusan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-smk-blue/20 focus:border-smk-blue transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-white border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-16">No</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Perusahaan</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Jurusan</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Laki-laki</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Perempuan</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Total</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="w-8 h-8 border-4 border-smk-blue/20 border-t-smk-blue rounded-full animate-spin mx-auto"></div>
                  </td>
                </tr>
              ) : filteredKuotas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">Tidak ada data kuota ditemukan.</td>
                </tr>
              ) : (
                filteredKuotas.map((kuota, index) => (
                  <tr key={kuota.id} className="group hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-500">{index + 1}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                          {kuota.perusahaan.logo ? (
                            <img src={`${process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}`}${kuota.perusahaan.logo}`} alt={kuota.perusahaan.nama} className="w-full h-full object-cover" />
                          ) : (
                            <Building2 className="text-slate-400" size={16} />
                          )}
                        </div>
                        <div className="text-sm font-bold text-slate-900">{kuota.perusahaan.nama}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
                        <GraduationCap size={14} />
                        {kuota.jurusan.nama}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-bold text-blue-600">{kuota.kuotaPria}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-bold text-pink-600">{kuota.kuotaWanita}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-sm font-black min-w-[3rem]">
                        {kuota.kuotaPria + kuota.kuotaWanita}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(kuota)}
                          className="p-2 text-smk-orange bg-orange-50 hover:bg-orange-100 hover:text-orange-700 rounded-lg transition-colors border border-transparent hover:border-orange-200"
                          title="Edit Kuota"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(kuota.id)}
                          className="p-2 text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors border border-transparent hover:border-red-200"
                          title="Hapus Kuota"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form Tambah/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-2xl">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <div className="p-2 bg-smk-blue/10 rounded-lg text-smk-blue">
                  {isEditing ? <Edit2 size={18} /> : <Plus size={18} />}
                </div>
                {isEditing ? "Edit Kuota DUDI" : "Alokasi Kuota DUDI"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Perusahaan (DUDI) *</label>
                  <select
                    required
                    value={formData.perusahaanId}
                    onChange={(e) => setFormData({ ...formData, perusahaanId: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-smk-blue/20 focus:border-smk-blue focus:bg-white transition-all"
                  >
                    <option value="">-- Pilih Perusahaan --</option>
                    {perusahaans.map(p => (
                      <option key={p.id} value={p.id}>{p.nama}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Jurusan *</label>
                  <select
                    required
                    value={formData.jurusanId}
                    onChange={(e) => setFormData({ ...formData, jurusanId: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-smk-blue/20 focus:border-smk-blue focus:bg-white transition-all"
                  >
                    <option value="">-- Pilih Jurusan --</option>
                    {jurusans.map(j => (
                      <option key={j.id} value={j.id}>{j.nama}</option>
                    ))}
                  </select>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 mt-6 relative">
                  <div className="absolute -top-3 left-4 bg-white px-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Distribusi Kuota
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <label className="block text-sm font-semibold text-blue-700 mb-1.5">Laki-Laki</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={formData.kuotaPria}
                        onChange={(e) => setFormData({ ...formData, kuotaPria: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2.5 bg-white border border-blue-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 text-center font-bold text-blue-700"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-pink-700 mb-1.5">Perempuan</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={formData.kuotaWanita}
                        onChange={(e) => setFormData({ ...formData, kuotaWanita: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2.5 bg-white border border-pink-200 rounded-xl text-sm focus:outline-none focus:border-pink-500 text-center font-bold text-pink-700"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-600">Total Kuota:</span>
                    <span className="text-2xl font-black text-emerald-600 bg-emerald-50 px-4 py-1 rounded-lg border border-emerald-100">
                      {formData.kuotaPria + formData.kuotaWanita}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-sm font-bold text-white bg-smk-blue hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
                >
                  {isEditing ? "Simpan Perubahan" : "Simpan Kuota"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={deleteId !== null}
        title="Konfirmasi Hapus"
        message="Apakah Anda yakin ingin menghapus catatan kuota ini?"
        onConfirm={executeDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
