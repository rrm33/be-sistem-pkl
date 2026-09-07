"use client";

import React, { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Search, X, UserCircle2, GraduationCap, MapPin, Phone, Printer } from "lucide-react";
import { toast } from 'sonner';
import ConfirmModal from '../../../components/ConfirmModal';
import Swal from 'sweetalert2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type Guru = {
  id: number;
  userId: number;
  nip: string;
  namaLengkap: string;
  alamat?: string;
  kontak?: string;
  password?: string;
};

export default function AdminGuru() {
  const [gurus, setGurus] = useState<Guru[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Guru>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  
  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const API_URL = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/guru-pembimbing`;

  const fetchGurus = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      setGurus(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      toast.error('Gagal memuat data guru pembimbing');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGurus();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const generatePDF = () => {
    try {
      const doc = new jsPDF('p', 'pt', 'a4');
      
      // Header
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Daftar Guru Pembimbing PKL', 40, 40);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('SMK Negeri 6 Jember', 40, 55);
      
      const tableData = gurus.map((g, index) => [
        index + 1,
        g.nip,
        g.namaLengkap,
        g.alamat || '-',
        g.kontak || '-'
      ]);

      autoTable(doc, {
        startY: 70,
        head: [['No', 'NIP', 'Nama Lengkap', 'Alamat', 'No. HP']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [14, 165, 233] }, // smk-blue theme
        styles: { fontSize: 9 },
      });

      // Footer
      const today = new Date();
      const dateString = today.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
      const timeString = today.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      
      const finalY = (doc as any).lastAutoTable.finalY || 70;
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(`Dicetak pada: ${dateString} pukul ${timeString}`, 40, finalY + 20);

      const pdfBlob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, '_blank');
      
    } catch (error) {
      console.error("PDF Error:", error);
      toast.error("Gagal membuat dokumen PDF");
    }
  };

  const handleOpenModal = (guru: Guru | null = null) => {
    if (guru) {
      setFormData(guru);
      setIsEditing(true);
    } else {
      setFormData({
        nip: '',
        namaLengkap: '',
        alamat: '',
        kontak: ''
      });
      setIsEditing(false);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData({});
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const toastId = toast.loading(isEditing ? 'Menyimpan perubahan...' : 'Menambahkan guru...');
    
    try {
      const url = isEditing ? `${API_URL}/${formData.id}` : API_URL;
      const method = isEditing ? 'PATCH' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const responseData = await res.json();
      
      if (!res.ok) {
        throw new Error(responseData.message || 'Terjadi kesalahan');
      }
      
      toast.success(isEditing ? 'Guru berhasil diperbarui' : 'Guru berhasil ditambahkan', { id: toastId });
      handleCloseModal();
      fetchGurus();
    } catch (error: any) {
      toast.error(error.message, { id: toastId });
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    
    try {
      const res = await fetch(`${API_URL}/${deleteId}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteId(null);
        fetchGurus();
        Swal.fire('Terhapus!', 'Guru berhasil dihapus.', 'success');
      } else {
        const data = await res.json();
        Swal.fire('Peringatan', data.message || 'Gagal menghapus data', 'warning');
      }
    } catch (error) {
      Swal.fire('Error', 'Terjadi kesalahan server', 'error');
    }
  };

  const filteredGurus = (Array.isArray(gurus) ? gurus : []).filter(g => 
    g?.namaLengkap?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g?.nip?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredGurus.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentGurus = filteredGurus.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-[85vh] flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <GraduationCap className="text-smk-blue" size={28} />
            Data Guru Pembimbing
          </h1>
          <p className="text-sm text-slate-500 mt-1">Kelola data guru pembimbing PKL.</p>
        </div>
        <div className="flex w-full sm:w-auto flex-col sm:flex-row gap-2">
          <button
            onClick={generatePDF}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all font-semibold shadow-sm hover:shadow active:scale-95 justify-center"
          >
            <Printer size={18} />
            Cetak PDF
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2.5 bg-smk-blue text-white rounded-xl hover:bg-blue-700 transition-all font-semibold shadow-sm hover:shadow active:scale-95 justify-center"
          >
            <Plus size={18} />
            Tambah Guru
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
        <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Cari NIP atau Nama..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-smk-blue/20 focus:border-smk-blue transition-all bg-white"
            />
          </div>
          <div className="text-sm font-medium text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
            Total: <span className="text-smk-blue font-bold">{filteredGurus.length}</span> Guru
          </div>
        </div>

        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-sm">
                <th className="p-4 font-semibold text-slate-600">Nama Guru</th>
                <th className="p-4 font-semibold text-slate-600 w-48">NIP</th>
                <th className="p-4 font-semibold text-slate-600">Alamat</th>
                <th className="p-4 font-semibold text-slate-600 w-48">No. HP</th>
                <th className="p-4 font-semibold text-slate-600 text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center">
                    <div className="flex justify-center items-center gap-3 text-slate-400">
                      <div className="w-6 h-6 border-2 border-smk-blue/20 border-t-smk-blue rounded-full animate-spin"></div>
                      Memuat data...
                    </div>
                  </td>
                </tr>
              ) : filteredGurus.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                        <GraduationCap size={32} />
                      </div>
                      <p className="font-medium text-lg text-slate-600">Tidak ada data guru</p>
                      <p className="text-sm">Silakan tambahkan data guru baru.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                currentGurus.map((guru) => (
                  <tr key={guru.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                          <UserCircle2 size={20} />
                        </div>
                        <span className="font-semibold text-slate-800">{guru.namaLengkap}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium border border-slate-200">
                        {guru.nip}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600 text-sm">
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-slate-400 shrink-0" />
                        <span className="line-clamp-1">{guru.alamat || '-'}</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-600 text-sm">
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="text-slate-400 shrink-0" />
                        {guru.kontak || '-'}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleOpenModal(guru)}
                          className="p-2 text-smk-blue bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteId(guru.id)}
                          className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                          title="Hapus"
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

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-4 py-4 sm:px-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/30">
            <span className="text-xs sm:text-sm text-slate-500 font-medium">
              Menampilkan <span className="font-bold text-slate-700">{indexOfFirstItem + 1}</span> - <span className="font-bold text-slate-700">{Math.min(indexOfLastItem, filteredGurus.length)}</span> dari <span className="font-bold text-smk-blue">{filteredGurus.length}</span> data
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
              >
                Kembali
              </button>
              {Array.from({ length: totalPages }, (_, index) => {
                const pageNumber = index + 1;
                if (
                  pageNumber === 1 ||
                  pageNumber === totalPages ||
                  Math.abs(pageNumber - currentPage) <= 1
                ) {
                  return (
                    <button
                      key={pageNumber}
                      type="button"
                      onClick={() => setCurrentPage(pageNumber)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        currentPage === pageNumber
                          ? "bg-smk-blue text-white shadow-sm"
                          : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {pageNumber}
                    </button>
                  );
                }
                
                if (pageNumber === 2 && currentPage > 3) {
                  return <span key="ellipsis-left" className="text-slate-400 px-1 text-xs">...</span>;
                }
                if (pageNumber === totalPages - 1 && currentPage < totalPages - 2) {
                  return <span key="ellipsis-right" className="text-slate-400 px-1 text-xs">...</span>;
                }
                
                return null;
              })}
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <GraduationCap className="text-smk-blue" size={20} />
                {isEditing ? 'Edit Guru' : 'Tambah Guru'}
              </h2>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">NIP <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="nip"
                      value={formData.nip || ''}
                      onChange={handleInputChange}
                      required
                      className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-smk-blue/20 focus:border-smk-blue text-sm"
                      placeholder="Nomor Induk Pegawai"
                    />
                    {!isEditing && <p className="text-[10px] text-slate-500 mt-1">NIP akan digunakan sebagai Username dan Password bawaan untuk login.</p>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Nama Lengkap <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="namaLengkap"
                      value={formData.namaLengkap || ''}
                      onChange={handleInputChange}
                      required
                      className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-smk-blue/20 focus:border-smk-blue text-sm"
                      placeholder="Nama lengkap beserta gelar"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">No. HP</label>
                    <input
                      type="text"
                      name="kontak"
                      value={formData.kontak || ''}
                      onChange={handleInputChange}
                      className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-smk-blue/20 focus:border-smk-blue text-sm"
                      placeholder="Contoh: 08123456789"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Password Login</label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password || ''}
                      onChange={handleInputChange}
                      className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-smk-blue/20 focus:border-smk-blue text-sm"
                      placeholder={isEditing ? "Kosongkan jika tidak ingin mengubah" : "Akan menggunakan NIP jika kosong"}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Alamat</label>
                  <textarea
                    name="alamat"
                    value={formData.alamat || ''}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-smk-blue/20 focus:border-smk-blue text-sm resize-none"
                    placeholder="Alamat domisili lengkap"
                  ></textarea>
                </div>
              </div>
              
              <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-slate-800 transition-colors font-medium text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-smk-blue text-white rounded-xl hover:bg-blue-700 transition-all font-semibold shadow-sm hover:shadow text-sm flex items-center gap-2"
                >
                  {isEditing ? 'Simpan Perubahan' : 'Tambahkan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteId}
        title="Hapus Data Guru"
        message="Apakah Anda yakin ingin menghapus data guru ini? Semua data terkait (termasuk plot dudi dan absensi) akan terpengaruh. Proses ini tidak dapat dibatalkan."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
