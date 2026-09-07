"use client";

import React, { useState, useEffect } from "react";
import Cookies from "js-cookie";
import Swal from "sweetalert2";
import { toast } from "sonner";
import { 
  Search, 
  Camera, 
  Building2, 
  Calendar, 
  Loader2, 
  Plus, 
  Eye, 
  Trash2, 
  FileText, 
  CheckCircle2 
} from "lucide-react";

interface Monitoring {
  id: number;
  guruId: number;
  perusahaanId: number;
  tanggal: string;
  tipe: "PENGANTARAN" | "MONITORING_1" | "MONITORING_2" | "PENJEMPUTAN";
  fotoKegiatan: string | null;
  keterangan: string | null;
  createdAt: string;
  updatedAt: string;
  guru: {
    namaLengkap: string;
    nip: string;
  };
  perusahaan: {
    nama: string;
    alamat: string | null;
  };
}

const TIPE_LABELS = {
  PENGANTARAN: "Pelepasan & Pengantaran Siswa",
  MONITORING_1: "Monitoring Tahap I",
  MONITORING_2: "Monitoring Tahap II",
  PENJEMPUTAN: "Penjemputan & Penarikan Siswa",
};

export default function MonitoringPage() {
  const [monitorings, setMonitorings] = useState<Monitoring[]>([]);
  const [perusahaans, setPerusahaans] = useState<{ id: number; nama: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // User identity from cookie
  const [userRole, setUserRole] = useState("PEMBIMBING");
  const [userId, setUserId] = useState<number | null>(null);
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedMonitoring, setSelectedMonitoring] = useState<Monitoring | null>(null);

  // Form states
  const [perusahaanId, setPerusahaanId] = useState("");
  const [tipe, setTipe] = useState<"PENGANTARAN" | "MONITORING_1" | "MONITORING_2" | "PENJEMPUTAN">("PENGANTARAN");
  const [tanggal, setTanggal] = useState(new Date().toISOString().split("T")[0]);
  const [keterangan, setKeterangan] = useState("");
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  useEffect(() => {
    const role = Cookies.get("userRole") || "PEMBIMBING";
    setUserRole(role);

    const token = Cookies.get("token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (payload.sub) {
          const idVal = Number(payload.sub);
          setUserId(idVal);
          fetchData(idVal, role);
        }
      } catch (e) {
        fetchData(null, role);
      }
    } else {
      fetchData(null, role);
    }
  }, []);

  const fetchData = async (uId: number | null, role: string) => {
    setIsLoading(true);
    try {
      const uParam = uId ? `userId=${uId}` : "";
      const rParam = role ? `role=${role}` : "";
      const queryStr = [uParam, rParam].filter(Boolean).join("&");

      const [resMonitoring, resPerusahaan] = await Promise.all([
        fetch(`${API_URL}/monitoring?${queryStr}`),
        fetch(`${API_URL}/monitoring/perusahaan?${queryStr}`),
      ]);

      if (!resMonitoring.ok) throw new Error("Gagal mengambil data monitoring");
      if (!resPerusahaan.ok) throw new Error("Gagal mengambil daftar instansi PKL");

      const dataMon = await resMonitoring.json();
      const dataPerusahaan = await resPerusahaan.json();

      setMonitorings(dataMon);
      setPerusahaans(dataPerusahaan);
    } catch (error: any) {
      toast.error(error.message || "Gagal memuat data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setPerusahaanId(perusahaans[0]?.id?.toString() || "");
    setTipe("PENGANTARAN");
    setTanggal(new Date().toISOString().split("T")[0]);
    setKeterangan("");
    setFotoFile(null);
    setIsAddModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFotoFile(e.target.files[0]);
    }
  };

  const handleSaveMonitoring = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      toast.error("User ID tidak valid, silakan login kembali");
      return;
    }
    if (!perusahaanId) {
      toast.error("Pilih instansi PKL terlebih dahulu");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("userId", userId.toString());
      formData.append("role", userRole);
      formData.append("perusahaanId", perusahaanId);
      formData.append("tipe", tipe);
      formData.append("tanggal", new Date(tanggal).toISOString());
      formData.append("keterangan", keterangan);
      if (fotoFile) {
        formData.append("foto", fotoFile);
      }

      const res = await fetch(`${API_URL}/monitoring`, {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Gagal menyimpan monitoring");

      Swal.fire({
        title: "Berhasil!",
        text: "Data monitoring kunjungan guru berhasil direkam.",
        icon: "success",
        confirmButtonColor: "#1C587A",
      });

      setIsAddModalOpen(false);
      fetchData(userId, userRole);
    } catch (error: any) {
      Swal.fire({
        title: "Gagal!",
        text: error.message || "Terjadi kesalahan saat memproses.",
        icon: "error",
        confirmButtonColor: "#1C587A",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!userId) return;

    Swal.fire({
      title: "Apakah Anda yakin?",
      text: "Data kunjungan monitoring ini akan dihapus secara permanen beserta lampirannya.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await fetch(`${API_URL}/monitoring/${id}?userId=${userId}&role=${userRole}`, {
            method: "DELETE",
          });

          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.message || "Gagal menghapus data");
          }

          toast.success("Data monitoring berhasil dihapus");
          fetchData(userId, userRole);
        } catch (error: any) {
          Swal.fire("Gagal!", error.message || "Gagal menghapus data.", "error");
        }
      }
    });
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

  // Filter
  const filteredMonitorings = monitorings.filter((m) => {
    const query = searchQuery.toLowerCase();
    return (
      m.guru.namaLengkap.toLowerCase().includes(query) ||
      m.perusahaan.nama.toLowerCase().includes(query) ||
      (m.keterangan && m.keterangan.toLowerCase().includes(query)) ||
      TIPE_LABELS[m.tipe].toLowerCase().includes(query)
    );
  });

  // Calculate statistics
  const stats = {
    total: monitorings.length,
    pengantaran: monitorings.filter((m) => m.tipe === "PENGANTARAN").length,
    monitoring1: monitorings.filter((m) => m.tipe === "MONITORING_1").length,
    monitoring2: monitorings.filter((m) => m.tipe === "MONITORING_2").length,
    penjemputan: monitorings.filter((m) => m.tipe === "PENJEMPUTAN").length,
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-smk-blue flex items-center gap-2">
            <Camera className="text-smk-orange" />
            Monitoring PKL oleh Guru Pembimbing
          </h1>
          <p className="text-slate-500 text-sm">
            {userRole === "PEMBIMBING" 
              ? "Catat dan kelola laporan kunjungan pendampingan siswa bimbingan Anda di instansi DUDI."
              : "Pantau seluruh rekap kunjungan monitoring DUDI yang dilakukan oleh guru pembimbing."}
          </p>
        </div>
        {userRole === "PEMBIMBING" && (
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-smk-blue text-white font-bold rounded-lg hover:bg-smk-blue/90 shadow transition-all flex items-center gap-2 text-sm"
          >
            <Plus size={16} />
            Tambah Kunjungan
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-100 text-slate-700 rounded-lg flex items-center justify-center font-bold text-sm">
            {stats.total}
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase">Total Kegiatan</div>
            <div className="text-sm font-bold text-slate-700">Semua</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg flex items-center justify-center font-bold text-sm">
            {stats.pengantaran}
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase">Pengantaran</div>
            <div className="text-sm font-bold text-slate-700">Pelepasan</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-50 text-amber-700 border border-amber-100 rounded-lg flex items-center justify-center font-bold text-sm">
            {stats.monitoring1}
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase">Monitoring I</div>
            <div className="text-sm font-bold text-slate-700">Tahap I</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg flex items-center justify-center font-bold text-sm">
            {stats.monitoring2}
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase">Monitoring II</div>
            <div className="text-sm font-bold text-slate-700">Tahap II</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 bg-green-50 text-green-700 border border-green-100 rounded-lg flex items-center justify-center font-bold text-sm">
            {stats.penjemputan}
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase">Penjemputan</div>
            <div className="text-sm font-bold text-slate-700">Penarikan</div>
          </div>
        </div>
      </div>

      {/* Filter Control */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex items-center justify-between">
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
            <Search size={18} />
          </span>
          <input
            type="text"
            placeholder="Cari instansi, nama guru, jenis kegiatan..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-smk-blue text-sm text-slate-800"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-10 h-10 text-smk-blue animate-spin" />
            <p className="text-slate-500 text-sm font-semibold">Memuat laporan monitoring...</p>
          </div>
        ) : filteredMonitorings.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-400 font-medium">Belum ada kunjungan monitoring yang dicatat.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-slate-400 font-bold text-xs uppercase border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-semibold text-center w-16">No</th>
                  <th className="px-6 py-4 font-semibold">Tanggal</th>
                  <th className="px-6 py-4 font-semibold">Instansi PKL (DUDI)</th>
                  <th className="px-6 py-4 font-semibold">Nama Guru Pembimbing</th>
                  <th className="px-6 py-4 font-semibold">Tahap Kunjungan</th>
                  <th className="px-6 py-4 font-semibold text-center">Dokumentasi</th>
                  <th className="px-6 py-4 font-semibold text-center w-36">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMonitorings.map((mon, idx) => (
                  <tr key={mon.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4.5 text-center text-slate-400 font-medium">{idx + 1}</td>
                    <td className="px-6 py-4.5 font-semibold text-slate-700">{formatTanggal(mon.tanggal)}</td>
                    <td className="px-6 py-4.5">
                      <div className="font-bold text-slate-800">{mon.perusahaan.nama}</div>
                      <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">{mon.perusahaan.alamat || "-"}</div>
                    </td>
                    <td className="px-6 py-4.5">
                      <div className="font-semibold text-slate-800">{mon.guru.namaLengkap}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">NIP: {mon.guru.nip}</div>
                    </td>
                    <td className="px-6 py-4.5">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${
                        mon.tipe === "PENGANTARAN" ? "bg-indigo-50 text-indigo-700 border-indigo-200" :
                        mon.tipe === "MONITORING_1" ? "bg-amber-50 text-amber-700 border-amber-200" :
                        mon.tipe === "MONITORING_2" ? "bg-blue-50 text-blue-700 border-blue-200" :
                        "bg-green-50 text-green-700 border-green-200"
                      }`}>
                        {TIPE_LABELS[mon.tipe]}
                      </span>
                    </td>
                    <td className="px-6 py-4.5 text-center">
                      {mon.fotoKegiatan ? (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full border border-blue-200">
                          Ada Foto
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-xs">Tanpa Foto</span>
                      )}
                    </td>
                    <td className="px-6 py-4.5">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setSelectedMonitoring(mon)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded transition-colors"
                          title="Lihat Detail"
                        >
                          <Eye size={14} />
                        </button>
                        {(userRole === "ADMIN" || (userRole === "PEMBIMBING" && mon.guru.namaLengkap === Cookies.get("userName"))) && (
                          <button
                            onClick={() => handleDelete(mon.id)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded transition-colors"
                            title="Hapus"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-2xl flex flex-col">
            
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-smk-blue text-white rounded-t-2xl">
              <h3 className="font-bold text-lg">Catat Kunjungan Monitoring</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-white hover:text-white/80 transition-colors">✕</button>
            </div>

            <form onSubmit={handleSaveMonitoring} className="p-6 space-y-4">
              
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Instansi PKL (DUDI)</label>
                <select
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-smk-blue text-sm bg-white text-slate-800"
                  value={perusahaanId}
                  onChange={(e) => setPerusahaanId(e.target.value)}
                >
                  <option value="" disabled>Pilih Instansi</option>
                  {perusahaans.map((p) => (
                    <option key={p.id} value={p.id}>{p.nama}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Tahap Kegiatan</label>
                <select
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-smk-blue text-sm bg-white text-slate-800"
                  value={tipe}
                  onChange={(e) => setTipe(e.target.value as any)}
                >
                  <option value="PENGANTARAN">{TIPE_LABELS.PENGANTARAN}</option>
                  <option value="MONITORING_1">{TIPE_LABELS.MONITORING_1}</option>
                  <option value="MONITORING_2">{TIPE_LABELS.MONITORING_2}</option>
                  <option value="PENJEMPUTAN">{TIPE_LABELS.PENJEMPUTAN}</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Tanggal Kunjungan</label>
                <input
                  type="date"
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-smk-blue text-sm text-slate-800"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Catatan / Keterangan Kunjungan</label>
                <textarea
                  placeholder="Deskripsikan hasil pendampingan, diskusi dengan pembimbing lapangan, dsb..."
                  className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:border-smk-blue text-sm text-slate-800 h-20 resize-none"
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Foto Dokumentasi</label>
                <input
                  type="file"
                  accept="image/*"
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  onChange={handleFileChange}
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
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
                  Simpan Laporan
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* View Detail Modal */}
      {selectedMonitoring && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-2xl flex flex-col">
            
            <div className="px-6 py-4.5 border-b border-slate-100 flex justify-between items-center bg-smk-blue text-white rounded-t-2xl">
              <div>
                <h3 className="font-bold text-lg">Detail Laporan Monitoring</h3>
                <p className="text-xs text-blue-100 mt-0.5">Oleh: {selectedMonitoring.guru.namaLengkap}</p>
              </div>
              <button onClick={() => setSelectedMonitoring(null)} className="text-white hover:text-white/80 transition-colors">✕</button>
            </div>

            <div className="p-6 space-y-4">
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs space-y-2.5">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-semibold uppercase">Instansi PKL</span>
                  <span className="font-bold text-slate-700 flex items-center gap-1">
                    <Building2 size={12} className="text-slate-400" />
                    {selectedMonitoring.perusahaan.nama}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-semibold uppercase">Tahap Kunjungan</span>
                  <span className="font-bold text-slate-700">{TIPE_LABELS[selectedMonitoring.tipe]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-semibold uppercase">Tanggal Kunjungan</span>
                  <span className="font-bold text-slate-700 flex items-center gap-1">
                    <Calendar size={12} className="text-smk-orange" />
                    {formatTanggal(selectedMonitoring.tanggal)}
                  </span>
                </div>
              </div>

              {selectedMonitoring.keterangan && (
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-400 uppercase">Catatan Monitoring</span>
                  <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-200 text-slate-700 text-xs font-medium whitespace-pre-wrap leading-relaxed">
                    {selectedMonitoring.keterangan}
                  </div>
                </div>
              )}

              {selectedMonitoring.fotoKegiatan && (
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Foto Dokumentasi</span>
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-slate-50 flex items-center justify-center max-h-56">
                    <img
                      src={`${API_URL}/uploads/absensi/${selectedMonitoring.fotoKegiatan}`}
                      alt="Dokumentasi Monitoring"
                      className="w-full h-full object-contain max-h-56"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder-image.jpg";
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelectedMonitoring(null)}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg transition-colors text-sm"
                >
                  Tutup
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
