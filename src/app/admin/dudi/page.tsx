"use client";

import React, { useState, useEffect, useRef } from "react";
import { Plus, Edit2, Trash2, Search, X, Building2, Upload, MapPin, Navigation, Printer, Calendar, Briefcase, Clock, Users } from "lucide-react";
import { toast } from 'sonner';
import ConfirmModal from '../../../components/ConfirmModal';
import Swal from 'sweetalert2';
import dynamic from 'next/dynamic';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const MapPicker = dynamic(() => import('../../../components/MapPicker'), { 
  ssr: false,
  loading: () => <div className="w-full h-64 bg-slate-100 animate-pulse rounded-xl flex items-center justify-center text-slate-400">Memuat peta...</div>
});

type Perusahaan = {
  id: number;
  userId: number;
  nama: string;
  pimpinan?: string;
  alamat?: string;
  alamatLengkap?: string;
  email?: string;
  hp?: string;
  pembimbing?: string;
  maps1?: string;
  maps2?: string;
  maps3?: string;
  jamOpr?: string;
  hariOpr?: string;
  jamMasuk?: string;
  jamPulang?: string;
  logo?: string;
  cabang?: any[];
  user?: {
    username: string;
  }
};

export default function AdminDudi() {
  const [perusahaans, setPerusahaans] = useState<Perusahaan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Perusahaan> & { password?: string }>({});
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewLogo, setPreviewLogo] = useState<string | null>(null);
  const [isCabangMapOpen, setIsCabangMapOpen] = useState(false);
  const [isPerusahaanMapOpen, setIsPerusahaanMapOpen] = useState(false);

  // Cabang Management States
  const [selectedPerusahaanForCabang, setSelectedPerusahaanForCabang] = useState<Perusahaan | null>(null);
  const [cabangs, setCabangs] = useState<any[]>([]);
  const [isCabangModalOpen, setIsCabangModalOpen] = useState(false);
  const [isCabangFormOpen, setIsCabangFormOpen] = useState(false);
  const [editingCabang, setEditingCabang] = useState<any | null>(null);
  const [cabangFormData, setCabangFormData] = useState({
    namaCabang: "",
    alamat: "",
    hariKerja: "SENIN,SELASA,RABU,KAMIS,JUMAT",
    jamMasuk: "07:30",
    jamPulang: "16:00",
    batasTerlambat: 15,
  });

  // Holiday Management States
  const [selectedPerusahaanForHoliday, setSelectedPerusahaanForHoliday] = useState<Perusahaan | null>(null);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [holidayFormData, setHolidayFormData] = useState({
    tanggal: "",
    keterangan: "",
    cabangId: "", // Optional specific branch
  });

  // Student & Shift Management States
  const [selectedPerusahaanForStudent, setSelectedPerusahaanForStudent] = useState<Perusahaan | null>(null);
  const [companyStudents, setCompanyStudents] = useState<any[]>([]);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingStudentShift, setEditingStudentShift] = useState<any | null>(null);
  const [studentShiftFormData, setStudentShiftFormData] = useState({
    cabangId: "",
    hariKerjaOverride: "",
    jamMasukOverride: "",
    jamPulangOverride: ""
  });

  const API_URL = `${process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}`}/perusahaan`;

  const fetchPerusahaans = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      setPerusahaans(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      toast.error('Gagal memuat data perusahaan');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPerusahaans();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleOpenModal = (perusahaan: Perusahaan | null = null) => {
    setLogoFile(null);
    if (perusahaan) {
      const resolvedAlamatLengkap = 
        perusahaan.alamatLengkap || 
        (perusahaan.cabang && perusahaan.cabang[0]?.alamat) || 
        (perusahaan.alamat && (perusahaan.alamat.includes('Koordinat') || perusahaan.alamat.length > 20) ? perusahaan.alamat : '');

      const resolvedAlamat = 
        perusahaan.alamat && !perusahaan.alamat.includes('Koordinat') ? perusahaan.alamat : '';

      setFormData({
        ...perusahaan,
        alamat: resolvedAlamat || perusahaan.alamat || "",
        alamatLengkap: resolvedAlamatLengkap || perusahaan.alamatLengkap || "",
      });
      setLogoPreview(perusahaan.logo ? `${process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}`}${perusahaan.logo}` : null);
      setIsEditing(true);
    } else {
      setFormData({ 
        nama: "", email: "", pimpinan: "", alamat: "", alamatLengkap: "", hp: "", 
        pembimbing: "", jamOpr: "", hariOpr: "" 
      });
      setLogoPreview(null);
      setIsEditing(false);
    }
    setIsModalOpen(true);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama || !formData.email) {
      toast.error("Nama Perusahaan dan Email (Username) wajib diisi");
      return;
    }

    try {
      const url = isEditing ? `${API_URL}/${formData.id}` : API_URL;
      const method = isEditing ? "PATCH" : "POST";
      
      const uploadData = new FormData();
      Object.keys(formData).forEach(key => {
        if (key !== 'logo' && key !== 'user' && key !== 'id') {
          uploadData.append(key, (formData as any)[key] || '');
        }
      });
      if (logoFile) {
        uploadData.append('logo', logoFile);
      }

      const res = await fetch(url, {
        method,
        body: uploadData,
      });

      if (res.ok) {
        fetchPerusahaans();
        setIsModalOpen(false);
        toast.success(isEditing ? 'Data perusahaan berhasil diperbarui!' : 'Perusahaan baru berhasil ditambahkan!');
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
        fetchPerusahaans();
        Swal.fire('Terhapus!', 'Data perusahaan dan akun login telah dihapus.', 'success');
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

  const handlePerusahaanGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation tidak didukung di browser ini");
      return;
    }
    
    toast.loading("Mendapatkan lokasi perangkat...", { id: "geo-toast" });
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const data = await res.json();
        if (data && data.display_name) {
          const address = `${data.display_name} (Koordinat: ${lat}, ${lng})`;
          setFormData(prev => ({ 
            ...prev, 
            alamatLengkap: address
          }));
          toast.success("Lokasi berhasil didapatkan", { id: "geo-toast" });
        } else {
          throw new Error("Alamat tidak ditemukan");
        }
      } catch (e) {
        toast.error("Gagal mengambil alamat dari koordinat", { id: "geo-toast" });
      }
    }, (err) => {
      toast.error("Gagal mendapatkan akses lokasi. Pastikan izin lokasi aktif.", { id: "geo-toast" });
    });
  };

  const handlePerusahaanMapSelect = async (lat: number, lng: number) => {
    toast.loading("Mengambil alamat titik...", { id: "geo-toast" });
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await res.json();
      if (data && data.display_name) {
        const address = `${data.display_name} (Koordinat: ${lat}, ${lng})`;
        setFormData(prev => ({ 
          ...prev, 
          alamatLengkap: address
        }));
        toast.success("Titik lokasi dipilih", { id: "geo-toast" });
      } else {
        throw new Error("Alamat tidak ditemukan");
      }
    } catch (e) {
      toast.error("Gagal mengambil alamat dari koordinat", { id: "geo-toast" });
    } finally {
      setIsPerusahaanMapOpen(false);
    }
  };

  const handleCabangGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation tidak didukung di browser ini");
      return;
    }
    
    toast.loading("Mendapatkan lokasi perangkat...", { id: "geo-toast" });
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const data = await res.json();
        if (data && data.display_name) {
          const address = `${data.display_name} (Koordinat: ${lat}, ${lng})`;
          setCabangFormData(prev => ({ 
            ...prev, 
            alamat: address
          }));
          toast.success("Lokasi berhasil didapatkan", { id: "geo-toast" });
        } else {
          throw new Error("Alamat tidak ditemukan");
        }
      } catch (e) {
        toast.error("Gagal mengambil alamat dari koordinat", { id: "geo-toast" });
      }
    }, (err) => {
      toast.error("Gagal mendapatkan akses lokasi. Pastikan izin lokasi aktif.", { id: "geo-toast" });
    });
  };

  const handleCabangMapSelect = async (lat: number, lng: number) => {
    toast.loading("Mengambil alamat titik...", { id: "geo-toast" });
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await res.json();
      if (data && data.display_name) {
        const address = `${data.display_name} (Koordinat: ${lat}, ${lng})`;
        setCabangFormData(prev => ({ 
          ...prev, 
          alamat: address
        }));
        toast.success("Titik lokasi dipilih", { id: "geo-toast" });
      } else {
        throw new Error("Alamat tidak ditemukan");
      }
    } catch (e) {
      toast.error("Gagal mengambil alamat dari koordinat", { id: "geo-toast" });
    } finally {
      setIsCabangMapOpen(false);
    }
  };

  // Fetch Cabang
  const fetchCabangs = async (perusahaanId: number) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/cabang?perusahaanId=${perusahaanId}`);
      const data = await res.json();
      setCabangs(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error("Gagal memuat data cabang");
    }
  };

  // Open Cabang Modal
  const handleOpenCabangModal = (perusahaan: Perusahaan) => {
    setSelectedPerusahaanForCabang(perusahaan);
    fetchCabangs(perusahaan.id);
    setIsCabangModalOpen(true);
  };

  // Save Cabang
  const handleSaveCabang = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cabangFormData.namaCabang) {
      toast.error("Nama Cabang wajib diisi");
      return;
    }
    try {
      const isEdit = !!editingCabang;
      const url = isEdit 
        ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/cabang/${editingCabang.id}`
        : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/cabang`;
      const method = isEdit ? "PATCH" : "POST";
      const payload = {
        ...cabangFormData,
        perusahaanId: selectedPerusahaanForCabang?.id,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(isEdit ? "Cabang berhasil diperbarui" : "Cabang berhasil ditambahkan");
        fetchCabangs(selectedPerusahaanForCabang!.id);
        setIsCabangFormOpen(false);
        setEditingCabang(null);
      } else {
        const err = await res.json();
        toast.error(err.message || "Gagal menyimpan cabang");
      }
    } catch (error) {
      toast.error("Kesalahan server");
    }
  };

  const promptPinAndDelete = (title: string, message: string, deleteCallback: () => void) => {
    Swal.fire({
      title,
      text: message,
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
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus Data',
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
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/auth/verify-pin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, pin: pinValue.trim() }),
          });
          if (!res.ok) {
            const data = await res.json();
            Swal.showValidationMessage(data.message || 'PIN Keamanan Admin Salah!');
            return false;
          }
          return true;
        } catch (e) {
          Swal.showValidationMessage('Gagal memverifikasi PIN Keamanan.');
          return false;
        }
      }
    }).then((result) => {
      if (result.isConfirmed) {
        deleteCallback();
      }
    });
  };

  // Delete Cabang
  const handleDeleteCabang = (cabangId: number) => {
    promptPinAndDelete(
      "Konfirmasi Hapus Cabang",
      "Apakah Anda yakin ingin menghapus cabang ini? Siswa yang diplot di cabang ini perlu diplot ulang.",
      async () => {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/cabang/${cabangId}`, {
            method: "DELETE",
          });
          if (res.ok) {
            toast.success("Cabang berhasil dihapus");
            fetchCabangs(selectedPerusahaanForCabang!.id);
          } else {
            const err = await res.json();
            toast.error(err.message || "Gagal menghapus cabang");
          }
        } catch (error) {
          toast.error("Kesalahan server");
        }
      }
    );
  };

  // Fetch Holidays
  const fetchHolidays = async (perusahaanId: number) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/hari-libur?perusahaanId=${perusahaanId}`);
      const data = await res.json();
      setHolidays(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error("Gagal memuat data hari libur");
    }
  };

  // Open Holiday Modal
  const handleOpenHolidayModal = (perusahaan: Perusahaan) => {
    setSelectedPerusahaanForHoliday(perusahaan);
    fetchHolidays(perusahaan.id);
    fetchCabangs(perusahaan.id);
    setIsHolidayModalOpen(true);
  };

  // Save Holiday
  const handleSaveHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayFormData.tanggal || !holidayFormData.keterangan) {
      toast.error("Tanggal dan Keterangan wajib diisi");
      return;
    }
    try {
      const payload = {
        tanggal: holidayFormData.tanggal,
        keterangan: holidayFormData.keterangan,
        perusahaanId: selectedPerusahaanForHoliday?.id,
        cabangId: holidayFormData.cabangId ? Number(holidayFormData.cabangId) : undefined,
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/hari-libur`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success("Hari libur khusus berhasil ditambahkan");
        fetchHolidays(selectedPerusahaanForHoliday!.id);
        setHolidayFormData({ tanggal: "", keterangan: "", cabangId: "" });
      } else {
        const err = await res.json();
        toast.error(err.message || "Gagal menyimpan hari libur");
      }
    } catch (error) {
      toast.error("Kesalahan server");
    }
  };

  // Delete Holiday
  const handleDeleteHoliday = (holidayId: number) => {
    promptPinAndDelete(
      "Konfirmasi Hapus Hari Libur",
      "Hapus hari libur khusus ini?",
      async () => {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/hari-libur/${holidayId}`, {
            method: "DELETE",
          });
          if (res.ok) {
            toast.success("Hari libur berhasil dihapus");
            fetchHolidays(selectedPerusahaanForHoliday!.id);
          }
        } catch (error) {
          toast.error("Kesalahan server");
        }
      }
    );
  };

  // Fetch Company Students
  const fetchCompanyStudents = async (perusahaanId: number) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/siswa?perusahaanId=${perusahaanId}`);
      const data = await res.json();
      setCompanyStudents(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error("Gagal memuat daftar siswa");
    }
  };

  const handleOpenStudentModal = (perusahaan: Perusahaan) => {
    setSelectedPerusahaanForStudent(perusahaan);
    fetchCompanyStudents(perusahaan.id);
    setIsStudentModalOpen(true);
  };

  const handleSaveStudentShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudentShift) return;
    const toastId = toast.loading("Menyimpan pengaturan...");
    try {
      const payload = {
        cabangId: studentShiftFormData.cabangId ? Number(studentShiftFormData.cabangId) : null,
        hariKerjaOverride: studentShiftFormData.hariKerjaOverride || null,
        jamMasukOverride: studentShiftFormData.jamMasukOverride || null,
        jamPulangOverride: studentShiftFormData.jamPulangOverride || null
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/siswa/${editingStudentShift.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success("Pengaturan siswa berhasil diperbarui!", { id: toastId });
        setEditingStudentShift(null);
        fetchCompanyStudents(selectedPerusahaanForStudent!.id);
      } else {
        const err = await res.json();
        toast.error(err.message || "Gagal menyimpan", { id: toastId });
      }
    } catch (error) {
      toast.error("Kesalahan server", { id: toastId });
    }
  };

  const generatePDF = () => {
    try {
      const doc = new jsPDF('p', 'pt', 'a4');
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Daftar Perusahaan (DUDI) PKL', 40, 40);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('SMK Negeri 6 Jember', 40, 55);
      
      const tableData = perusahaans.map((p, index) => [
        index + 1,
        p.nama,
        p.alamatLengkap || p.alamat || (p.cabang && p.cabang[0]?.alamat) || '-',
        p.pimpinan || '-',
        p.pembimbing || '-',
        p.hp || p.email || '-'
      ]);

      autoTable(doc, {
        startY: 70,
        head: [['No', 'Nama Perusahaan', 'Alamat Lengkap', 'Pimpinan', 'Pembimbing', 'Kontak']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [14, 165, 233] },
        styles: { fontSize: 8 },
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

  const filteredPerusahaans = (Array.isArray(perusahaans) ? perusahaans : []).filter(p => 
    p?.nama?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p?.pimpinan?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p?.alamat?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p?.alamatLengkap?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredPerusahaans.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPerusahaans = filteredPerusahaans.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="text-smk-blue" size={28} />
            Data Perusahaan (DUDI)
          </h1>
          <p className="text-sm text-slate-500 mt-1">Kelola data industri tempat PKL siswa beserta akun loginnya.</p>
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
            className="bg-gradient-to-r from-smk-blue to-[#266f9f] hover:from-[#1a4f6e] hover:to-smk-blue text-white px-5 py-2.5 rounded-xl transition-all duration-300 shadow-lg shadow-smk-blue/30 flex items-center gap-2 font-medium group justify-center"
          >
            <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
            <span>Tambah DUDI</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
          <div className="relative w-full sm:w-72 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-smk-blue transition-colors" size={20} />
            <input
              type="text"
              placeholder="Cari perusahaan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-smk-blue/20 focus:border-smk-blue transition-all"
            />
          </div>
          <div className="text-sm text-slate-500 font-medium">
            Total: <span className="text-smk-orange font-bold bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100">{filteredPerusahaans.length}</span> DUDI
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-white border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-16">No</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Perusahaan</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Pimpinan / Pembimbing</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Kontak</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="w-8 h-8 border-4 border-smk-blue/20 border-t-smk-blue rounded-full animate-spin mx-auto"></div>
                  </td>
                </tr>
              ) : filteredPerusahaans.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">Tidak ada data perusahaan.</td>
                </tr>
              ) : (
                currentPerusahaans.map((dudi, index) => (
                  <tr key={dudi.id} className="group hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-500">{indexOfFirstItem + index + 1}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-smk-orange hover:ring-offset-2 transition-all"
                          onClick={() => setPreviewLogo(dudi.logo ? `${process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}`}${dudi.logo}` : "https://api.dicebear.com/7.x/initials/svg?seed=" + dudi.nama)}
                        >
                          {dudi.logo ? (
                            <img src={`${process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}`}${dudi.logo}`} alt={dudi.nama} className="w-full h-full object-cover" />
                          ) : (
                            <Building2 className="text-slate-400" size={24} />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900">{dudi.nama}</div>
                          <div className="text-xs text-slate-500 max-w-[200px] truncate">{dudi.alamat || '-'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-slate-900">{dudi.pimpinan || '-'}</div>
                      <div className="text-xs text-slate-500">Pmb: {dudi.pembimbing || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-700">{dudi.hp || '-'}</div>
                      <div className="text-xs text-slate-500">{dudi.email || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenStudentModal(dudi)}
                          className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-700 rounded-lg transition-colors border border-transparent hover:border-indigo-200"
                          title="Kelola Siswa & Shift"
                        >
                          <Users size={16} />
                        </button>
                        <button
                          onClick={() => handleOpenCabangModal(dudi)}
                          className="p-2 text-smk-blue bg-blue-50 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-colors border border-transparent hover:border-blue-200"
                          title="Kelola Cabang"
                        >
                          <Briefcase size={16} />
                        </button>
                        <button
                          onClick={() => handleOpenHolidayModal(dudi)}
                          className="p-2 text-purple-600 bg-purple-50 hover:bg-purple-100 hover:text-purple-700 rounded-lg transition-colors border border-transparent hover:border-purple-200"
                          title="Hari Libur Khusus"
                        >
                          <Calendar size={16} />
                        </button>
                        <button
                          onClick={() => handleOpenModal(dudi)}
                          className="p-2 text-smk-orange bg-orange-50 hover:bg-orange-100 hover:text-orange-700 rounded-lg transition-colors border border-transparent hover:border-orange-200"
                          title="Edit Perusahaan"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(dudi.id)}
                          className="p-2 text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors border border-transparent hover:border-red-200"
                          title="Hapus Perusahaan"
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
          <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/30">
            <span className="text-xs sm:text-sm text-slate-500 font-medium">
              Menampilkan <span className="font-bold text-slate-700">{indexOfFirstItem + 1}</span> - <span className="font-bold text-slate-700">{Math.min(indexOfLastItem, filteredPerusahaans.length)}</span> dari <span className="font-bold text-smk-orange">{filteredPerusahaans.length}</span> data
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

      {/* Modal Form Tambah/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl my-8 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="sticky top-0 z-10 px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-2xl">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <div className="p-2 bg-smk-blue/10 rounded-lg text-smk-blue">
                  {isEditing ? <Edit2 size={18} /> : <Plus size={18} />}
                </div>
                {isEditing ? "Edit Perusahaan" : "Tambah Perusahaan"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1">
              <div className="flex flex-col md:flex-row gap-8">
                {/* Kolom Kiri - Foto & Info Dasar */}
                <div className="w-full md:w-1/3 flex flex-col gap-6">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col items-center justify-center text-center">
                    <div className="w-32 h-32 rounded-xl bg-white border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden mb-3 relative group">
                      {logoPreview ? (
                        <img src={logoPreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Building2 className="text-slate-300" size={40} />
                      )}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Upload className="text-white" size={24} />
                      </div>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                        accept="image/*"
                        onChange={handleLogoChange}
                      />
                    </div>
                    <div className="text-sm font-medium text-slate-700">Logo Perusahaan</div>
                    <div className="text-xs text-slate-500 mt-1">Klik kotak di atas untuk mengunggah logo. (Maks 2MB)</div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nama Perusahaan *</label>
                      <input
                        type="text" required
                        value={formData.nama || ''}
                        onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-smk-blue/20 focus:border-smk-blue focus:bg-white transition-all"
                        placeholder="Cth: PT. Digital Nusantara"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email (Username Login) *</label>
                      <input
                        type="email" required
                        value={formData.email || ''}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-smk-blue/20 focus:border-smk-blue focus:bg-white transition-all"
                        placeholder="email@perusahaan.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password Login</label>
                      <input
                        type="text" 
                        value={formData.password || ''}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-smk-blue/20 focus:border-smk-blue focus:bg-white transition-all"
                        placeholder={isEditing ? "(Kosongkan jika tidak diubah)" : "Default: 1234"}
                      />
                    </div>
                  </div>
                </div>

                {/* Kolom Kanan - Data Lengkap */}
                <div className="w-full md:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nama Pimpinan</label>
                    <input
                      type="text"
                      value={formData.pimpinan || ''}
                      onChange={(e) => setFormData({ ...formData, pimpinan: e.target.value })}
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-smk-blue"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nama Pembimbing Industri</label>
                    <input
                      type="text"
                      value={formData.pembimbing || ''}
                      onChange={(e) => setFormData({ ...formData, pembimbing: e.target.value })}
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-smk-blue"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">No. HP / Telp</label>
                    <input
                      type="text"
                      value={formData.hp || ''}
                      onChange={(e) => setFormData({ ...formData, hp: e.target.value })}
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-smk-blue"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Hari Kerja / Operasional *</label>
                    <div className="grid grid-cols-3 gap-1.5 p-2 bg-slate-50 border rounded-lg">
                      {["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU", "MINGGU"].map(day => {
                        const activeList = formData.hariOpr ? formData.hariOpr.split(",") : [];
                        const isChecked = activeList.includes(day);
                        return (
                          <label key={day} className="flex items-center gap-1 cursor-pointer text-[10px] font-medium text-slate-700">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                let list = [...activeList];
                                if (isChecked) {
                                  list = list.filter(d => d !== day);
                                } else {
                                  list.push(day);
                                }
                                setFormData({ ...formData, hariOpr: list.join(",") });
                              }}
                              className="rounded border-slate-300 text-smk-blue focus:ring-smk-blue scale-90"
                            />
                            {day}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Jam Operasional</label>
                    <input
                      type="text"
                      value={formData.jamOpr || ''}
                      onChange={(e) => setFormData({ ...formData, jamOpr: e.target.value })}
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-smk-blue"
                      placeholder="Cth: 08:00 - 16:00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Jam Masuk (Absen)</label>
                    <input
                      type="time"
                      value={formData.jamMasuk || ''}
                      onChange={(e) => setFormData({ ...formData, jamMasuk: e.target.value })}
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-smk-blue"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Jam Pulang (Absen)</label>
                    <input
                      type="time"
                      value={formData.jamPulang || ''}
                      onChange={(e) => setFormData({ ...formData, jamPulang: e.target.value })}
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-smk-blue"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Kecamatan/Daerah DUDI *</label>
                    <select
                      required
                      value={formData.alamat || ''}
                      onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-smk-blue"
                    >
                      <option value="">-- Pilih Kecamatan/Daerah --</option>
                      {[
                        "Umbulsari", "Semboro", "Tanggul", "Sumberbaru", "Jombang", "Kencong", 
                        "Gumukmas", "Puger", "Balung", "Wuluhan", "Ambulu", "Rambipuji", 
                        "Panti", "Sukorambi", "Patrang", "Kaliwates", "Sumbersari", "Mumbulsari", 
                        "Tempurejo", "Silo", "Mayang", "Kalisat", "Ledokombo", "Sumberjambe", 
                        "Sukowono", "Jelbuk", "Arjasa", "Pakusari", "Ajung"
                      ].map(kec => (
                        <option key={kec} value={kec}>{kec}</option>
                      ))}
                      <option value="LAIN-LAIN">Luar Jember / Lain-Lain</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-sm font-semibold text-slate-700">Alamat Lengkap & Titik Lokasi Peta *</label>
                      <span className="text-[10px] text-slate-400 italic">(Dapat diketik manual atau pilih dari Peta/GPS)</span>
                    </div>
                    <textarea
                      rows={2}
                      required
                      value={formData.alamatLengkap || ''}
                      onChange={(e) => setFormData({ ...formData, alamatLengkap: e.target.value })}
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-smk-blue text-slate-800 font-medium"
                      placeholder="Ketik alamat lengkap atau gunakan tombol GPS/Peta di bawah..."
                    />
                    
                    <div className="flex gap-2 mt-2">
                      <button
                        type="button"
                        onClick={handlePerusahaanGetCurrentLocation}
                        className="flex-1 py-1.5 px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Navigation size={14} /> Ambil Lokasi Kantor Utama Saat Ini
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsPerusahaanMapOpen(true)}
                        className="flex-1 py-1.5 px-3 bg-smk-blue/10 hover:bg-smk-blue/20 text-smk-blue text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <MapPin size={14} /> Pilih di Peta
                      </button>
                    </div>
                  </div>


                </div>
              </div>

              <div className="sticky bottom-0 -mx-6 -mb-6 mt-6 px-6 py-4 bg-white border-t border-slate-100 flex justify-end gap-3 rounded-b-2xl">
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
                  {isEditing ? "Simpan Perubahan" : "Simpan Perusahaan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Map Picker untuk Perusahaan */}
      {isPerusahaanMapOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 relative">
             <MapPicker 
                onLocationSelect={(addr) => {
                  const coordRegex = /(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/;
                  const match = addr.match(coordRegex);
                  const latLngStr = match ? `${match[1]}, ${match[2]}` : "";
                  const cleanAddress = addr.split(" (Koordinat:")[0];
                  setFormData({
                    ...formData,
                    alamatLengkap: `${cleanAddress} (Koordinat: ${latLngStr})`
                  });
                  setIsPerusahaanMapOpen(false);
                }} 
                onClose={() => setIsPerusahaanMapOpen(false)} 
             />
          </div>
        </div>
      )}
      {isCabangMapOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 relative">
             <MapPicker 
                onLocationSelect={(addr) => {
                  const coordRegex = /(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/;
                  const match = addr.match(coordRegex);
                  const latLngStr = match ? `${match[1]}, ${match[2]}` : "";
                  const cleanAddress = addr.split(" (Koordinat:")[0];
                  setCabangFormData(prev => ({
                    ...prev,
                    alamat: `${cleanAddress} (Koordinat: ${latLngStr})`
                  }));
                  setIsCabangMapOpen(false);
                }} 
                onClose={() => setIsCabangMapOpen(false)} 
             />
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={deleteId !== null}
        title="Konfirmasi Hapus"
        message="Apakah Anda yakin ingin menghapus perusahaan ini? Menghapus data perusahaan akan menghapus akun login DUDI secara permanen."
        onConfirm={executeDelete}
        onCancel={() => setDeleteId(null)}
      />

      {/* Modal Preview Logo */}
      {previewLogo && (
        <div 
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm cursor-zoom-out"
          onClick={() => setPreviewLogo(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] flex items-center justify-center">
            <button 
              className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-all"
              onClick={(e) => { e.stopPropagation(); setPreviewLogo(null); }}
            >
              <X size={24} />
            </button>
            <img 
              src={previewLogo} 
              alt="Preview Logo" 
              className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain border-4 border-white/10 animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()} 
            />
          </div>
        </div>
      )}

      {/* Modal Kelola Cabang */}
      {isCabangModalOpen && selectedPerusahaanForCabang && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Briefcase className="text-smk-blue" size={20} />
                Kelola Cabang Perusahaan: {selectedPerusahaanForCabang.nama}
              </h2>
              <button
                onClick={() => { setIsCabangModalOpen(false); setIsCabangFormOpen(false); }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-6">
              {/* Kolom Kiri: Form Tambah/Edit Cabang */}
              {isCabangFormOpen ? (
                <form onSubmit={handleSaveCabang} className="w-full md:w-1/2 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                  <h3 className="text-sm font-bold text-slate-700">
                    {editingCabang ? "Edit Cabang" : "Tambah Cabang Baru"}
                  </h3>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Nama Cabang *</label>
                    <input
                      type="text" required
                      value={cabangFormData.namaCabang}
                      onChange={(e) => setCabangFormData({ ...cabangFormData, namaCabang: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-smk-blue"
                      placeholder="Cth: Cabang Bandung"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-600">Alamat Cabang *</label>
                      <span className="text-[10px] text-slate-400 italic">(Dapat diketik atau pilih dari Peta/GPS)</span>
                    </div>
                    <textarea
                      rows={2}
                      required
                      value={cabangFormData.alamat}
                      onChange={(e) => setCabangFormData({ ...cabangFormData, alamat: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-smk-blue text-slate-800 font-medium"
                      placeholder="Ketik alamat atau gunakan tombol GPS/Peta di bawah..."
                    />
                    
                    <div className="flex gap-2 mt-2">
                      <button
                        type="button"
                        onClick={handleCabangGetCurrentLocation}
                        className="flex-1 py-1.5 px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Navigation size={14} /> Ambil Lokasi Saat Ini
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsCabangMapOpen(true)}
                        className="flex-1 py-1.5 px-3 bg-smk-blue/10 hover:bg-smk-blue/20 text-smk-blue text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <MapPin size={14} /> Pilih di Peta
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-2">Hari Kerja</label>
                    <div className="grid grid-cols-3 gap-2">
                      {["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU", "MINGGU"].map(day => {
                        const activeList = cabangFormData.hariKerja.split(",");
                        const isChecked = activeList.includes(day);
                        return (
                          <label key={day} className="flex items-center gap-1.5 cursor-pointer text-xs">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                let list = [...activeList];
                                if (isChecked) {
                                  list = list.filter(d => d !== day);
                                } else {
                                  list.push(day);
                                }
                                setCabangFormData({ ...cabangFormData, hariKerja: list.join(",") });
                              }}
                              className="rounded border-slate-300 text-smk-blue focus:ring-smk-blue"
                            />
                            {day}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Jam Masuk</label>
                      <input
                        type="time"
                        value={cabangFormData.jamMasuk}
                        onChange={(e) => setCabangFormData({ ...cabangFormData, jamMasuk: e.target.value })}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-smk-blue"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Jam Pulang</label>
                      <input
                        type="time"
                        value={cabangFormData.jamPulang}
                        onChange={(e) => setCabangFormData({ ...cabangFormData, jamPulang: e.target.value })}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-smk-blue"
                      />
                    </div>
                  </div>





                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => { setIsCabangFormOpen(false); setEditingCabang(null); }}
                      className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-bold text-white bg-smk-blue hover:bg-blue-700 rounded-lg shadow-sm"
                    >
                      {editingCabang ? "Simpan Perubahan" : "Tambah Cabang"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="w-full md:w-1/3 flex flex-col justify-center items-center p-6 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 text-center">
                  <Building2 size={40} className="text-slate-400 mb-3" />
                  <p className="text-sm font-medium text-slate-600 mb-4">Punya kantor cabang atau wilayah kerja lain?</p>
                  <button
                    onClick={() => {
                      setEditingCabang(null);
                      setCabangFormData({
                        namaCabang: "",
                        alamat: "",
                        hariKerja: "SENIN,SELASA,RABU,KAMIS,JUMAT",
                        jamMasuk: "07:30",
                        jamPulang: "16:00",
                        batasTerlambat: 15,
                      });
                      setIsCabangFormOpen(true);
                    }}
                    className="px-4 py-2 text-xs font-bold text-white bg-smk-blue hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-1"
                  >
                    <Plus size={14} />
                    Tambah Cabang Baru
                  </button>
                </div>
              )}

              {/* Kolom Kanan: Daftar Cabang Aktif */}
              <div className="flex-1 space-y-3">
                <h3 className="text-sm font-bold text-slate-700">Daftar Cabang</h3>
                {cabangs.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-sm">Belum ada cabang terdaftar.</div>
                ) : (
                  <div className="space-y-3">
                    {cabangs.map(cabang => (
                      <div key={cabang.id} className="p-4 bg-white border border-slate-200 rounded-xl hover:shadow-sm transition-shadow flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-slate-800">{cabang.namaCabang}</h4>
                          <p className="text-xs text-slate-500">{cabang.alamat || '-'}</p>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
                            <span className="flex items-center gap-1"><Clock size={12} /> {cabang.jamMasuk} - {cabang.jamPulang}</span>
                            <span className="flex items-center gap-1 font-semibold text-smk-orange">{cabang.hariKerja}</span>
                          </div>
                          {(() => {
                            const match = (cabang.alamat || "").match(/(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/);
                            return match ? (
                              <div className="text-[10px] text-slate-400 font-mono select-all">Loc: {match[1]}, {match[2]}</div>
                            ) : null;
                          })()}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingCabang(cabang);
                              setCabangFormData({
                                namaCabang: cabang.namaCabang,
                                alamat: cabang.alamat || "",
                                hariKerja: cabang.hariKerja || "SENIN,SELASA,RABU,KAMIS,JUMAT",
                                jamMasuk: cabang.jamMasuk || "07:30",
                                jamPulang: cabang.jamPulang || "16:00",
                                batasTerlambat: cabang.batasTerlambat || 15,
                              });
                              setIsCabangFormOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteCabang(cabang.id)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Kelola Hari Libur */}
      {isHolidayModalOpen && selectedPerusahaanForHoliday && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="text-purple-600" size={20} />
                Kelola Hari Libur Khusus: {selectedPerusahaanForHoliday.nama}
              </h2>
              <button
                onClick={() => setIsHolidayModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-6">
              {/* Form Tambah Hari Libur */}
              <form onSubmit={handleSaveHoliday} className="w-full md:w-1/2 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4 h-fit">
                <h3 className="text-sm font-bold text-slate-700">Daftarkan Tanggal Libur Baru</h3>
                
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Tanggal *</label>
                  <input
                    type="date" required
                    value={holidayFormData.tanggal}
                    onChange={(e) => setHolidayFormData({ ...holidayFormData, tanggal: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-smk-blue"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Keterangan / Alasan Libur *</label>
                  <input
                    type="text" required
                    value={holidayFormData.keterangan}
                    onChange={(e) => setHolidayFormData({ ...holidayFormData, keterangan: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-smk-blue"
                    placeholder="Cth: Cuti Bersama Perusahaan, Libur Pilkada"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Lingkup Libur (Cabang)</label>
                  <select
                    value={holidayFormData.cabangId}
                    onChange={(e) => setHolidayFormData({ ...holidayFormData, cabangId: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-smk-blue"
                  >
                    <option value="">Semua Cabang (Seluruh Perusahaan)</option>
                    {cabangs.map(c => (
                      <option key={c.id} value={c.id}>{c.namaCabang}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm"
                >
                  Simpan Hari Libur
                </button>
              </form>

              {/* Daftar Hari Libur Terdaftar */}
              <div className="flex-1 space-y-3">
                <h3 className="text-sm font-bold text-slate-700">Hari Libur Khusus Terdaftar</h3>
                {holidays.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-sm">Tidak ada hari libur khusus terdaftar.</div>
                ) : (
                  <div className="space-y-3">
                    {holidays.map(h => {
                      const formattedDate = new Date(h.tanggal).toLocaleDateString("id-ID", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      });
                      return (
                        <div key={h.id} className="p-3 bg-white border border-slate-200 rounded-xl flex justify-between items-center gap-4">
                          <div>
                            <div className="text-sm font-bold text-slate-800">{h.keterangan}</div>
                            <div className="text-xs text-slate-500">{formattedDate}</div>
                            {h.cabang && (
                              <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-bold text-purple-600 bg-purple-50 rounded border border-purple-100">
                                Khusus: {h.cabang.namaCabang}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteHoliday(h.id)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal Kelola Siswa & Shift */}
      {isStudentModalOpen && selectedPerusahaanForStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Users className="text-indigo-600" size={20} />
                Kelola Siswa & Shift Magang: {selectedPerusahaanForStudent.nama}
              </h2>
              <button
                onClick={() => { setIsStudentModalOpen(false); setEditingStudentShift(null); }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col lg:flex-row gap-6">
              {/* Kolom Kiri: Daftar Siswa Terplot */}
              <div className="flex-1 space-y-4">
                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                  <Users size={16} className="text-slate-400" />
                  Siswa yang ditempatkan di DUDI ini
                </h3>
                
                {companyStudents.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-sm bg-slate-50 rounded-xl border border-dashed">
                    Belum ada siswa yang ditempatkan di perusahaan ini.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {companyStudents.map(siswa => {
                      return (
                        <div key={siswa.id} className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${editingStudentShift?.id === siswa.id ? 'border-indigo-500 bg-indigo-50/20 shadow-md' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                          <div>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold border shrink-0">
                                {siswa.namaLengkap.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-sm font-bold text-slate-800 truncate">{siswa.namaLengkap}</h4>
                                <p className="text-xs text-slate-500">{siswa.nisn} | Kelas {siswa.kelas}</p>
                              </div>
                            </div>

                            <div className="mt-3 space-y-1.5 text-xs text-slate-600 border-t pt-2.5">
                              <div>
                                <span className="font-semibold">Cabang:</span>{" "}
                                <span className="px-2 py-0.5 rounded bg-blue-50 text-smk-blue border border-blue-100 font-medium">
                                  {siswa.cabang?.namaCabang || "Cabang Utama / Default"}
                                </span>
                              </div>
                              <div>
                                <span className="font-semibold">Hari Kerja:</span>{" "}
                                <span>{siswa.hariKerjaOverride ? `${siswa.hariKerjaOverride} (Khusus)` : "Mengikuti Default Cabang"}</span>
                              </div>
                              <div>
                                <span className="font-semibold">Jam Kerja:</span>{" "}
                                <span>
                                  {siswa.jamMasukOverride || siswa.jamPulangOverride 
                                    ? `${siswa.jamMasukOverride || '-'} s.d ${siswa.jamPulangOverride || '-'} (Khusus)` 
                                    : "Mengikuti Default Cabang"}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 flex justify-end">
                            <button
                              onClick={() => {
                                setEditingStudentShift(siswa);
                                setStudentShiftFormData({
                                  cabangId: siswa.cabangId?.toString() || "",
                                  hariKerjaOverride: siswa.hariKerjaOverride || "",
                                  jamMasukOverride: siswa.jamMasukOverride || "",
                                  jamPulangOverride: siswa.jamPulangOverride || ""
                                });
                              }}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1"
                            >
                              <Edit2 size={12} />
                              Atur Shift & Cabang
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Kolom Kanan: Form Edit Shift */}
              {editingStudentShift && (
                <div className="w-full lg:w-96 bg-slate-50 p-5 rounded-2xl border border-slate-200 h-fit space-y-4 animate-in slide-in-from-right-4 duration-300">
                  <div className="flex justify-between items-center border-b pb-2">
                    <h3 className="text-sm font-bold text-slate-800">
                      Atur Shift: {editingStudentShift.namaLengkap}
                    </h3>
                    <button
                      onClick={() => setEditingStudentShift(null)}
                      className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      Batal
                    </button>
                  </div>

                  <form onSubmit={handleSaveStudentShift} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Pilih Lokasi Kerja (Cabang)</label>
                      <select
                        value={studentShiftFormData.cabangId}
                        onChange={(e) => setStudentShiftFormData({ ...studentShiftFormData, cabangId: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-smk-blue"
                      >
                        <option value="">-- Ikuti Cabang Utama / Default --</option>
                        {((editingStudentShift.perusahaan as any)?.cabang || []).map((c: any) => (
                          <option key={c.id} value={c.id}>{c.namaCabang} ({c.alamat || 'Tanpa Alamat'})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-2">Hari Kerja Khusus (Override)</label>
                      <div className="grid grid-cols-3 gap-2 bg-white p-2.5 rounded-lg border border-slate-100">
                        {["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU", "MINGGU"].map(day => {
                          const activeList = studentShiftFormData.hariKerjaOverride ? studentShiftFormData.hariKerjaOverride.split(",") : [];
                          const isChecked = activeList.includes(day);
                          return (
                            <label key={day} className="flex items-center gap-1 cursor-pointer text-[10px] font-medium text-slate-700">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  let list = [...activeList];
                                  if (isChecked) {
                                    list = list.filter(d => d !== day);
                                  } else {
                                    list.push(day);
                                  }
                                  setStudentShiftFormData({ ...studentShiftFormData, hariKerjaOverride: list.join(",") });
                                }}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 scale-90"
                              />
                              {day}
                            </label>
                          );
                        })}
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 block">Biarkan kosong jika mengikuti jadwal default cabang.</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Jam Masuk</label>
                        <input
                          type="time"
                          value={studentShiftFormData.jamMasukOverride}
                          onChange={(e) => setStudentShiftFormData({ ...studentShiftFormData, jamMasukOverride: e.target.value })}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Jam Pulang</label>
                        <input
                          type="time"
                          value={studentShiftFormData.jamPulangOverride}
                          onChange={(e) => setStudentShiftFormData({ ...studentShiftFormData, jamPulangOverride: e.target.value })}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                    >
                      Simpan Shift & Cabang
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
