"use client";

import React, { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Search, X, Layers, Users } from "lucide-react";
import { toast } from 'sonner';
import ConfirmModal from '../../../components/ConfirmModal';
import Swal from 'sweetalert2';

type Jurusan = {
  id: number;
  nama: string;
};

type Kelas = {
  id: number;
  nama: string;
  jurusanId: number;
  jurusan: Jurusan;
};

export default function AdminKelas() {
  const [kelases, setKelases] = useState<Kelas[]>([]);
  const [jurusans, setJurusans] = useState<Jurusan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Kelas>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const API_URL = `${process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}`}/kelas`;
  const JURUSAN_API_URL = `${process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}`}/jurusan`;

  const fetchKelases = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      setKelases(data);
    } catch (error) {
      console.error(error);
      toast.error('Gagal memuat data kelas');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchJurusans = async () => {
    try {
      const res = await fetch(JURUSAN_API_URL);
      const data = await res.json();
      setJurusans(data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchKelases();
    fetchJurusans();
  }, []);

  const handleOpenModal = (kelas: Kelas | null = null) => {
    if (kelas) {
      setFormData(kelas);
      setIsEditing(true);
    } else {
      setFormData({ nama: "", jurusanId: undefined });
      setIsEditing(false);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama || !formData.jurusanId) {
      toast.error("Nama kelas dan Jurusan wajib diisi");
      return;
    }

    try {
      const url = isEditing ? `${API_URL}/${formData.id}` : API_URL;
      const method = isEditing ? "PATCH" : "POST";
      
      const payload = { ...formData };
      if ('jurusan' in payload) delete (payload as any).jurusan;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        fetchKelases();
        setIsModalOpen(false);
        toast.success(isEditing ? 'Data kelas berhasil diperbarui!' : 'Kelas baru berhasil ditambahkan!');
      } else {
        toast.error('Gagal menyimpan data');
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
        fetchKelases();
        Swal.fire('Terhapus!', 'Data kelas berhasil dihapus.', 'success');
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

  const filteredKelases = kelases.filter(k => 
    k.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
    k.jurusan?.nama.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="text-smk-blue" size={28} />
            Data Kelas
          </h1>
          <p className="text-sm text-slate-500 mt-1">Kelola data kelas dan relasinya dengan jurusan.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-gradient-to-r from-smk-blue to-[#266f9f] hover:from-[#1a4f6e] hover:to-smk-blue text-white px-5 py-2.5 rounded-xl transition-all duration-300 shadow-lg shadow-smk-blue/30 flex items-center gap-2 font-medium group"
        >
          <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
          <span>Tambah Kelas</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
          <div className="relative w-full sm:w-72 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-smk-blue transition-colors" size={20} />
            <input
              type="text"
              placeholder="Cari kelas atau jurusan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-smk-blue/20 focus:border-smk-blue transition-all"
            />
          </div>
          <div className="text-sm text-slate-500 font-medium">
            Total: <span className="text-smk-orange font-bold bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100">{filteredKelases.length}</span> Kelas
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-16">No</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nama Kelas</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Jurusan</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="w-8 h-8 border-4 border-smk-blue/20 border-t-smk-blue rounded-full animate-spin mx-auto"></div>
                  </td>
                </tr>
              ) : filteredKelases.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">Tidak ada data kelas.</td>
                </tr>
              ) : (
                filteredKelases.map((kelas, index) => (
                  <tr key={kelas.id} className="group hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-500">{index + 1}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-slate-900">{kelas.nama}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-smk-blue border border-blue-100">
                        {kelas.jurusan?.nama || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(kelas)}
                          className="p-2 text-smk-orange bg-orange-50 hover:bg-orange-100 hover:text-orange-700 rounded-lg transition-colors border border-transparent hover:border-orange-200"
                          title="Edit Kelas"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(kelas.id)}
                          className="p-2 text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors border border-transparent hover:border-red-200"
                          title="Hapus Kelas"
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <div className="p-2 bg-smk-blue/10 rounded-lg text-smk-blue">
                  {isEditing ? <Edit2 size={18} /> : <Plus size={18} />}
                </div>
                {isEditing ? "Edit Kelas" : "Tambah Kelas"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nama Kelas</label>
                <input
                  type="text"
                  required
                  value={formData.nama || ''}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-smk-blue/20 focus:border-smk-blue transition-all"
                  placeholder="Contoh: XII RPL 1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Jurusan</label>
                <select
                  required
                  value={formData.jurusanId || ''}
                  onChange={(e) => setFormData({ ...formData, jurusanId: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-smk-blue/20 focus:border-smk-blue transition-all"
                >
                  <option value="" disabled>-- Pilih Jurusan --</option>
                  {jurusans.map(j => (
                    <option key={j.id} value={j.id}>{j.nama}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-medium text-white bg-smk-blue hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
                >
                  {isEditing ? "Simpan Perubahan" : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={deleteId !== null}
        title="Konfirmasi Hapus"
        message="Apakah Anda yakin ingin menghapus kelas ini? Tindakan ini tidak dapat dibatalkan."
        onConfirm={executeDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
