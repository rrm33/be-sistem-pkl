"use client";

import React, { useState, useEffect, useRef } from "react";
import { Plus, Edit2, Trash2, Search, X, Users, Eye, EyeOff, MapPin, Download, Upload, Printer, Settings } from "lucide-react";
import { toast } from 'sonner';
import dynamic from 'next/dynamic';
import ConfirmModal from '../../../components/ConfirmModal';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const MapPicker = dynamic(() => import('../../../components/MapPicker'), { ssr: false });

type Siswa = {
  id: number;
  nisn: string;
  nis: string;
  namaLengkap: string;
  nik?: string;
  kk?: string;
  tmpLahir?: string;
  tglLahir?: string;
  bpjs?: string;
  hp?: string;
  hpOrtu?: string;
  alamat?: string;
  jk?: string;
  email?: string;
  kelas?: string;
  foto?: string;
  jurusanId?: number;
  jurusan?: { nama: string };
  perusahaanId?: number | null;
  cabangId?: number | null;
  perusahaan?: { nama: string; cabang?: { id: number; namaCabang: string; alamat?: string }[] } | null;
  cabang?: { id: number; namaCabang: string; alamat?: string } | null;
  hariKerjaOverride?: string | null;
  jamMasukOverride?: string | null;
  jamPulangOverride?: string | null;
  pklMulaiOverride?: string | null;
  pklSelesaiOverride?: string | null;
  isIosUser?: boolean;
};

export default function SiswaPage() {
  const [siswas, setSiswas] = useState<Siswa[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [selectedSiswa, setSelectedSiswa] = useState<Siswa | null>(null);
  const [formData, setFormData] = useState<Partial<Siswa> & { password?: string }>({});
  const [isUploading, setIsUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [previewFoto, setPreviewFoto] = useState<string | null>(null);
  const [kelasList, setKelasList] = useState<{id: number, nama: string, jurusanId: number}[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pagination & Filter States
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [selectedKelas, setSelectedKelas] = useState<string>("");

  const API_URL = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/siswa`;

  useEffect(() => {
    fetchSiswas();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedKelas]);

  const fetchSiswas = async () => {
    try {
      const [resSiswa, resKelas] = await Promise.all([
        fetch(API_URL),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}`}/kelas`)
      ]);
      if (!resSiswa.ok) throw new Error("Gagal mengambil data");
      const dataSiswa = await resSiswa.json();
      const dataKelas = await resKelas.json();
      setSiswas(dataSiswa);
      setKelasList(dataKelas);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = async (siswa?: Siswa) => {
    if (siswa) {
      toast.loading("Memuat data lengkap...", { id: "siswa-load" });
      try {
        const res = await fetch(`${API_URL}/${siswa.id}`);
        if (res.ok) {
          const fullData = await res.json();
          setFormData({ 
            ...fullData, 
            tglLahir: fullData.tglLahir ? new Date(fullData.tglLahir).toISOString().split('T')[0] : '',
            hariKerjaOverride: fullData.hariKerjaOverride || "",
            jamMasukOverride: fullData.jamMasukOverride || "",
            jamPulangOverride: fullData.jamPulangOverride || "",
            pklMulaiOverride: fullData.pklMulaiOverride ? new Date(fullData.pklMulaiOverride).toISOString().split('T')[0] : '',
            pklSelesaiOverride: fullData.pklSelesaiOverride ? new Date(fullData.pklSelesaiOverride).toISOString().split('T')[0] : '',
            cabangId: fullData.cabangId || undefined
          });
          setIsEditing(true);
          setIsModalOpen(true);
          toast.success("Data berhasil dimuat", { id: "siswa-load" });
        } else {
          throw new Error();
        }
      } catch (error) {
        toast.error("Gagal memuat data lengkap", { id: "siswa-load" });
      }
    } else {
      setFormData({ jk: 'L', hariKerjaOverride: "", jamMasukOverride: "", jamPulangOverride: "", pklMulaiOverride: "", pklSelesaiOverride: "", cabangId: undefined });
      setIsEditing(false);
      setIsModalOpen(true);
    }
    setShowPassword(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = isEditing ? `${API_URL}/${formData.id}` : API_URL;
      const method = isEditing ? "PATCH" : "POST";
      
      const payload = { ...formData };
      delete payload.id;
      if (!payload.pklMulaiOverride) payload.pklMulaiOverride = null;
      if (!payload.pklSelesaiOverride) payload.pklSelesaiOverride = null;
      // Hapus relasi sebelum dikirim ke backend untuk menghindari error Prisma
      if ('user' in payload) delete (payload as any).user;
      if ('jurusan' in payload) delete (payload as any).jurusan;
      if ('perusahaan' in payload) delete (payload as any).perusahaan;
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        fetchSiswas();
        setIsModalOpen(false);
        toast.success(isEditing ? 'Data siswa berhasil diperbarui!' : 'Siswa baru berhasil ditambahkan!');
      } else {
        const errData = await res.json();
        toast.error(errData.message || "Gagal menyimpan data");
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
        fetchSiswas();
        Swal.fire('Terhapus!', 'Data siswa berhasil dihapus.', 'success');
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formDataUpload = new FormData();
    formDataUpload.append("file", file);

    try {
      const res = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formDataUpload,
      });

      if (res.ok) {
        const data = await res.json();
        setFormData({ ...formData, foto: data.url });
      } else {
        toast.error('Gagal mengunggah foto');
      }
    } catch (error) {
      console.error(error);
      toast.error('Terjadi kesalahan saat mengunggah foto');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'NISN': '1234567890',
        'NIS': '1001',
        'Nama Lengkap': 'John Doe',
        'Jenis Kelamin': 'L',
        'Tempat Lahir': 'Jakarta',
        'Tanggal Lahir': '2005-08-17',
        'Kelas': 'XI RPL 1',
        'NIK': '3509xxxxxxxxxxxx',
        'No. KK': '3509xxxxxxxxxxxx',
        'Alamat Lengkap': 'Jl. Kenangan No. 1',
        'No. HP': '081234567890',
        'No. HP Ortu': '081234567891',
        'Email': 'john@example.com',
        'No. BPJS': '000123456789'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Siswa");
    XLSX.writeFile(wb, "Template_Import_Siswa.xlsx");
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
  };

  const executeImport = async () => {
    if (!importFile) return;

    setIsImporting(true);
    const formDataUpload = new FormData();
    formDataUpload.append("file", importFile);
    
    setImportFile(null);

    try {
      const res = await fetch(`${API_URL}/import`, {
        method: "POST",
        body: formDataUpload,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.summary.failedCount > 0) {
          toast.warning(`Berhasil: ${data.summary.successCount}, Gagal: ${data.summary.failedCount}. Silakan cek console untuk detail.`);
          console.log("Error Detail:", data.summary.errors);
        } else {
          toast.success(`Berhasil mengimpor ${data.summary.successCount} data siswa!`);
        }
        fetchSiswas();
      } else {
        const errData = await res.json();
        toast.error(errData.message || 'Gagal mengimpor data');
      }
    } catch (error) {
      console.error(error);
      toast.error('Terjadi kesalahan saat import data');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const generatePDF = () => {
    try {
      const doc = new jsPDF('p', 'pt', 'a4');
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Daftar Siswa PKL', 40, 40);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('SMK Negeri 6 Jember', 40, 55);
      
      const tableData = siswas.map((s, index) => [
        index + 1,
        s.nisn,
        s.namaLengkap,
        s.kelas || '-',
        s.jk || '-'
      ]);

      autoTable(doc, {
        startY: 70,
        head: [['No', 'NISN', 'Nama Lengkap', 'Kelas', 'L/P']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [14, 165, 233] },
        styles: { fontSize: 9 },
      });

      const today = new Date();
      const dateString = today.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
      const timeString = today.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      
      const finalY = (doc as any).lastAutoTable.finalY || 70;
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(`Dicetak pada: ${dateString} pukul ${timeString}`, 40, finalY + 20);

      const pdfBlob = doc.output('blob');
      window.open(URL.createObjectURL(pdfBlob), '_blank');
      
    } catch (error) {
      console.error("PDF Error:", error);
      toast.error("Gagal membuat dokumen PDF");
    }
  };

  const filteredSiswas = siswas.filter(s => {
    const matchesSearch = s.namaLengkap.toLowerCase().includes(searchQuery.toLowerCase()) || 
      s.nisn.includes(searchQuery) ||
      s.nis.includes(searchQuery);
    const matchesKelas = selectedKelas === "" || s.kelas === selectedKelas;
    return matchesSearch && matchesKelas;
  });

  const totalPages = Math.ceil(filteredSiswas.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentSiswas = filteredSiswas.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="text-smk-blue" size={28} />
            Data Siswa
          </h1>
          <p className="text-sm text-slate-500 mt-1">Kelola data induk dan akun login siswa PKL.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input 
            type="file" 
            accept=".xlsx, .xls, .csv" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleImportExcel}
          />
          <button
            onClick={generatePDF}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-4 py-2.5 rounded-xl transition-all duration-300 shadow-sm flex items-center gap-2 font-medium"
            title="Cetak PDF"
          >
            <Printer size={18} className="text-slate-500" />
            <span className="hidden sm:inline">Cetak PDF</span>
          </button>
          <button
            onClick={handleDownloadTemplate}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-4 py-2.5 rounded-xl transition-all duration-300 shadow-sm flex items-center gap-2 font-medium"
            title="Download Template Excel"
          >
            <Download size={18} className="text-smk-orange" />
            <span className="hidden sm:inline">Template</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-4 py-2.5 rounded-xl transition-all duration-300 shadow-sm flex items-center gap-2 font-medium disabled:opacity-50"
            title="Import dari Excel"
          >
            <Upload size={18} className={isImporting ? "animate-bounce text-smk-blue" : "text-smk-blue"} />
            <span className="hidden sm:inline">{isImporting ? "Proses..." : "Import"}</span>
          </button>

          <button
            onClick={() => handleOpenModal()}
            className="bg-gradient-to-r from-smk-blue to-[#266f9f] hover:from-[#1a4f6e] hover:to-smk-blue text-white px-5 py-2.5 rounded-xl transition-all duration-300 shadow-lg shadow-smk-blue/30 flex items-center gap-2 font-medium group"
          >
            <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
            <span>Tambah Siswa</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-80">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Cari nama, NISN, atau NIS..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-smk-blue/20 focus:border-smk-blue transition-all"
              />
            </div>
            
            {/* Filter Kelas */}
            <select
              value={selectedKelas}
              onChange={(e) => setSelectedKelas(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-smk-blue/20 focus:border-smk-blue transition-all w-full sm:w-48 cursor-pointer text-slate-700"
            >
              <option value="">Semua Kelas</option>
              {kelasList.map((k) => (
                <option key={k.id} value={k.nama}>{k.nama}</option>
              ))}
            </select>
          </div>
          <div className="text-sm text-slate-500 font-medium">
            Total: <span className="text-smk-orange font-bold bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100">{filteredSiswas.length}</span> Siswa
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-white border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-16">No</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">NISN / NIS</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nama Lengkap</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">L/P</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Kelas / Jurusan</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="w-8 h-8 border-4 border-smk-blue/20 border-t-smk-blue rounded-full animate-spin mx-auto"></div>
                  </td>
                </tr>
              ) : filteredSiswas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">Tidak ada data siswa.</td>
                </tr>
              ) : (
                currentSiswas.map((siswa, index) => (
                  <tr key={siswa.id} className="group hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-500">{indexOfFirstItem + index + 1}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-slate-900">{siswa.nisn}</div>
                      <div className="text-xs text-slate-500">{siswa.nis}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-full bg-slate-200 border border-slate-300 overflow-hidden shrink-0 cursor-pointer hover:ring-2 hover:ring-smk-orange hover:ring-offset-2 transition-all"
                          onClick={() => setPreviewFoto(siswa.foto ? `${process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}`}${siswa.foto}` : "https://api.dicebear.com/7.x/notionists/svg?seed=" + siswa.namaLengkap.replace(/\s+/g, ''))}
                        >
                          <img src={siswa.foto ? `${process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}`}${siswa.foto}` : "https://api.dicebear.com/7.x/notionists/svg?seed=" + siswa.namaLengkap.replace(/\s+/g, '')} alt={siswa.namaLengkap} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{siswa.namaLengkap}</div>
                          <div className="text-xs text-slate-500">{siswa.email || '-'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">{siswa.jk}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-smk-blue border border-blue-100">
                        {siswa.kelas || '-'} {siswa.jurusan?.nama || ''}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => { setSelectedSiswa(siswa); setIsDetailOpen(true); }} className="p-2 text-smk-blue bg-blue-50 hover:bg-blue-100 rounded-lg">
                          <Eye size={16} />
                        </button>
                        <button onClick={() => handleOpenModal(siswa)} className="p-2 text-smk-orange bg-orange-50 hover:bg-orange-100 rounded-lg">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(siswa.id)} className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg">
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
          <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/30">
            <span className="text-xs sm:text-sm text-slate-500 font-medium">
              Menampilkan <span className="font-bold text-slate-700">{indexOfFirstItem + 1}</span> - <span className="font-bold text-slate-700">{Math.min(indexOfLastItem, filteredSiswas.length)}</span> dari <span className="font-bold text-smk-orange">{filteredSiswas.length}</span> data
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
                          ? "bg-smk-orange text-white shadow-sm"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Users className="text-smk-orange" size={24} />
                {isEditing ? "Edit Data Siswa" : "Tambah Siswa Baru"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 rounded-full">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Bagian Kiri: Identitas Utama & Akun */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-smk-blue border-b pb-2">Identitas & Akun</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">NISN <span className="text-red-500">*</span></label>
                        <input type="text" required value={formData.nisn || ''} onChange={e => setFormData({...formData, nisn: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-smk-blue/30" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">NIS <span className="text-red-500">*</span></label>
                        <input type="text" required value={formData.nis || ''} onChange={e => setFormData({...formData, nis: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-smk-blue/30" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap <span className="text-red-500">*</span></label>
                      <input type="text" required value={formData.namaLengkap || ''} onChange={e => setFormData({...formData, namaLengkap: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-smk-blue/30" />
                    </div>

                    {!isEditing && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Password Login <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <input type={showPassword ? "text" : "password"} required minLength={4} value={formData.password || ''} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full px-3 py-2 pr-10 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-smk-blue/30" placeholder="Minimal 4 karakter" />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-2 text-slate-400 hover:text-slate-600">
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">NIK</label>
                        <input type="text" value={formData.nik || ''} onChange={e => setFormData({...formData, nik: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-smk-blue/30" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">No. KK</label>
                        <input type="text" value={formData.kk || ''} onChange={e => setFormData({...formData, kk: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-smk-blue/30" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Tempat Lahir</label>
                        <input type="text" value={formData.tmpLahir || ''} onChange={e => setFormData({...formData, tmpLahir: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-smk-blue/30" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Lahir</label>
                        <input type="date" value={formData.tglLahir || ''} onChange={e => setFormData({...formData, tglLahir: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-smk-blue/30" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Kelamin</label>
                        <select value={formData.jk || 'L'} onChange={e => setFormData({...formData, jk: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-smk-blue/30">
                          <option value="L">Laki-laki (L)</option>
                          <option value="P">Perempuan (P)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Kelas</label>
                        <select 
                          value={formData.kelas || ''} 
                          onChange={e => {
                            const selectedKelasNama = e.target.value;
                            const kelasObj = kelasList.find(k => k.nama === selectedKelasNama);
                            setFormData({
                              ...formData, 
                              kelas: selectedKelasNama,
                              jurusanId: kelasObj ? kelasObj.jurusanId : formData.jurusanId
                            });
                          }} 
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-smk-blue/30"
                        >
                          <option value="">-- Pilih Kelas --</option>
                          {kelasList.map(k => (
                            <option key={k.id} value={k.nama}>{k.nama}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Bagian Kanan: Kontak & Informasi Tambahan */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-smk-blue border-b pb-2">Kontak & Lainnya</h3>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-700">Alamat Lengkap</label>
                        <button type="button" onClick={() => setIsMapOpen(true)} className="text-[10px] flex items-center gap-1 font-bold text-white bg-smk-orange px-2 py-1 rounded shadow hover:bg-orange-600 transition-colors">
                          <MapPin size={12} /> Pilih dari Peta
                        </button>
                      </div>
                      <textarea rows={3} value={formData.alamat || ''} onChange={e => setFormData({...formData, alamat: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-smk-blue/30 resize-none"></textarea>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">No. HP / WA</label>
                        <input type="text" value={formData.hp || ''} onChange={e => setFormData({...formData, hp: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-smk-blue/30" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">No. HP Orang Tua</label>
                        <input type="text" value={formData.hpOrtu || ''} onChange={e => setFormData({...formData, hpOrtu: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-smk-blue/30" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                        <input type="email" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-smk-blue/30" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">No. BPJS</label>
                        <input type="text" value={formData.bpjs || ''} onChange={e => setFormData({...formData, bpjs: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-smk-blue/30" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Foto Profil</label>
                      <div className="flex items-center gap-4">
                        {formData.foto && (
                          <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200">
                            <img src={`${process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}`}${formData.foto}`} alt="Preview" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="flex-1">
                          <input type="file" accept="image/*" onChange={handleFileUpload} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-smk-blue/30 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-smk-blue/10 file:text-smk-blue hover:file:bg-smk-blue/20 cursor-pointer" />
                          {isUploading && <p className="text-xs text-smk-orange mt-1">Mengunggah foto...</p>}
                        </div>
                      </div>
                    </div>

                    {/* PKL Date Override Settings */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Masa PKL (Override Khusus)</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Mulai PKL</label>
                          <input type="date" value={formData.pklMulaiOverride || ''} onChange={e => setFormData({...formData, pklMulaiOverride: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-smk-blue/30" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Selesai PKL</label>
                          <input type="date" value={formData.pklSelesaiOverride || ''} onChange={e => setFormData({...formData, pklSelesaiOverride: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-smk-blue/30" />
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-tight">
                        * Biarkan kosong untuk mengikuti tanggal awal/akhir PKL secara umum.
                      </p>
                    </div>

                    {/* Device Platform Flag */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Perangkat & Keamanan</h4>
                      <label className="flex items-center gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={formData.isIosUser || false}
                          onChange={(e) => setFormData({ ...formData, isIosUser: e.target.checked })}
                          className="w-4 h-4 rounded text-smk-blue border-slate-300 focus:ring-smk-blue/30 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-slate-700">
                          Siswa Menggunakan iPhone (iOS)
                        </span>
                      </label>
                      <p className="text-[10px] text-slate-400 leading-tight pl-6.5">
                        * Centang ini agar siswa diizinkan untuk menggunakan website absensi khusus iOS. 
                        Android user wajib memakai aplikasi mobile native.
                      </p>
                    </div>

                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-2xl sticky bottom-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors">Batal</button>
                <button type="submit" disabled={isUploading} className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-smk-blue to-[#266f9f] rounded-xl hover:shadow-lg transition-all disabled:opacity-50">{isEditing ? "Simpan Perubahan" : "Simpan Siswa"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDetailOpen && selectedSiswa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsDetailOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Users className="text-smk-orange" size={24} />
                Detail Biodata Siswa
              </h2>
              <button onClick={() => setIsDetailOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 rounded-full">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="flex flex-col sm:flex-row gap-6 mb-8 items-center sm:items-start border-b border-slate-100 pb-6">
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-4 border-white shadow-lg bg-slate-100 flex-shrink-0">
                  {selectedSiswa.foto ? (
                    <img src={`${process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}`}${selectedSiswa.foto}`} alt={selectedSiswa.namaLengkap} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-4xl font-bold">
                      {selectedSiswa.namaLengkap.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="text-center sm:text-left flex-1">
                  <h3 className="text-2xl font-bold text-slate-900">{selectedSiswa.namaLengkap}</h3>
                  <div className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-smk-blue border border-blue-100 mt-2 mb-3">
                    {selectedSiswa.nisn} / {selectedSiswa.nis}
                  </div>
                  <p className="text-sm text-slate-500">Kelas: <span className="font-semibold text-slate-700">{selectedSiswa.kelas || '-'} {selectedSiswa.jurusan?.nama || ''}</span></p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                <div><p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">NIK</p><p className="text-sm font-medium text-slate-900">{selectedSiswa.nik || '-'}</p></div>
                <div><p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">No. KK</p><p className="text-sm font-medium text-slate-900">{selectedSiswa.kk || '-'}</p></div>
                <div><p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Jenis Kelamin</p><p className="text-sm font-medium text-slate-900">{selectedSiswa.jk === 'L' ? 'Laki-laki' : selectedSiswa.jk === 'P' ? 'Perempuan' : '-'}</p></div>
                <div><p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">TTL</p><p className="text-sm font-medium text-slate-900">{selectedSiswa.tmpLahir || '-'}, {selectedSiswa.tglLahir ? new Date(selectedSiswa.tglLahir).toLocaleDateString('id-ID') : '-'}</p></div>
                <div><p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Email</p><p className="text-sm font-medium text-slate-900">{selectedSiswa.email || '-'}</p></div>
                <div><p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">No. HP / WA</p><p className="text-sm font-medium text-slate-900">{selectedSiswa.hp || '-'}</p></div>
                <div><p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">No. HP Orang Tua</p><p className="text-sm font-medium text-slate-900">{selectedSiswa.hpOrtu || '-'}</p></div>
                <div><p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">No. BPJS</p><p className="text-sm font-medium text-slate-900">{selectedSiswa.bpjs || '-'}</p></div>
                <div><p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Override Mulai PKL</p><p className="text-sm font-medium text-slate-900">{selectedSiswa.pklMulaiOverride ? new Date(selectedSiswa.pklMulaiOverride).toLocaleDateString('id-ID') : 'Mengikuti default'}</p></div>
                <div><p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Override Selesai PKL</p><p className="text-sm font-medium text-slate-900">{selectedSiswa.pklSelesaiOverride ? new Date(selectedSiswa.pklSelesaiOverride).toLocaleDateString('id-ID') : 'Mengikuti default'}</p></div>
                <div><p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Perangkat Absensi</p><p className={`text-sm font-bold ${selectedSiswa.isIosUser ? 'text-amber-600 font-bold' : 'text-slate-800 font-medium'}`}>{selectedSiswa.isIosUser ? 'iPhone (iOS Web Portal)' : 'Android (Native App)'}</p></div>
                <div className="sm:col-span-2"><p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Alamat Lengkap</p><p className="text-sm font-medium text-slate-900">{selectedSiswa.alamat || '-'}</p></div>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end rounded-b-2xl">
              <button onClick={() => setIsDetailOpen(false)} className="px-5 py-2.5 text-sm font-medium text-white bg-slate-800 hover:bg-slate-900 rounded-xl transition-colors">Tutup</button>
            </div>
          </div>
        </div>
      )}

      {isMapOpen && (
        <MapPicker 
          onClose={() => setIsMapOpen(false)} 
          onLocationSelect={(addr) => {
            setFormData({...formData, alamat: addr});
            setIsMapOpen(false);
          }} 
        />
      )}

      <ConfirmModal 
        isOpen={deleteId !== null}
        title="Konfirmasi Hapus"
        message="Apakah Anda yakin ingin menghapus siswa ini? Menghapus siswa juga akan menghapus akun login mereka secara permanen."
        onConfirm={executeDelete}
        onCancel={() => setDeleteId(null)}
      />

      <ConfirmModal 
        isOpen={importFile !== null}
        title="Konfirmasi Import Excel"
        message={`Anda akan mengimpor data dari file "${importFile?.name}". Pastikan format data sudah sesuai dengan template. Lanjutkan?`}
        onConfirm={executeImport}
        onCancel={() => {
          setImportFile(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }}
      />

      {/* Modal Preview Foto */}
      {previewFoto && (
        <div 
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm cursor-zoom-out"
          onClick={() => setPreviewFoto(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] flex items-center justify-center">
            <button 
              className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-all"
              onClick={(e) => { e.stopPropagation(); setPreviewFoto(null); }}
            >
              <X size={24} />
            </button>
            <img 
              src={previewFoto} 
              alt="Preview" 
              className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain border-4 border-white/10 animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
