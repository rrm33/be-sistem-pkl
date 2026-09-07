"use client";

import React, { useState, useEffect } from "react";
import Cookies from "js-cookie";
import Swal from "sweetalert2";
import { toast } from "sonner";
import { 
  Search, 
  CheckSquare, 
  Building2, 
  Loader2, 
  Edit3, 
  Award, 
  AlertCircle, 
  CheckCircle2, 
  HelpCircle, 
  FileText 
} from "lucide-react";

interface SiswaRekap {
  id: number;
  namaLengkap: string;
  nisn: string;
  kelas: string | null;
  jurusan: string;
  perusahaan: string;
  perusahaanId: number | null;
  guruPembimbing: string;
  status: "LENGKAP" | "SEBAGIAN" | "BELUM_DINILAI";
  totalAspek: number;
  totalTerdinamis: number;
  penilaian: {
    id: number;
    noSertifikat: string | null;
    predikat: string | null;
    nilaiIndustri: number | null;
    nilaiSekolah: number | null;
    catatan: string | null;
  } | null;
}

interface AspekNilaiInput {
  id: number;
  nama: string;
  kategori: "SOFTSKILL" | "HARDSKILL" | "PRESENTASI";
  nilai: number | null;
}

export default function PenilaianSiswaPage() {
  const [rekapList, setRekapList] = useState<SiswaRekap[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  
  // User identity
  const [userRole, setUserRole] = useState("PEMBIMBING");
  const [userId, setUserId] = useState<number | null>(null);

  // Modal grading states
  const [selectedSiswa, setSelectedSiswa] = useState<SiswaRekap | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [aspekList, setAspekList] = useState<AspekNilaiInput[]>([]);
  const [catatan, setCatatan] = useState("");
  const [noSertifikat, setNoSertifikat] = useState("");
  const [predikat, setPredikat] = useState("");
  const [scores, setScores] = useState<Record<number, number | "">>({});
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
      if (!uId) return;
      const res = await fetch(`${API_URL}/penilaian/rekap?userId=${uId}&role=${role}`);
      if (!res.ok) throw new Error("Gagal mengambil rekap penilaian");
      const data = await res.json();
      setRekapList(data);
    } catch (error: any) {
      toast.error(error.message || "Gagal mengambil data rekap");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenGrading = async (siswa: SiswaRekap) => {
    setSelectedSiswa(siswa);
    setIsModalOpen(true);
    setAspekList([]);
    setScores({});
    setCatatan("");
    setNoSertifikat("");
    setPredikat("");

    try {
      const res = await fetch(`${API_URL}/penilaian/siswa/${siswa.id}`);
      if (!res.ok) throw new Error("Gagal memuat aspek penilaian siswa");
      const data = await res.json();
      
      const details: AspekNilaiInput[] = data.aspek || [];
      setAspekList(details);
      
      // Load existing grades into score state
      const initialScores: Record<number, number | ""> = {};
      details.forEach((aspek) => {
        initialScores[aspek.id] = aspek.nilai !== null ? aspek.nilai : "";
      });
      setScores(initialScores);

      if (data.penilaian) {
        setCatatan(data.penilaian.catatan || "");
        setNoSertifikat(data.penilaian.noSertifikat || "");
        setPredikat(data.penilaian.predikat || "");
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal memuat detail nilai");
    }
  };

  const handleScoreChange = (aspekId: number, valStr: string) => {
    if (valStr === "") {
      setScores((prev) => ({ ...prev, [aspekId]: "" }));
      return;
    }
    const val = Number(valStr);
    if (isNaN(val) || val < 0 || val > 100) return;
    setScores((prev) => ({ ...prev, [aspekId]: val }));
  };

  const handleSaveGrades = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSiswa || !userId) return;

    // Validate that all inputs that are enabled are filled
    const detailsPayload: { aspekId: number; nilai: number }[] = [];
    
    for (const aspek of aspekList) {
      const score = scores[aspek.id];
      
      // DUDI cannot edit PRESENTASI, so ignore validation for those
      if (userRole === "PERUSAHAAN" && aspek.kategori === "PRESENTASI") {
        continue;
      }

      if (score === "" || score === undefined) {
        toast.error(`Mohon isi nilai untuk aspek: ${aspek.nama}`);
        return;
      }
      detailsPayload.push({
        aspekId: aspek.id,
        nilai: Number(score),
      });
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/penilaian/siswa/${selectedSiswa.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          details: detailsPayload,
          catatan: catatan.trim(),
          noSertifikat: userRole !== "PERUSAHAAN" ? noSertifikat.trim() : undefined,
          predikat: predikat || undefined,
          role: userRole,
          userId: userId.toString(),
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Gagal menyimpan penilaian");

      Swal.fire({
        title: "Berhasil!",
        text: "Nilai siswa berhasil disimpan.",
        icon: "success",
        confirmButtonColor: "#1C587A",
      });

      setIsModalOpen(false);
      fetchData(userId, userRole);
    } catch (error: any) {
      Swal.fire("Gagal!", error.message || "Terjadi kesalahan.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: "LENGKAP" | "SEBAGIAN" | "BELUM_DINILAI") => {
    switch (status) {
      case "LENGKAP":
        return (
          <span className="px-2.5 py-1 text-xs font-bold bg-green-50 text-green-700 border border-green-200 rounded-full flex items-center gap-1 w-fit">
            <CheckCircle2 size={12} /> NILAI LENGKAP
          </span>
        );
      case "SEBAGIAN":
        return (
          <span className="px-2.5 py-1 text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded-full flex items-center gap-1 w-fit">
            <HelpCircle size={12} /> DINILAI SEBAGIAN
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 rounded-full flex items-center gap-1 w-fit">
            <AlertCircle size={12} /> BELUM DINILAI
          </span>
        );
    }
  };

  const filteredRekap = rekapList.filter((r) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      r.namaLengkap.toLowerCase().includes(query) ||
      r.nisn.includes(query) ||
      r.kelas?.toLowerCase().includes(query) ||
      r.perusahaan.toLowerCase().includes(query) ||
      r.guruPembimbing.toLowerCase().includes(query);

    const matchesStatus = statusFilter === "ALL" || r.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
      
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-smk-blue flex items-center gap-2">
          <CheckSquare className="text-smk-orange" />
          Pemberian Nilai Sertifikat Siswa PKL
        </h1>
        <p className="text-slate-500 text-sm">
          {userRole === "PERUSAHAAN" 
            ? "Beri nilai softskill dan hardskill teknis untuk siswa yang magang di instansi Anda."
            : userRole === "PEMBIMBING"
            ? "Beri nilai bimbingan PKL siswa Anda, termasuk nilai presentasi/sidang dan nomor sertifikat."
            : "Lakukan manajemen, verifikasi, dan rekapitulasi penilaian seluruh siswa."}
        </p>
      </div>

      {/* Filter controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
            <Search size={18} />
          </span>
          <input
            type="text"
            placeholder="Cari nama, NISN, DUDI, guru pembimbing..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-smk-blue text-sm text-slate-800"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs text-slate-500 font-bold whitespace-nowrap">Filter Kelengkapan:</span>
          <select
            className="w-full md:w-48 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-smk-blue text-sm bg-white text-slate-800"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">Semua Status</option>
            <option value="LENGKAP">Nilai Lengkap</option>
            <option value="SEBAGIAN">Dinilai Sebagian</option>
            <option value="BELUM_DINILAI">Belum Dinilai</option>
          </select>
        </div>
      </div>

      {/* Table Rekap */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-10 h-10 text-smk-blue animate-spin" />
            <p className="text-slate-500 text-sm font-semibold">Memuat rekap penilaian...</p>
          </div>
        ) : filteredRekap.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-400 font-medium">Tidak ada data siswa bimbingan ditemukan.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-slate-400 font-bold text-xs uppercase border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-semibold text-center w-16">No</th>
                  <th className="px-6 py-4 font-semibold">Nama Siswa / NISN</th>
                  <th className="px-6 py-4 font-semibold">Kelas / Jurusan</th>
                  <th className="px-6 py-4 font-semibold">Instansi DUDI</th>
                  <th className="px-6 py-4 font-semibold">Guru Pembimbing</th>
                  <th className="px-6 py-4 font-semibold text-center">Nilai Industri</th>
                  <th className="px-6 py-4 font-semibold text-center">Nilai Sekolah</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-center w-36">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRekap.map((rekap, idx) => (
                  <tr key={rekap.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4.5 text-center text-slate-400 font-medium">{idx + 1}</td>
                    <td className="px-6 py-4.5">
                      <div className="font-bold text-slate-800">{rekap.namaLengkap}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">{rekap.nisn}</div>
                    </td>
                    <td className="px-6 py-4.5">
                      <div className="font-semibold text-slate-700">{rekap.kelas || "-"}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{rekap.jurusan}</div>
                    </td>
                    <td className="px-6 py-4.5">
                      <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                        <Building2 size={13} className="text-slate-400" />
                        {rekap.perusahaan}
                      </div>
                    </td>
                    <td className="px-6 py-4.5 font-medium text-slate-600">{rekap.guruPembimbing}</td>
                    <td className="px-6 py-4.5 text-center font-bold text-slate-700">
                      {rekap.penilaian?.nilaiIndustri !== null && rekap.penilaian?.nilaiIndustri !== undefined
                        ? rekap.penilaian.nilaiIndustri.toFixed(1)
                        : "-"}
                    </td>
                    <td className="px-6 py-4.5 text-center font-bold text-slate-700">
                      {rekap.penilaian?.nilaiSekolah !== null && rekap.penilaian?.nilaiSekolah !== undefined
                        ? rekap.penilaian.nilaiSekolah.toFixed(1)
                        : "-"}
                    </td>
                    <td className="px-6 py-4.5">{getStatusBadge(rekap.status)}</td>
                    <td className="px-6 py-4.5 text-center">
                      <button
                        onClick={() => handleOpenGrading(rekap)}
                        className="px-3 py-1.5 bg-smk-blue text-white font-bold rounded-lg hover:bg-smk-blue/90 shadow-sm transition-all text-xs flex items-center gap-1 mx-auto"
                      >
                        <Edit3 size={13} />
                        Input Nilai
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Grading Modal */}
      {isModalOpen && selectedSiswa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-slate-200 shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-slate-100 flex justify-between items-center bg-smk-blue text-white rounded-t-2xl">
              <div>
                <h3 className="font-bold text-lg">Input Penilaian PKL</h3>
                <p className="text-xs text-blue-100 mt-0.5">Siswa: {selectedSiswa.namaLengkap} ({selectedSiswa.nisn})</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-white hover:text-white/80 transition-colors">✕</button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <form onSubmit={handleSaveGrades} className="space-y-6">
                
                {/* 1. Softskill */}
                <div className="space-y-3">
                  <span className="text-xs font-bold text-green-700 bg-green-50 px-2.5 py-1 rounded-md border border-green-200 uppercase tracking-wider block w-fit">
                    I. Nilai Softskill (Karakter & Etika Kerja)
                  </span>
                  
                  {aspekList.filter((a) => a.kategori === "SOFTSKILL").length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Belum ada aspek softskill yang dikonfigurasi oleh Admin.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {aspekList.filter((a) => a.kategori === "SOFTSKILL").map((aspek) => (
                        <div key={aspek.id} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                          <label className="text-xs font-semibold text-slate-700 w-32 md:w-40 break-words">{aspek.nama}</label>
                          <input
                            type="number"
                            placeholder="0-100"
                            required
                            min="0"
                            max="100"
                            className="w-20 px-2 py-1 text-center border border-slate-200 rounded focus:outline-none focus:border-smk-blue text-xs text-slate-800 font-bold bg-white"
                            value={scores[aspek.id] ?? ""}
                            onChange={(e) => handleScoreChange(aspek.id, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Hardskill */}
                <div className="space-y-3">
                  <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 uppercase tracking-wider block w-fit">
                    II. Nilai Hardskill (Kompetensi Teknis DUDI)
                  </span>
                  
                  {aspekList.filter((a) => a.kategori === "HARDSKILL").length === 0 ? (
                    <div className="p-3 bg-amber-50 text-amber-800 border border-amber-100 rounded-lg text-xs">
                      Belum ada aspek hardskill khusus untuk DUDI ini. Konfigurasikan aspek hardskill di menu <strong>Aspek Penilaian</strong>.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {aspekList.filter((a) => a.kategori === "HARDSKILL").map((aspek) => (
                        <div key={aspek.id} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                          <label className="text-xs font-semibold text-slate-700 w-32 md:w-40 break-words">{aspek.nama}</label>
                          <input
                            type="number"
                            placeholder="0-100"
                            required
                            min="0"
                            max="100"
                            className="w-20 px-2 py-1 text-center border border-slate-200 rounded focus:outline-none focus:border-smk-blue text-xs text-slate-800 font-bold bg-white"
                            value={scores[aspek.id] ?? ""}
                            onChange={(e) => handleScoreChange(aspek.id, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Presentasi */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-md border border-purple-200 uppercase tracking-wider block w-fit">
                      III. Nilai Presentasi (Sidang PKL Sekolah)
                    </span>
                    {userRole === "PERUSAHAAN" && (
                      <span className="text-[10px] text-rose-500 font-bold uppercase">Hanya Untuk Guru/Admin</span>
                    )}
                  </div>
                  
                  {aspekList.filter((a) => a.kategori === "PRESENTASI").length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Belum ada aspek presentasi sidang yang dikonfigurasi oleh Admin.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {aspekList.filter((a) => a.kategori === "PRESENTASI").map((aspek) => (
                        <div key={aspek.id} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                          <label className="text-xs font-semibold text-slate-700 w-32 md:w-40 break-words">{aspek.nama}</label>
                          <input
                            type="number"
                            placeholder="0-100"
                            required={userRole !== "PERUSAHAAN"}
                            disabled={userRole === "PERUSAHAAN"}
                            min="0"
                            max="100"
                            className={`w-20 px-2 py-1 text-center border rounded focus:outline-none focus:border-smk-blue text-xs font-bold ${
                              userRole === "PERUSAHAAN"
                                ? "bg-slate-200 text-slate-400 border-slate-200"
                                : "bg-white text-slate-800 border-slate-200"
                            }`}
                            value={scores[aspek.id] ?? ""}
                            onChange={(e) => handleScoreChange(aspek.id, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. Nomor Sertifikat & Catatan */}
                <div className="border-t border-slate-100 pt-4 space-y-4">
                  <span className="text-sm font-bold text-slate-800 block">Informasi Sertifikat & Catatan</span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 block mb-1">
                        Nomor Sertifikat PKL {userRole === "PERUSAHAAN" && <span className="text-[10px] text-rose-500 font-bold uppercase">(Hanya Guru/Admin)</span>}
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: 421.5/129/SMK.06/2026"
                        disabled={userRole === "PERUSAHAAN"}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-smk-blue text-xs font-medium ${
                          userRole === "PERUSAHAAN"
                            ? "bg-slate-200 text-slate-400 border-slate-200"
                            : "bg-white text-slate-800 border-slate-200"
                        }`}
                        value={noSertifikat}
                        onChange={(e) => setNoSertifikat(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-500 block mb-1">Predikat Nilai (Opsional)</label>
                      <select
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-smk-blue text-xs bg-white text-slate-800"
                        value={predikat}
                        onChange={(e) => setPredikat(e.target.value)}
                      >
                        <option value="">(Hitung Otomatis Rata-Rata)</option>
                        <option value="SANGAT BAIK">Sangat Baik</option>
                        <option value="BAIK">Baik</option>
                        <option value="CUKUP">Cukup</option>
                        <option value="KURANG">Kurang</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">Catatan / Umpan Balik Kinerja</label>
                    <textarea
                      placeholder="Masukkan catatan evaluasi pembimbing mengenai kinerja siswa..."
                      className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:border-smk-blue text-xs text-slate-800 h-16 resize-none"
                      value={catatan}
                      onChange={(e) => setCatatan(e.target.value)}
                    />
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
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
                    Simpan Nilai
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
