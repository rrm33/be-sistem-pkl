"use client";

import React, { useState, useEffect } from "react";
import Cookies from "js-cookie";
import Swal from "sweetalert2";
import { toast } from "sonner";
import { 
  Search, 
  BookOpen, 
  Building2, 
  Calendar, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  Eye, 
  MessageSquare 
} from "lucide-react";

interface JurnalHarian {
  id: number;
  siswaId: number;
  perusahaanId: number | null;
  tanggal: string;
  kegiatan: string;
  fotoKegiatan: string | null;
  status: "PENDING" | "DISETUJUI" | "DITOLAK";
  feedback: string | null;
  processedAt: string | null;
  processedById: number | null;
  processedByName: string | null;
  processedByRole: string | null;
  createdAt: string;
  updatedAt: string;
  siswa: {
    namaLengkap: string;
    nisn: string;
    kelas: string | null;
  };
  perusahaan: {
    nama: string;
  } | null;
}

export default function JurnalAdminPage() {
  const [jurnals, setJurnals] = useState<JurnalHarian[]>([]);
  const [kelasList, setKelasList] = useState<{ id: number; nama: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [kelasFilter, setKelasFilter] = useState("ALL");
  
  // Selected journal for modal
  const [selectedJurnal, setSelectedJurnal] = useState<JurnalHarian | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionStatus, setActionStatus] = useState<"DISETUJUI" | "DITOLAK">("DISETUJUI");
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Operator info from cookie
  const [operatorId, setOperatorId] = useState<number | null>(null);
  const [operatorName, setOperatorName] = useState("Admin");
  const [operatorRole, setOperatorRole] = useState("ADMIN");

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  useEffect(() => {
    // Read operator from cookies
    const name = Cookies.get("userName");
    const role = Cookies.get("userRole");
    if (name) setOperatorName(name);
    if (role) setOperatorRole(role);

    const token = Cookies.get("token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (payload.sub) setOperatorId(Number(payload.sub));
      } catch (e) {}
    }

    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [resJurnal, resKelas] = await Promise.all([
        fetch(`${API_URL}/jurnal`),
        fetch(`${API_URL}/kelas`)
      ]);

      if (!resJurnal.ok) throw new Error("Gagal mengambil data jurnal");
      if (!resKelas.ok) throw new Error("Gagal mengambil data kelas");

      const dataJurnal = await resJurnal.json();
      const dataKelas = await resKelas.json();

      setJurnals(dataJurnal);
      setKelasList(dataKelas);
    } catch (error: any) {
      toast.error(error.message || "Gagal mengambil data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDetail = (jurnal: JurnalHarian) => {
    setSelectedJurnal(jurnal);
    setActionStatus(jurnal.status === "PENDING" ? "DISETUJUI" : jurnal.status);
    setFeedback(jurnal.feedback || "");
    setIsModalOpen(true);
  };

  const handleSaveStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJurnal) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/jurnal/${selectedJurnal.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: actionStatus,
          feedback: actionStatus === "DITOLAK" ? feedback : "",
          operatorId,
          operatorName,
          operatorRole,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || "Gagal memperbarui status jurnal");
      }

      Swal.fire({
        title: "Berhasil!",
        text: `Jurnal berhasil ${actionStatus === "DISETUJUI" ? "disetujui" : "ditolak"}.`,
        icon: "success",
        confirmButtonColor: "#1C587A",
      });

      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      Swal.fire({
        title: "Gagal!",
        text: error.message || "Terjadi kesalahan saat memproses status jurnal.",
        icon: "error",
        confirmButtonColor: "#1C587A",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: "PENDING" | "DISETUJUI" | "DITOLAK") => {
    switch (status) {
      case "DISETUJUI":
        return (
          <span className="px-2.5 py-1 text-xs font-bold bg-green-50 text-green-700 border border-green-200 rounded-full flex items-center gap-1 w-fit">
            <CheckCircle size={12} /> DISETUJUI
          </span>
        );
      case "DITOLAK":
        return (
          <span className="px-2.5 py-1 text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 rounded-full flex items-center gap-1 w-fit">
            <XCircle size={12} /> DITOLAK
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded-full flex items-center gap-1 w-fit">
            <AlertCircle size={12} /> PENDING
          </span>
        );
    }
  };

  const formatTanggal = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  // Filtering
  const filteredJurnals = jurnals.filter((j) => {
    const matchesSearch = 
      j.siswa.namaLengkap.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.siswa.nisn.includes(searchQuery) ||
      j.kegiatan.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (j.perusahaan && j.perusahaan.nama.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === "ALL" || j.status === statusFilter;
    const matchesKelas = kelasFilter === "ALL" || j.siswa.kelas === kelasFilter;

    return matchesSearch && matchesStatus && matchesKelas;
  });

  // Stats calculation
  const stats = {
    total: jurnals.length,
    pending: jurnals.filter((j) => j.status === "PENDING").length,
    disetujui: jurnals.filter((j) => j.status === "DISETUJUI").length,
    ditolak: jurnals.filter((j) => j.status === "DITOLAK").length,
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-smk-blue flex items-center gap-2">
            <BookOpen className="text-smk-orange" />
            Verifikasi Jurnal Harian Siswa
          </h1>
          <p className="text-slate-500 text-sm">
            Tinjau laporan jurnal aktivitas harian siswa PKL dari instansi dudi masing-masing.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-100 text-slate-700 rounded-lg flex items-center justify-center font-bold">
            {stats.total}
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase">Total Laporan</div>
            <div className="text-lg font-bold text-slate-700">Semua Jurnal</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-700 rounded-lg flex items-center justify-center font-bold border border-amber-100">
            {stats.pending}
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase">Belum Diperiksa</div>
            <div className="text-lg font-bold text-amber-700">Pending</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-green-50 text-green-700 rounded-lg flex items-center justify-center font-bold border border-green-100">
            {stats.disetujui}
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase">Telah Disetujui</div>
            <div className="text-lg font-bold text-green-700">Disetujui</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-50 text-rose-700 rounded-lg flex items-center justify-center font-bold border border-rose-100">
            {stats.ditolak}
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase">Telah Ditolak</div>
            <div className="text-lg font-bold text-rose-700">Ditolak</div>
          </div>
        </div>
      </div>

      {/* Filter controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
            <Search size={18} />
          </span>
          <input
            type="text"
            placeholder="Cari nama, NISN, kegiatan, DUDI..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-smk-blue text-sm text-slate-800"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto flex-wrap md:flex-nowrap">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs text-slate-500 font-bold whitespace-nowrap">Filter Kelas:</span>
            <select
              className="w-full md:w-40 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-smk-blue text-sm bg-white text-slate-800"
              value={kelasFilter}
              onChange={(e) => setKelasFilter(e.target.value)}
            >
              <option value="ALL">Semua Kelas</option>
              {kelasList.map((k) => (
                <option key={k.id} value={k.nama}>
                  {k.nama}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs text-slate-500 font-bold whitespace-nowrap">Filter Status:</span>
            <select
              className="w-full md:w-40 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-smk-blue text-sm bg-white text-slate-800"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Semua Status</option>
              <option value="PENDING">Pending</option>
              <option value="DISETUJUI">Disetujui</option>
              <option value="DITOLAK">Ditolak</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-10 h-10 text-smk-blue animate-spin" />
            <p className="text-slate-500 text-sm font-semibold">Memuat jurnal...</p>
          </div>
        ) : filteredJurnals.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-400 font-medium">Tidak ada laporan jurnal yang ditemukan.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-slate-400 font-bold text-xs uppercase border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-semibold text-center w-16">No</th>
                  <th className="px-6 py-4 font-semibold w-52">Tanggal</th>
                  <th className="px-6 py-4 font-semibold">Nama Siswa / NISN</th>
                  <th className="px-6 py-4 font-semibold">Kelas</th>
                  <th className="px-6 py-4 font-semibold">Instansi PKL</th>
                  <th className="px-6 py-4 font-semibold w-72">Aktivitas / Kegiatan</th>
                  <th className="px-6 py-4 font-semibold text-center">Foto</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredJurnals.map((jurnal, idx) => (
                  <tr key={jurnal.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4.5 text-center text-slate-400 font-medium">{idx + 1}</td>
                    <td className="px-6 py-4.5 font-semibold text-slate-700">{formatTanggal(jurnal.tanggal)}</td>
                    <td className="px-6 py-4.5">
                      <div className="font-bold text-slate-800 leading-tight">{jurnal.siswa.namaLengkap}</div>
                      <div className="text-xs text-slate-400 mt-1 font-mono">{jurnal.siswa.nisn}</div>
                    </td>
                    <td className="px-6 py-4.5 font-medium text-slate-600">{jurnal.siswa.kelas || "-"}</td>
                    <td className="px-6 py-4.5">
                      {jurnal.perusahaan ? (
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Building2 size={14} className="text-slate-400 shrink-0" />
                          <span className="font-semibold">{jurnal.perusahaan.nama}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Tanpa DUDI</span>
                      )}
                    </td>
                    <td className="px-6 py-4.5">
                      <p className="text-slate-600 line-clamp-2 break-all text-xs" title={jurnal.kegiatan}>
                        {jurnal.kegiatan}
                      </p>
                    </td>
                    <td className="px-6 py-4.5 text-center">
                      {jurnal.fotoKegiatan ? (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full border border-blue-200">
                          Ada Foto
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-xs">Tanpa Foto</span>
                      )}
                    </td>
                    <td className="px-6 py-4.5">{getStatusBadge(jurnal.status)}</td>
                    <td className="px-6 py-4.5 text-center">
                      <button
                        onClick={() => handleOpenDetail(jurnal)}
                        className="px-3.5 py-1.5 bg-smk-blue text-white font-bold rounded-lg hover:bg-smk-blue/90 transition-all text-xs shadow-sm flex items-center gap-1 mx-auto"
                      >
                        <Eye size={13} />
                        Periksa Jurnal
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail and Action Modal */}
      {isModalOpen && selectedJurnal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-2xl border border-slate-200 shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-slate-100 flex justify-between items-center bg-smk-blue text-white rounded-t-2xl">
              <div>
                <h3 className="font-bold text-lg">Pemeriksaan Jurnal PKL</h3>
                <p className="text-xs text-blue-100 mt-0.5">Siswa: {selectedJurnal.siswa.namaLengkap}</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/80 hover:text-white transition-colors p-1"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              
              {/* Student info card */}
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block font-semibold uppercase">NISN / Kelas</span>
                  <span className="font-bold text-slate-700">{selectedJurnal.siswa.nisn} / {selectedJurnal.siswa.kelas || "-"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold uppercase">Instansi PKL</span>
                  <span className="font-bold text-slate-700 flex items-center gap-1">
                    <Building2 size={11} className="text-slate-400 shrink-0" />
                    {selectedJurnal.perusahaan?.nama || "-"}
                  </span>
                </div>
                <div className="col-span-2 border-t border-slate-200/60 pt-2.5">
                  <span className="text-slate-400 block font-semibold uppercase">Tanggal Laporan</span>
                  <span className="font-bold text-slate-700 flex items-center gap-1 mt-0.5">
                    <Calendar size={12} className="text-smk-orange" />
                    {formatTanggal(selectedJurnal.tanggal)}
                  </span>
                </div>
              </div>

              {/* Kegiatan */}
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase">Deskripsi Kegiatan / Pekerjaan</span>
                <div className="bg-white border border-slate-200 p-3.5 rounded-xl text-slate-700 text-sm font-medium leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap break-all">
                  {selectedJurnal.kegiatan}
                </div>
              </div>

              {/* Photo */}
              {selectedJurnal.fotoKegiatan && (
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Lampiran Foto Kegiatan</span>
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-slate-50 flex items-center justify-center max-h-64">
                    <img
                      src={`${API_URL}/uploads/absensi/${selectedJurnal.fotoKegiatan}`}
                      alt="Foto Kegiatan Siswa"
                      className="w-full h-full object-contain max-h-64"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder-image.jpg"; // Fallback placeholder
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Audit trace if already processed */}
              {selectedJurnal.status !== "PENDING" && (
                <div className="bg-slate-100/50 border border-slate-200 rounded-xl p-3.5 text-xs space-y-1 text-slate-600">
                  <span className="font-bold text-slate-700 block">Riwayat Pemeriksaan</span>
                  <div>Status: {getStatusBadge(selectedJurnal.status)}</div>
                  <div>Diperiksa pada: {selectedJurnal.processedAt ? new Date(selectedJurnal.processedAt).toLocaleString("id-ID") : "-"}</div>
                  <div>Pemeriksa: <strong>{selectedJurnal.processedByName}</strong> ({selectedJurnal.processedByRole})</div>
                  {selectedJurnal.feedback && (
                    <div className="mt-1 border-t border-slate-200 pt-1.5 italic text-slate-700 font-medium">
                      Feedback: "{selectedJurnal.feedback}"
                    </div>
                  )}
                </div>
              )}

              {/* Action Form */}
              <form onSubmit={handleSaveStatus} className="border-t border-slate-100 pt-4 space-y-4">
                <span className="text-sm font-bold text-slate-800 block">Form Verifikasi Jurnal</span>
                
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1.5">Tindakan</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="status"
                        value="DISETUJUI"
                        checked={actionStatus === "DISETUJUI"}
                        onChange={() => setActionStatus("DISETUJUI")}
                        className="w-4.5 h-4.5 text-smk-blue border-slate-350 focus:ring-smk-blue"
                      />
                      Setujui Jurnal
                    </label>
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="status"
                        value="DITOLAK"
                        checked={actionStatus === "DITOLAK"}
                        onChange={() => setActionStatus("DITOLAK")}
                        className="w-4.5 h-4.5 text-smk-blue border-slate-350 focus:ring-smk-blue"
                      />
                      Tolak / Butuh Revisi
                    </label>
                  </div>
                </div>

                {actionStatus === "DITOLAK" && (
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">
                      Catatan / Feedback Alasan Penolakan <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      required
                      placeholder="Contoh: Deskripsi kegiatan terlalu singkat, atau foto tidak sesuai..."
                      className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:border-smk-blue text-sm text-slate-800 h-20 resize-none"
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                    />
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-50 transition-colors text-sm"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-smk-blue hover:bg-smk-blue/90 text-white font-bold rounded-lg transition-colors text-sm flex items-center gap-1.5 shadow"
                  >
                    {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                    Simpan Keputusan
                  </button>
                </div>
              </form>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
