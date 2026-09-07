"use client";

import React, { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Search, X, BookOpen, Layers } from "lucide-react";
import { toast } from 'sonner';
import ConfirmModal from '../../../components/ConfirmModal';
import Swal from 'sweetalert2';

type Jurusan = {
  id: number;
  kode: string;
  nama: string;
  ketuaProgramId?: number;
};

export default function JurusanPage() {
  const [jurusans, setJurusans] = useState<Jurusan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Jurusan>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const API_URL = `${process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}`}/jurusan`;

  useEffect(() => {
    fetchJurusans();
  }, []);

  const fetchJurusans = async () => {
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error("Gagal mengambil data");
      const data = await res.json();
      setJurusans(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (jurusan?: Jurusan) => {
    if (jurusan) {
      setFormData({ id: jurusan.id, kode: jurusan.kode, nama: jurusan.nama });
      setIsEditing(true);
    } else {
      setFormData({ id: 0, kode: "", nama: "" });
      setIsEditing(false);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = isEditing ? `${API_URL}/${formData.id}` : API_URL;
      const method = isEditing ? "PATCH" : "POST";
      
      const payload = {
        kode: formData.kode,
        nama: formData.nama,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        fetchJurusans();
        setIsModalOpen(false);
        toast.success(isEditing ? 'Data jurusan berhasil diperbarui!' : 'Jurusan baru berhasil ditambahkan!');
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
        fetchJurusans();
        Swal.fire('Terhapus!', 'Data jurusan berhasil dihapus.', 'success');
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

  const filteredJurusans = jurusans.filter(j => 
    j.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
    j.kode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="text-smk-blue" size={28} />
            Data Jurusan
          </h1>
          <p className="text-sm text-slate-500 mt-1">Kelola daftar program keahlian di sekolah Anda.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-gradient-to-r from-smk-blue to-[#266f9f] hover:from-[#1a4f6e] hover:to-smk-blue text-white px-5 py-2.5 rounded-xl transition-all duration-300 shadow-lg shadow-smk-blue/30 flex items-center gap-2 font-medium group"
        >
          <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
          <span>Tambah Jurusan</span>
        </button>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Toolbar */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
          <div className="relative w-full sm:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Cari nama atau kode jurusan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-smk-blue/20 focus:border-smk-blue transition-all placeholder:text-slate-400"
            />
          </div>
          <div className="text-sm text-slate-500 font-medium">
            Total: <span className="text-smk-orange font-bold bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100">{filteredJurusans.length}</span> Jurusan
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-16">No</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Kode</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nama Jurusan</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-8 h-8 border-4 border-smk-blue/20 border-t-smk-blue rounded-full animate-spin"></div>
                      <p className="text-slate-500 font-medium">Memuat data jurusan...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredJurusans.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3 text-slate-400">
                      <BookOpen size={48} className="text-slate-200" />
                      <p className="text-slate-500 font-medium">Tidak ada data jurusan yang ditemukan.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredJurusans.map((jurusan, index) => (
                  <tr key={jurusan.id} className="group hover:bg-slate-50/80 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-smk-blue border border-blue-100 shadow-sm">
                        {jurusan.kode}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                      {jurusan.nama}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(jurusan)}
                          className="p-2 text-smk-orange bg-orange-50 hover:bg-orange-100 hover:text-orange-700 rounded-lg transition-colors border border-transparent hover:border-orange-200"
                          title="Edit Jurusan"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(jurusan.id)}
                          className="p-2 text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors border border-transparent hover:border-red-200"
                          title="Hapus Jurusan"
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

      {/* Modern Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setIsModalOpen(false)}
          />
          
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <BookOpen className="text-smk-orange" size={24} />
                {isEditing ? "Edit Jurusan" : "Tambah Jurusan Baru"}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Kode Jurusan <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.kode}
                    onChange={(e) => setFormData({ ...formData, kode: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-smk-blue/30 focus:border-smk-blue focus:bg-white transition-all placeholder:text-slate-400"
                    placeholder="Misal: RPL"
                  />
                  <p className="text-xs text-slate-500 mt-1.5">Gunakan singkatan resmi, maksimal 10 karakter.</p>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Nama Jurusan <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nama}
                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-smk-blue/30 focus:border-smk-blue focus:bg-white transition-all placeholder:text-slate-400"
                    placeholder="Misal: Rekayasa Perangkat Lunak"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-colors shadow-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-smk-blue to-[#266f9f] hover:from-[#1a4f6e] hover:to-smk-blue rounded-xl transition-all shadow-sm shadow-smk-blue/20"
                >
                  {isEditing ? "Simpan Perubahan" : "Simpan Jurusan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={deleteId !== null}
        title="Konfirmasi Hapus"
        message="Apakah Anda yakin ingin menghapus jurusan ini? Tindakan ini tidak dapat dibatalkan."
        onConfirm={executeDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
