"use client";

import React, { useState, useEffect } from "react";
import Cookies from "js-cookie";
import Swal from "sweetalert2";
import { toast } from "sonner";
import { 
  GraduationCap, 
  Settings, 
  Trash2, 
  Plus, 
  Loader2, 
  Building2, 
  Layers, 
  CheckCircle 
} from "lucide-react";

interface AspekPenilaian {
  id: number;
  nama: string;
  kategori: "SOFTSKILL" | "HARDSKILL" | "PRESENTASI";
  perusahaanId: number | null;
  siswaId: number | null;
  perusahaan?: {
    nama: string;
  } | null;
  siswa?: {
    namaLengkap: string;
  } | null;
}

export default function AspekPenilaianPage() {
  const [aspeks, setAspeks] = useState<AspekPenilaian[]>([]);
  const [perusahaans, setPerusahaans] = useState<{ id: number; nama: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [nama, setNama] = useState("");
  const [kategori, setKategori] = useState<"SOFTSKILL" | "HARDSKILL" | "PRESENTASI">("SOFTSKILL");
  const [lingkup, setLingkup] = useState<"GLOBAL" | "PERUSAHAAN">("GLOBAL");
  const [perusahaanId, setPerusahaanId] = useState("");

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [resAspek, resPerusahaan] = await Promise.all([
        fetch(`${API_URL}/penilaian/aspek`),
        fetch(`${API_URL}/perusahaan`)
      ]);

      if (!resAspek.ok) throw new Error("Gagal mengambil data aspek penilaian");
      if (!resPerusahaan.ok) throw new Error("Gagal mengambil data instansi DUDI");

      const dataAspek = await resAspek.json();
      const dataPerusahaan = await resPerusahaan.json();

      setAspeks(dataAspek);
      setPerusahaans(dataPerusahaan);
    } catch (error: any) {
      toast.error(error.message || "Gagal mengambil data");
    } finally {
      setIsLoading(false);
    }
  };

  const parsedLines = nama
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const handleAddAspek = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedLines.length === 0) {
      toast.error("Silakan masukkan minimal satu aspek penilaian");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        namaList: parsedLines,
        kategori,
        perusahaanId: kategori === "HARDSKILL" && lingkup === "PERUSAHAAN" && perusahaanId ? Number(perusahaanId) : null,
      };

      const res = await fetch(`${API_URL}/penilaian/aspek/bulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Gagal menambah aspek");

      toast.success(`Berhasil menambahkan ${parsedLines.length} aspek penilaian!`);
      setNama("");
      fetchData();
    } catch (error: any) {
      Swal.fire("Gagal!", error.message || "Gagal menyimpan aspek.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAspek = async (id: number) => {
    Swal.fire({
      title: "Apakah Anda yakin?",
      text: "Aspek ini akan dihapus secara permanen beserta seluruh nilai siswa yang berkaitan dengannya.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await fetch(`${API_URL}/penilaian/aspek/${id}`, {
            method: "DELETE",
          });

          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.message || "Gagal menghapus aspek");
          }

          toast.success("Aspek penilaian berhasil dihapus");
          fetchData();
        } catch (error: any) {
          Swal.fire("Gagal!", error.message || "Gagal menghapus aspek.", "error");
        }
      }
    });
  };

  const softskills = aspeks.filter((a) => a.kategori === "SOFTSKILL");
  const hardskills = aspeks.filter((a) => a.kategori === "HARDSKILL");
  const presentasis = aspeks.filter((a) => a.kategori === "PRESENTASI");

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-smk-blue flex items-center gap-2">
          <Settings className="text-smk-orange" />
          Manajemen Aspek Penilaian Sertifikat
        </h1>
        <p className="text-slate-500 text-sm">
          Konfigurasi aspek penilaian softskill (global), hardskill (fleksibel per DUDI), dan presentasi sidang PKL.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Form Add Aspek */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-fit">
          <h3 className="font-bold text-slate-800 text-base mb-2 flex items-center gap-2">
            <Plus size={18} className="text-smk-orange" />
            Tambah Aspek Penilaian
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Bisa input 1 aspek atau banyak aspek sekaligus (pisahkan dengan <b>Enter</b>).
          </p>

          <form onSubmit={handleAddAspek} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">Daftar Aspek Penilaian</label>
                {parsedLines.length > 0 && (
                  <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                    {parsedLines.length} Aspek terdeteksi
                  </span>
                )}
              </div>
              <textarea
                rows={6}
                placeholder={`Contoh:\nIntegritas dan Kedisiplinan\nTroubleshooting & Problem Solving\nDesain UI/UX dan Tipografi\nKomunikasi & Kerjasama Tim`}
                required
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-smk-blue text-sm text-slate-800 leading-relaxed font-sans resize-y"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
              />
              <p className="text-[11px] text-slate-400 mt-1">
                💡 <i>Tip: Tempel (Paste) beberapa baris dari Excel/Word/teks untuk memasukkan banyak aspek dalam 1 klik.</i>
              </p>

              {parsedLines.length > 1 && (
                <div className="mt-2.5 p-3 bg-blue-50/70 border border-blue-200/80 rounded-lg">
                  <span className="text-[11px] font-bold text-blue-900 block mb-1.5">
                    Pratinjau Aspek yang akan dibuat ({parsedLines.length} baris):
                  </span>
                  <ol className="list-decimal list-inside space-y-1 text-xs text-slate-700 max-h-32 overflow-y-auto pr-1">
                    {parsedLines.map((line, idx) => (
                      <li key={idx} className="truncate">
                        <span className="font-medium text-slate-800">{line}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Kategori Nilai</label>
              <select
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-smk-blue text-sm bg-white text-slate-800"
                value={kategori}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setKategori(val);
                  if (val !== "HARDSKILL") setLingkup("GLOBAL");
                }}
              >
                <option value="SOFTSKILL">Softskill (Karakter & Etos Kerja)</option>
                <option value="HARDSKILL">Hardskill (Keterampilan Teknis)</option>
                <option value="PRESENTASI">Nilai Presentasi (Sidang PKL)</option>
              </select>
            </div>

            {kategori === "HARDSKILL" && (
              <div className="space-y-3 p-3 bg-slate-50 rounded-lg border border-slate-200/60">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Lingkup Aspek Hardskill</label>
                  <select
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-smk-blue text-sm bg-white text-slate-800"
                    value={lingkup}
                    onChange={(e) => setLingkup(e.target.value as any)}
                  >
                    <option value="GLOBAL">Semua Instansi (Global)</option>
                    <option value="PERUSAHAAN">Hanya Instansi DUDI Tertentu</option>
                  </select>
                </div>

                {lingkup === "PERUSAHAAN" && (
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Instansi DUDI</label>
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
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || parsedLines.length === 0}
              className="w-full py-2.5 bg-smk-blue hover:bg-smk-blue/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors text-sm flex items-center justify-center gap-1.5 shadow"
            >
              {isSubmitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Plus size={16} />
              )}
              {parsedLines.length > 1
                ? `Simpan ${parsedLines.length} Aspek Sekaligus`
                : "Tambah Aspek Penilaian"}
            </button>
          </form>
        </div>

        {/* List Aspek */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Softskill */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <span className="font-bold text-sm text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle size={16} className="text-green-500" />
                Aspek Softskill (Sama untuk Semua Siswa)
              </span>
              <span className="px-2.5 py-0.5 bg-green-50 text-green-700 text-xs font-bold rounded-full border border-green-200">
                {softskills.length} Aspek
              </span>
            </div>
            {isLoading ? (
              <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-smk-blue" /></div>
            ) : softskills.length === 0 ? (
              <p className="text-slate-400 p-5 text-center text-xs font-medium">Belum ada aspek softskill yang terdaftar.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {softskills.map((item, idx) => (
                  <li key={item.id} className="px-5 py-3 flex justify-between items-center text-sm font-medium hover:bg-slate-50/50">
                    <span className="text-slate-700">{idx + 1}. {item.nama}</span>
                    <button onClick={() => handleDeleteAspek(item.id)} className="text-rose-500 hover:text-rose-700 p-1.5 hover:bg-rose-50 rounded">
                      <Trash2 size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Hardskill */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <span className="font-bold text-sm text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Layers size={16} className="text-blue-500" />
                Aspek Hardskill (Teknis)
              </span>
              <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-200">
                {hardskills.length} Aspek
              </span>
            </div>
            {isLoading ? (
              <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-smk-blue" /></div>
            ) : hardskills.length === 0 ? (
              <p className="text-slate-400 p-5 text-center text-xs font-medium">Belum ada aspek hardskill yang terdaftar.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {hardskills.map((item, idx) => (
                  <li key={item.id} className="px-5 py-3 flex justify-between items-center text-sm font-medium hover:bg-slate-50/50">
                    <div className="space-y-0.5">
                      <div className="text-slate-700">{idx + 1}. {item.nama}</div>
                      <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                        <Building2 size={11} />
                        {item.perusahaan ? `Khusus DUDI: ${item.perusahaan.nama}` : "Berlaku untuk Semua DUDI (Global)"}
                      </div>
                    </div>
                    <button onClick={() => handleDeleteAspek(item.id)} className="text-rose-500 hover:text-rose-700 p-1.5 hover:bg-rose-50 rounded">
                      <Trash2 size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Presentasi */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <span className="font-bold text-sm text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <GraduationCap size={16} className="text-purple-500" />
                Aspek Presentasi / Sidang PKL (Sama untuk Semua Siswa)
              </span>
              <span className="px-2.5 py-0.5 bg-purple-50 text-purple-700 text-xs font-bold rounded-full border border-purple-200">
                {presentasis.length} Aspek
              </span>
            </div>
            {isLoading ? (
              <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-smk-blue" /></div>
            ) : presentasis.length === 0 ? (
              <p className="text-slate-400 p-5 text-center text-xs font-medium">Belum ada aspek presentasi yang terdaftar.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {presentasis.map((item, idx) => (
                  <li key={item.id} className="px-5 py-3 flex justify-between items-center text-sm font-medium hover:bg-slate-50/50">
                    <span className="text-slate-700">{idx + 1}. {item.nama}</span>
                    <button onClick={() => handleDeleteAspek(item.id)} className="text-rose-500 hover:text-rose-700 p-1.5 hover:bg-rose-50 rounded">
                      <Trash2 size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
