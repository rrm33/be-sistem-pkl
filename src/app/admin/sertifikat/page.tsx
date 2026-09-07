"use client";

import React, { useState, useEffect } from "react";
import Cookies from "js-cookie";
import { 
  Search, 
  Award, 
  Printer, 
  Building2, 
  Loader2, 
  X, 
  CheckCircle2, 
  ChevronRight 
} from "lucide-react";

interface SiswaSertifikat {
  id: number;
  namaLengkap: string;
  nisn: string;
  kelas: string | null;
  jurusan: string;
  perusahaan: string;
  perusahaanId: number | null;
  guruPembimbing: string;
  pklMulaiOverride: string | null;
  pklSelesaiOverride: string | null;
  status: "LENGKAP" | "SEBAGIAN" | "BELUM_DINILAI";
  penilaian: {
    id: number;
    noSertifikat: string | null;
    predikat: string | null;
    nilaiIndustri: number | null;
    nilaiSekolah: number | null;
    catatan: string | null;
  } | null;
}

interface ScoreDetail {
  id: number;
  nama: string;
  kategori: "SOFTSKILL" | "HARDSKILL" | "PRESENTASI";
  nilai: number | null;
}

export default function SertifikatPage() {
  const [students, setStudents] = useState<SiswaSertifikat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Selected student for printing
  const [selectedStudent, setSelectedStudent] = useState<SiswaSertifikat | null>(null);
  const [gradeDetails, setGradeDetails] = useState<ScoreDetail[]>([]);
  const [isPrintViewOpen, setIsPrintViewOpen] = useState(false);
  const [isLoadingPrintData, setIsLoadingPrintData] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  useEffect(() => {
    const role = Cookies.get("userRole") || "PEMBIMBING";
    const token = Cookies.get("token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (payload.sub) {
          fetchData(Number(payload.sub), role);
        }
      } catch (e) {
        fetchData(null, role);
      }
    }
  }, []);

  const fetchData = async (uId: number | null, role: string) => {
    setIsLoading(true);
    try {
      if (!uId) return;
      const res = await fetch(`${API_URL}/penilaian/rekap?userId=${uId}&role=${role}`);
      if (!res.ok) throw new Error("Gagal mengambil data rekap");
      const data = await res.json();
      // Only display students whose grades are LENGKAP (or SEBAGIAN if we allow partial certificates, but let's filter for LENGKAP and SEBAGIAN so they can preview/print!)
      setStudents(data.filter((s: SiswaSertifikat) => s.status === "LENGKAP"));
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenPrintPreview = async (student: SiswaSertifikat) => {
    setSelectedStudent(student);
    setIsPrintViewOpen(true);
    setIsLoadingPrintData(true);

    try {
      const res = await fetch(`${API_URL}/penilaian/siswa/${student.id}`);
      if (!res.ok) throw new Error("Gagal mengambil detail nilai");
      const data = await res.json();
      setGradeDetails(data.aspek || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingPrintData(false);
    }
  };

  const triggerPrint = () => {
    window.print();
  };

  const getTerbilang = (nilai: number): string => {
    const units = ["nol", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan"];
    const val = Math.round(nilai);
    
    if (val === 100) return "seratus";
    
    const tens = Math.floor(val / 10);
    const ones = val % 10;
    
    let result = "";
    if (tens === 1) {
      if (ones === 0) result = "sepuluh";
      else if (ones === 1) result = "sebelas";
      else result = units[ones] + " belas";
    } else if (tens > 1) {
      result = units[tens] + " puluh";
      if (ones > 0) result += " " + units[ones];
    } else {
      result = units[ones];
    }
    
    return result.charAt(0).toUpperCase() + result.slice(1);
  };

  const formatDateIndo = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const formatTanggalRange = (startStr: string | null, endStr: string | null) => {
    if (!startStr || !endStr) return "-";
    const start = new Date(startStr);
    const end = new Date(endStr);
    
    const formatter = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long" });
    const yearFormatter = new Intl.DateTimeFormat("id-ID", { year: "numeric" });
    
    if (start.getFullYear() === end.getFullYear()) {
      return `${formatter.format(start)} s.d. ${formatter.format(end)} ${yearFormatter.format(end)}`;
    } else {
      return `${formatter.format(start)} ${yearFormatter.format(start)} s.d. ${formatter.format(end)} ${yearFormatter.format(end)}`;
    }
  };

  const filteredStudents = students.filter((s) => {
    const query = searchQuery.toLowerCase();
    return (
      s.namaLengkap.toLowerCase().includes(query) ||
      s.nisn.includes(query) ||
      s.kelas?.toLowerCase().includes(query) ||
      s.perusahaan.toLowerCase().includes(query)
    );
  });

  const softskills = gradeDetails.filter((g) => g.kategori === "SOFTSKILL");
  const hardskills = gradeDetails.filter((g) => g.kategori === "HARDSKILL");
  const presentasis = gradeDetails.filter((g) => g.kategori === "PRESENTASI");

  const averageScore = gradeDetails.length > 0
    ? gradeDetails.reduce((acc, curr) => acc + (curr.nilai || 0), 0) / gradeDetails.length
    : 0;

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
      
      {/* Printable Area - Hide by default in screen view */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #sertifikat-print-area, #sertifikat-print-area * {
            visibility: visible;
          }
          #sertifikat-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .page-break {
            page-break-after: always;
            break-after: page;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Screen View */}
      <div className="no-print mb-6">
        <h1 className="text-2xl font-bold text-smk-blue flex items-center gap-2">
          <Award className="text-smk-orange" />
          Cetak Sertifikat Kelulusan PKL
        </h1>
        <p className="text-slate-500 text-sm">
          Cetak sertifikat resmi 2 halaman (depan & belakang daftar nilai) untuk siswa yang telah menyelesaikan masa PKL dengan nilai lengkap.
        </p>
      </div>

      {/* Filter and Search */}
      <div className="no-print bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex items-center justify-between">
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
            <Search size={18} />
          </span>
          <input
            type="text"
            placeholder="Cari siswa dengan nilai lengkap..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-smk-blue text-sm text-slate-800"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Grid List Siswa */}
      <div className="no-print grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 gap-3 bg-white border rounded-xl">
            <Loader2 className="w-10 h-10 text-smk-blue animate-spin" />
            <p className="text-slate-500 text-sm font-semibold">Memuat daftar sertifikat...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="col-span-full text-center py-20 bg-white border border-slate-200 rounded-xl">
            <p className="text-slate-400 font-medium">Belum ada siswa dengan status nilai lengkap.</p>
          </div>
        ) : (
          filteredStudents.map((siswa) => (
            <div key={siswa.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow transition-shadow flex flex-col justify-between">
              <div className="p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-800 text-sm">{siswa.namaLengkap}</h3>
                    <p className="text-xs text-slate-400 font-mono">NISN: {siswa.nisn}</p>
                  </div>
                  <span className="px-2 py-0.5 bg-green-50 text-green-700 text-[10px] font-bold rounded-full border border-green-200 flex items-center gap-0.5 shrink-0">
                    <CheckCircle2 size={10} /> Nilai OK
                  </span>
                </div>

                <div className="space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Building2 size={13} className="text-slate-400" />
                    <span>DUDI: <strong>{siswa.perusahaan}</strong></span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Kelas / Jurusan:</span>
                    <span className="font-bold text-slate-700">{siswa.kelas || "-"} / {siswa.jurusan}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Rata-Rata Nilai:</span>
                    <span className="font-bold text-slate-700">
                      {siswa.penilaian 
                        ? (((siswa.penilaian.nilaiIndustri || 0) + (siswa.penilaian.nilaiSekolah || 0)) / 2).toFixed(1)
                        : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">No. Sertifikat:</span>
                    <span className="font-semibold text-smk-blue truncate max-w-[180px]" title={siswa.penilaian?.noSertifikat || "-"}>
                      {siswa.penilaian?.noSertifikat || "-"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => handleOpenPrintPreview(siswa)}
                  className="px-3.5 py-1.5 bg-smk-blue text-white font-bold rounded-lg hover:bg-smk-blue/90 shadow-sm transition-all text-xs flex items-center gap-1"
                >
                  <Printer size={13} />
                  Cetak Sertifikat
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Print Preview & Printer Dialog Modal */}
      {isPrintViewOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto no-print">
          <div className="bg-white w-full max-w-4xl rounded-2xl border border-slate-200 shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-smk-blue text-white rounded-t-2xl">
              <div>
                <h3 className="font-bold text-base">Pratinjau Cetak Sertifikat</h3>
                <p className="text-xs text-blue-100">Siswa: {selectedStudent.namaLengkap}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={triggerPrint}
                  className="px-3.5 py-1.5 bg-smk-orange hover:bg-smk-orange/90 text-white font-bold rounded-lg transition-all text-xs flex items-center gap-1.5 shadow"
                >
                  <Printer size={14} />
                  Cetak Sekarang
                </button>
                <button
                  onClick={() => setIsPrintViewOpen(false)}
                  className="text-white hover:text-white/80 p-1"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-8 bg-slate-100/50 flex justify-center">
              
              {isLoadingPrintData ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-smk-blue" />
                  <p className="text-xs font-semibold text-slate-500">Memuat berkas sertifikat...</p>
                </div>
              ) : (
                <div className="space-y-8 w-full max-w-[210mm]">
                  
                  {/* HALAMAN 1: TAMPAK DEPAN (A4 Landscape) */}
                  <div className="bg-white border-8 border-double border-slate-800 p-8 shadow-md rounded-md relative flex flex-col justify-between aspect-[1.414] w-full text-slate-800">
                    
                    {/* Header */}
                    <div className="text-center border-b-2 border-slate-800 pb-4">
                      <h2 className="text-lg font-bold uppercase tracking-wider leading-tight text-smk-blue">Pemerintah Provinsi Jawa Timur</h2>
                      <h2 className="text-base font-bold uppercase leading-tight text-slate-700">Dinas Pendidikan</h2>
                      <h1 className="text-xl font-extrabold uppercase leading-tight text-smk-blue">SMK Negeri 6 Jember</h1>
                      <p className="text-[10px] text-slate-400 font-medium">Alamat: Jl. PB. Sudirman No. 118 Tanggul, Jember - Telp. (0336) 441367</p>
                    </div>

                    {/* Title */}
                    <div className="text-center my-4 space-y-1">
                      <h3 className="text-xl font-black text-smk-orange uppercase tracking-wide">Sertifikat Praktik Kerja Lapangan</h3>
                      <p className="text-xs font-bold text-slate-500">Nomor: {selectedStudent.penilaian?.noSertifikat || "___________________________"}</p>
                    </div>

                    {/* Diberikan Kepada */}
                    <div className="text-center my-2">
                      <p className="text-xs italic text-slate-400">Diberikan Kepada:</p>
                      <h4 className="text-lg font-black text-slate-800 uppercase underline decoration-smk-orange decoration-2 mt-1">
                        {selectedStudent.namaLengkap}
                      </h4>
                      <p className="text-xs font-bold text-slate-500 mt-1">NISN: {selectedStudent.nisn}</p>
                    </div>

                    {/* Keterangan Kelulusan */}
                    <div className="text-center px-6 text-xs leading-relaxed text-slate-600 font-medium my-3">
                      Bahwa yang bersangkutan telah melaksanakan Praktik Kerja Lapangan (PKL) di 
                      <strong className="text-slate-800 font-bold"> {selectedStudent.perusahaan}</strong> pada kompetensi keahlian 
                      <strong className="text-slate-800 font-bold"> {selectedStudent.jurusan} </strong> 
                      selama jangka waktu tanggal {formatTanggalRange(selectedStudent.pklMulaiOverride, selectedStudent.pklSelesaiOverride)} dengan predikat 
                      <strong className="text-smk-blue font-bold"> "{selectedStudent.penilaian?.predikat || "BAIK"}"</strong>.
                    </div>

                    {/* Signatures */}
                    <div className="flex justify-between items-end mt-4 px-12 text-xs">
                      <div className="text-center w-48">
                        <p className="text-slate-400">Mengetahui,</p>
                        <p className="font-bold text-slate-700 mt-1">Pimpinan Instansi DUDI</p>
                        <div className="h-16"></div>
                        <p className="font-black text-slate-800 uppercase underline">___________________</p>
                      </div>
                      <div className="text-center w-48">
                        <p className="text-slate-400">Tanggul, {formatDateIndo(new Date().toISOString())}</p>
                        <p className="font-bold text-slate-700 mt-1">Kepala Sekolah</p>
                        <div className="h-16"></div>
                        <p className="font-black text-slate-800 uppercase underline">Sri Widodo, M.Pd.</p>
                        <p className="text-[10px] text-slate-400 font-mono leading-none">NIP. 197405102005011002</p>
                      </div>
                    </div>

                  </div>

                  {/* HALAMAN 2: TAMPAK BELAKANG (Daftar Nilai) */}
                  <div className="bg-white border-4 border-slate-800 p-8 shadow-md rounded-md relative flex flex-col justify-between aspect-[1.414] w-full text-slate-800">
                    
                    {/* Header */}
                    <div className="text-center border-b border-slate-300 pb-3">
                      <h3 className="text-base font-black text-slate-800 uppercase tracking-wider">Daftar Nilai Hasil Praktik Kerja Lapangan</h3>
                      <div className="grid grid-cols-2 gap-x-8 text-left text-xs font-semibold text-slate-600 mt-3 max-w-lg mx-auto">
                        <div>Nama Siswa: <strong className="text-slate-800">{selectedStudent.namaLengkap}</strong></div>
                        <div>Instansi PKL: <strong className="text-slate-800">{selectedStudent.perusahaan}</strong></div>
                        <div>NISN: <strong className="text-slate-800">{selectedStudent.nisn}</strong></div>
                        <div>Jurusan: <strong className="text-slate-800">{selectedStudent.jurusan}</strong></div>
                      </div>
                    </div>

                    {/* Table of Grades */}
                    <div className="my-4 flex-1">
                      <table className="w-full border-collapse border border-slate-800 text-xs text-left">
                        <thead>
                          <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-800">
                            <th className="border border-slate-800 px-3 py-1.5 text-center w-12">No</th>
                            <th className="border border-slate-800 px-4 py-1.5">Aspek Penilaian</th>
                            <th className="border border-slate-800 px-4 py-1.5 text-center w-24">Skor (Angka)</th>
                            <th className="border border-slate-800 px-4 py-1.5 text-center w-36">Terbilang (Huruf)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Softskills */}
                          {softskills.length > 0 && (
                            <>
                              <tr className="bg-slate-50 font-bold">
                                <td colSpan={4} className="border border-slate-800 px-3 py-1 text-green-700 bg-green-50/50 uppercase">I. Nilai Aspek Softskill (Etos Kerja)</td>
                              </tr>
                              {softskills.map((s, idx) => (
                                <tr key={s.id}>
                                  <td className="border border-slate-800 px-3 py-1 text-center">{idx + 1}</td>
                                  <td className="border border-slate-800 px-4 py-1 font-medium">{s.nama}</td>
                                  <td className="border border-slate-800 px-4 py-1 text-center font-bold">{s.nilai !== null ? s.nilai : "-"}</td>
                                  <td className="border border-slate-800 px-4 py-1 text-center font-medium italic">{s.nilai !== null ? getTerbilang(s.nilai) : "-"}</td>
                                </tr>
                              ))}
                            </>
                          )}
                          {/* Hardskills */}
                          {hardskills.length > 0 && (
                            <>
                              <tr className="bg-slate-50 font-bold">
                                <td colSpan={4} className="border border-slate-800 px-3 py-1 text-blue-700 bg-blue-50/50 uppercase">II. Nilai Aspek Hardskill (Keterampilan Teknis)</td>
                              </tr>
                              {hardskills.map((h, idx) => (
                                <tr key={h.id}>
                                  <td className="border border-slate-800 px-3 py-1 text-center">{idx + 1}</td>
                                  <td className="border border-slate-800 px-4 py-1 font-medium">{h.nama}</td>
                                  <td className="border border-slate-800 px-4 py-1 text-center font-bold">{h.nilai !== null ? h.nilai : "-"}</td>
                                  <td className="border border-slate-800 px-4 py-1 text-center font-medium italic">{h.nilai !== null ? getTerbilang(h.nilai) : "-"}</td>
                                </tr>
                              ))}
                            </>
                          )}
                          {/* Presentasi */}
                          {presentasis.length > 0 && (
                            <>
                              <tr className="bg-slate-50 font-bold">
                                <td colSpan={4} className="border border-slate-800 px-3 py-1 text-purple-700 bg-purple-50/50 uppercase">III. Nilai Aspek Presentasi (Sidang Sekolah)</td>
                              </tr>
                              {presentasis.map((p, idx) => (
                                <tr key={p.id}>
                                  <td className="border border-slate-800 px-3 py-1 text-center">{idx + 1}</td>
                                  <td className="border border-slate-800 px-4 py-1 font-medium">{p.nama}</td>
                                  <td className="border border-slate-800 px-4 py-1 text-center font-bold">{p.nilai !== null ? p.nilai : "-"}</td>
                                  <td className="border border-slate-800 px-4 py-1 text-center font-medium italic">{p.nilai !== null ? getTerbilang(p.nilai) : "-"}</td>
                                </tr>
                              ))}
                            </>
                          )}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-100 font-bold border-t-2 border-slate-800">
                            <td colSpan={2} className="border border-slate-800 px-4 py-1.5 text-right uppercase">Rata-Rata / Predikat</td>
                            <td className="border border-slate-800 px-4 py-1.5 text-center text-sm font-extrabold text-slate-800">
                              {averageScore.toFixed(1)}
                            </td>
                            <td className="border border-slate-800 px-4 py-1.5 text-center font-extrabold text-smk-blue text-xs uppercase">
                              {selectedStudent.penilaian?.predikat || "BAIK"}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Signatures */}
                    <div className="flex justify-between items-end mt-4 px-12 text-xs">
                      <div className="text-center w-48">
                        <p className="font-bold text-slate-700">Pembimbing Lapangan DUDI</p>
                        <div className="h-14"></div>
                        <p className="font-black text-slate-800 uppercase underline">___________________</p>
                      </div>
                      <div className="text-center w-48">
                        <p className="font-bold text-slate-700">Guru Pembimbing PKL</p>
                        <div className="h-14"></div>
                        <p className="font-black text-slate-800 uppercase underline">___________________</p>
                      </div>
                    </div>

                  </div>

                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* HIDDEN PRINT-ONLY BLOCKS (Directly rendered for window.print()) */}
      {selectedStudent && (
        <div id="sertifikat-print-area" className="hidden print:block w-[297mm] h-[210mm] text-slate-800 font-sans">
          
          {/* HALAMAN 1 (TAMPAN DEPAN) */}
          <div className="page-break w-[297mm] h-[210mm] border-[16px] border-double border-slate-800 p-16 flex flex-col justify-between box-border bg-white relative">
            <div className="text-center border-b-4 border-slate-800 pb-4">
              <h2 className="text-2xl font-bold uppercase tracking-wider leading-tight text-slate-800">Pemerintah Provinsi Jawa Timur</h2>
              <h2 className="text-xl font-bold uppercase leading-tight text-slate-700">Dinas Pendidikan</h2>
              <h1 className="text-3xl font-extrabold uppercase leading-tight text-slate-800">SMK Negeri 6 Jember</h1>
              <p className="text-xs text-slate-400 font-medium mt-1">Alamat: Jl. PB. Sudirman No. 118 Tanggul, Jember - Telp. (0336) 441367</p>
            </div>

            <div className="text-center my-6 space-y-1.5">
              <h3 className="text-3xl font-black text-slate-800 uppercase tracking-wide">Sertifikat Praktik Kerja Lapangan</h3>
              <p className="text-sm font-bold text-slate-500">Nomor: {selectedStudent.penilaian?.noSertifikat || "___________________________"}</p>
            </div>

            <div className="text-center my-4">
              <p className="text-sm italic text-slate-400">Diberikan Kepada:</p>
              <h4 className="text-2xl font-black text-slate-800 uppercase underline decoration-slate-800 decoration-4 mt-2">
                {selectedStudent.namaLengkap}
              </h4>
              <p className="text-sm font-bold text-slate-500 mt-2">NISN: {selectedStudent.nisn}</p>
            </div>

            <div className="text-center px-12 text-sm leading-relaxed text-slate-700 font-medium my-4">
              Bahwa yang bersangkutan telah melaksanakan Praktik Kerja Lapangan (PKL) di 
              <strong className="text-slate-900 font-bold"> {selectedStudent.perusahaan}</strong> pada kompetensi keahlian 
              <strong className="text-slate-900 font-bold"> {selectedStudent.jurusan} </strong> 
              selama jangka waktu tanggal {formatTanggalRange(selectedStudent.pklMulaiOverride, selectedStudent.pklSelesaiOverride)} dengan predikat 
              <strong className="text-slate-900 font-bold"> "{selectedStudent.penilaian?.predikat || "BAIK"}"</strong>.
            </div>

            <div className="flex justify-between items-end mt-8 px-24 text-sm">
              <div className="text-center w-56">
                <p className="text-slate-400">Mengetahui,</p>
                <p className="font-bold text-slate-700 mt-1.5">Pimpinan Instansi DUDI</p>
                <div className="h-20"></div>
                <p className="font-black text-slate-900 uppercase underline">___________________</p>
              </div>
              <div className="text-center w-56">
                <p className="text-slate-400">Tanggul, {formatDateIndo(new Date().toISOString())}</p>
                <p className="font-bold text-slate-700 mt-1.5">Kepala Sekolah</p>
                <div className="h-20"></div>
                <p className="font-black text-slate-900 uppercase underline">Sri Widodo, M.Pd.</p>
                <p className="text-xs text-slate-400 font-mono mt-0.5 leading-none">NIP. 197405102005011002</p>
              </div>
            </div>
          </div>

          {/* HALAMAN 2 (TAMPAK BELAKANG / DAFTAR NILAI) */}
          <div className="w-[297mm] h-[210mm] border-8 border-slate-800 p-16 flex flex-col justify-between box-border bg-white relative">
            <div className="text-center border-b-2 border-slate-350 pb-4">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-wider">Daftar Nilai Hasil Praktik Kerja Lapangan</h3>
              <div className="grid grid-cols-2 gap-x-12 text-left text-xs font-semibold text-slate-600 mt-4 max-w-xl mx-auto">
                <div>Nama Siswa: <strong className="text-slate-950">{selectedStudent.namaLengkap}</strong></div>
                <div>Instansi PKL: <strong className="text-slate-950">{selectedStudent.perusahaan}</strong></div>
                <div>NISN: <strong className="text-slate-950">{selectedStudent.nisn}</strong></div>
                <div>Jurusan: <strong className="text-slate-950">{selectedStudent.jurusan}</strong></div>
              </div>
            </div>

            <div className="my-6 flex-1">
              <table className="w-full border-collapse border border-slate-800 text-xs text-left">
                <thead>
                  <tr className="bg-slate-100 text-slate-900 font-extrabold border-b border-slate-800">
                    <th className="border border-slate-800 px-3 py-2 text-center w-12">No</th>
                    <th className="border border-slate-800 px-4 py-2">Aspek Penilaian</th>
                    <th className="border border-slate-800 px-4 py-2 text-center w-24">Skor (Angka)</th>
                    <th className="border border-slate-800 px-4 py-2 text-center w-36">Terbilang (Huruf)</th>
                  </tr>
                </thead>
                <tbody>
                  {softskills.length > 0 && (
                    <>
                      <tr className="bg-slate-50 font-bold">
                        <td colSpan={4} className="border border-slate-800 px-3 py-1.5 text-slate-900 bg-slate-100/50 uppercase">I. Nilai Aspek Softskill (Etos Kerja)</td>
                      </tr>
                      {softskills.map((s, idx) => (
                        <tr key={s.id}>
                          <td className="border border-slate-800 px-3 py-1.5 text-center">{idx + 1}</td>
                          <td className="border border-slate-800 px-4 py-1.5 font-medium">{s.nama}</td>
                          <td className="border border-slate-800 px-4 py-1.5 text-center font-bold">{s.nilai !== null ? s.nilai : "-"}</td>
                          <td className="border border-slate-800 px-4 py-1.5 text-center font-medium italic">{s.nilai !== null ? getTerbilang(s.nilai) : "-"}</td>
                        </tr>
                      ))}
                    </>
                  )}
                  {hardskills.length > 0 && (
                    <>
                      <tr className="bg-slate-50 font-bold">
                        <td colSpan={4} className="border border-slate-800 px-3 py-1.5 text-slate-900 bg-slate-100/50 uppercase">II. Nilai Aspek Hardskill (Keterampilan Teknis)</td>
                      </tr>
                      {hardskills.map((h, idx) => (
                        <tr key={h.id}>
                          <td className="border border-slate-800 px-3 py-1.5 text-center">{idx + 1}</td>
                          <td className="border border-slate-800 px-4 py-1.5 font-medium">{h.nama}</td>
                          <td className="border border-slate-800 px-4 py-1.5 text-center font-bold">{h.nilai !== null ? h.nilai : "-"}</td>
                          <td className="border border-slate-800 px-4 py-1.5 text-center font-medium italic">{h.nilai !== null ? getTerbilang(h.nilai) : "-"}</td>
                        </tr>
                      ))}
                    </>
                  )}
                  {presentasis.length > 0 && (
                    <>
                      <tr className="bg-slate-50 font-bold">
                        <td colSpan={4} className="border border-slate-800 px-3 py-1.5 text-slate-900 bg-slate-100/50 uppercase">III. Nilai Aspek Presentasi (Sidang Sekolah)</td>
                      </tr>
                      {presentasis.map((p, idx) => (
                        <tr key={p.id}>
                          <td className="border border-slate-800 px-3 py-1.5 text-center">{idx + 1}</td>
                          <td className="border border-slate-800 px-4 py-1.5 font-medium">{p.nama}</td>
                          <td className="border border-slate-800 px-4 py-1.5 text-center font-bold">{p.nilai !== null ? p.nilai : "-"}</td>
                          <td className="border border-slate-800 px-4 py-1.5 text-center font-medium italic">{p.nilai !== null ? getTerbilang(p.nilai) : "-"}</td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-800">
                    <td colSpan={2} className="border border-slate-800 px-4 py-2 text-right uppercase text-xs">Rata-Rata / Predikat</td>
                    <td className="border border-slate-800 px-4 py-2 text-center text-sm font-extrabold text-slate-900">
                      {averageScore.toFixed(1)}
                    </td>
                    <td className="border border-slate-800 px-4 py-2 text-center font-extrabold text-slate-900 text-xs uppercase">
                      {selectedStudent.penilaian?.predikat || "BAIK"}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex justify-between items-end mt-8 px-24 text-sm">
              <div className="text-center w-56">
                <p className="font-bold text-slate-700">Pembimbing Lapangan DUDI</p>
                <div className="h-20"></div>
                <p className="font-black text-slate-900 uppercase underline">___________________</p>
              </div>
              <div className="text-center w-56">
                <p className="font-bold text-slate-700">Guru Pembimbing PKL</p>
                <div className="h-20"></div>
                <p className="font-black text-slate-900 uppercase underline">___________________</p>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
