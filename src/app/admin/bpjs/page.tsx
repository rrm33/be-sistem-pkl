"use client";

import React, { useState, useEffect } from "react";
import Cookies from "js-cookie";
import Swal from "sweetalert2";
import { toast } from "sonner";
import { 
  Search, 
  CreditCard, 
  User, 
  Building2, 
  Calendar, 
  DollarSign, 
  Loader2, 
  Info, 
  Edit3, 
  CheckCircle, 
  AlertCircle 
} from "lucide-react";

interface PembayaranBpjs {
  id: number;
  siswaId: number;
  nominalTotal: number;
  status: "LUNAS" | "DICICIL" | "BELUM_BAYAR";
  cicilan1Nominal: number | null;
  cicilan1Tanggal: string | null;
  cicilan1AdminNama: string | null;
  cicilan2Nominal: number | null;
  cicilan2Tanggal: string | null;
  cicilan2AdminNama: string | null;
  cicilan3Nominal: number | null;
  cicilan3Tanggal: string | null;
  cicilan3AdminNama: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Siswa {
  id: number;
  namaLengkap: string;
  nisn: string;
  kelas: string | null;
  bpjs: string | null;
  perusahaan: {
    nama: string;
  } | null;
  pembayaranBpjs: PembayaranBpjs | null;
}

export default function BpjsPage() {
  const [siswas, setSiswas] = useState<Siswa[]>([]);
  const [kelasList, setKelasList] = useState<{ id: number; nama: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [kelasFilter, setKelasFilter] = useState("ALL");
  const [selectedSiswa, setSelectedSiswa] = useState<Siswa | null>(null);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [nominalCicilan, setNominalCicilan] = useState<number | "">("");
  const [customNominalTotal, setCustomNominalTotal] = useState<number | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [adminName, setAdminName] = useState("Admin");

  const API_URL = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/bpjs`;

  useEffect(() => {
    const name = Cookies.get("userName");
    if (name) {
      setAdminName(name);
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [resBpjs, resKelas] = await Promise.all([
        fetch(API_URL),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/kelas`)
      ]);

      if (!resBpjs.ok) throw new Error("Gagal mengambil data iuran BPJS");
      if (!resKelas.ok) throw new Error("Gagal mengambil data kelas");

      const dataBpjs = await resBpjs.json();
      const dataKelas = await resKelas.json();

      setSiswas(dataBpjs);
      setKelasList(dataKelas);
    } catch (error: any) {
      toast.error(error.message || "Gagal mengambil data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenBayar = (siswa: Siswa) => {
    setSelectedSiswa(siswa);
    setNominalCicilan("");
    setIsConfigOpen(false);
    setIsModalOpen(true);
  };

  const handleSaveBayar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSiswa || nominalCicilan === "" || nominalCicilan <= 0) {
      toast.error("Masukkan nominal cicilan yang valid");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/${selectedSiswa.id}/bayar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nominal: Number(nominalCicilan),
          adminNama: adminName,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || "Gagal menyimpan pembayaran");
      }

      Swal.fire({
        title: "Berhasil!",
        text: "Pembayaran iuran BPJS berhasil dicatat.",
        icon: "success",
        confirmButtonColor: "#1C587A",
      });

      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      Swal.fire({
        title: "Gagal!",
        text: error.message || "Terjadi kesalahan saat menyimpan pembayaran.",
        icon: "error",
        confirmButtonColor: "#1C587A",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSiswa || customNominalTotal === "" || customNominalTotal < 0) {
      toast.error("Masukkan total tagihan yang valid");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/${selectedSiswa.id}/config`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nominalTotal: Number(customNominalTotal),
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || "Gagal merubah total tagihan");
      }

      toast.success("Total tagihan BPJS berhasil diperbarui");
      
      // Update selectedSiswa state to reflect configuration change instantly in modal
      const updatedSiswa = { ...selectedSiswa };
      if (updatedSiswa.pembayaranBpjs) {
        updatedSiswa.pembayaranBpjs.nominalTotal = Number(customNominalTotal);
      } else {
        updatedSiswa.pembayaranBpjs = {
          id: result.id,
          siswaId: selectedSiswa.id,
          nominalTotal: Number(customNominalTotal),
          status: result.status,
          cicilan1Nominal: null,
          cicilan1Tanggal: null,
          cicilan1AdminNama: null,
          cicilan2Nominal: null,
          cicilan2Tanggal: null,
          cicilan2AdminNama: null,
          cicilan3Nominal: null,
          cicilan3Tanggal: null,
          cicilan3AdminNama: null,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt,
        };
      }
      setSelectedSiswa(updatedSiswa);
      setIsConfigOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Gagal menyimpan total tagihan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditCicilan = async (cicilanKe: number, currentNominal: number) => {
    if (!selectedSiswa) return;
    
    const { value: newNominal } = await Swal.fire({
      title: `Ubah Nominal Cicilan ${cicilanKe}`,
      input: "number",
      inputLabel: "Masukkan nominal baru (masukkan 0 untuk menghapus cicilan ini):",
      inputValue: currentNominal,
      showCancelButton: true,
      confirmButtonColor: "#1C587A",
      cancelButtonColor: "#d33",
      confirmButtonText: "Simpan",
      cancelButtonText: "Batal",
      inputValidator: (value) => {
        if (!value || Number(value) < 0) {
          return "Nominal tidak boleh negatif!";
        }
      }
    });

    if (newNominal !== undefined) {
      setIsSubmitting(true);
      try {
        const res = await fetch(`${API_URL}/${selectedSiswa.id}/cicilan`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            cicilanKe,
            nominal: Number(newNominal),
            adminNama: adminName,
          }),
        });

        const result = await res.json();
        if (!res.ok) {
          throw new Error(result.message || "Gagal mengubah nominal cicilan");
        }

        Swal.fire({
          title: "Berhasil!",
          text: "Nominal cicilan berhasil diubah.",
          icon: "success",
          confirmButtonColor: "#1C587A",
        });

        // Update selectedSiswa state to reflect configuration change instantly in modal
        const updatedSiswa = { ...selectedSiswa };
        updatedSiswa.pembayaranBpjs = result;
        setSelectedSiswa(updatedSiswa);
        fetchData();
      } catch (error: any) {
        Swal.fire({
          title: "Gagal!",
          text: error.message || "Terjadi kesalahan saat mengubah nominal cicilan.",
          icon: "error",
          confirmButtonColor: "#1C587A",
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const getStatusBadge = (status: "LUNAS" | "DICICIL" | "BELUM_BAYAR" | undefined) => {
    switch (status) {
      case "LUNAS":
        return (
          <span className="px-2.5 py-1 text-xs font-bold bg-green-50 text-green-700 border border-green-200 rounded-full flex items-center gap-1 w-fit">
            <CheckCircle size={12} /> LUNAS
          </span>
        );
      case "DICICIL":
        return (
          <span className="px-2.5 py-1 text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-full flex items-center gap-1 w-fit">
            <Info size={12} /> DICICIL
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 rounded-full flex items-center gap-1 w-fit">
            <AlertCircle size={12} /> BELUM BAYAR
          </span>
        );
    }
  };

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatTanggal = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  // Filter logic
  const filteredSiswas = siswas.filter((s) => {
    const matchesSearch = 
      s.namaLengkap.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.nisn.includes(searchQuery) ||
      (s.kelas && s.kelas.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.perusahaan && s.perusahaan.nama.toLowerCase().includes(searchQuery.toLowerCase()));

    const status = s.pembayaranBpjs?.status || "BELUM_BAYAR";
    const matchesStatus = statusFilter === "ALL" || status === statusFilter;

    const matchesKelas = kelasFilter === "ALL" || (s.kelas && s.kelas === kelasFilter);

    return matchesSearch && matchesStatus && matchesKelas;
  });

  // Calculate statistics
  const stats = {
    total: siswas.length,
    lunas: siswas.filter((s) => s.pembayaranBpjs?.status === "LUNAS").length,
    dicicil: siswas.filter((s) => s.pembayaranBpjs?.status === "DICICIL").length,
    belumBayar: siswas.filter((s) => !s.pembayaranBpjs || s.pembayaranBpjs.status === "BELUM_BAYAR").length,
  };

  // Helpers for calculations inside modal
  const getInstallmentCount = (pembayaran: PembayaranBpjs | null) => {
    if (!pembayaran) return 0;
    let count = 0;
    if (pembayaran.cicilan1Nominal !== null) count++;
    if (pembayaran.cicilan2Nominal !== null) count++;
    if (pembayaran.cicilan3Nominal !== null) count++;
    return count;
  };

  const getTotalPaid = (pembayaran: PembayaranBpjs | null) => {
    if (!pembayaran) return 0;
    return (
      (pembayaran.cicilan1Nominal || 0) +
      (pembayaran.cicilan2Nominal || 0) +
      (pembayaran.cicilan3Nominal || 0)
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-smk-blue flex items-center gap-2">
            <CreditCard className="text-smk-orange" />
            Pembayaran Iuran BPJS Siswa
          </h1>
          <p className="text-slate-500 text-sm">
            Manajemen dan pencatatan iuran jaminan sosial BPJS Ketenagakerjaan siswa magang PKL.
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
            <div className="text-xs font-semibold text-slate-400 uppercase">Siswa Terdaftar</div>
            <div className="text-lg font-bold text-slate-700">Semua Siswa</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-green-50 text-green-700 rounded-lg flex items-center justify-center font-bold border border-green-100">
            {stats.lunas}
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase">Status Lunas</div>
            <div className="text-lg font-bold text-green-700">Lunas</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-700 rounded-lg flex items-center justify-center font-bold border border-blue-100">
            {stats.dicicil}
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase">Status Cicil</div>
            <div className="text-lg font-bold text-blue-700">Dicicil</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-50 text-rose-700 rounded-lg flex items-center justify-center font-bold border border-rose-100">
            {stats.belumBayar}
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase">Belum Bayar</div>
            <div className="text-lg font-bold text-rose-700">Belum Bayar</div>
          </div>
        </div>
      </div>

      {/* Controls / Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
            <Search size={18} />
          </span>
          <input
            type="text"
            placeholder="Cari nama, NISN, kelas, atau DUDI..."
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
              <option value="LUNAS">Lunas</option>
              <option value="DICICIL">Dicicil</option>
              <option value="BELUM_BAYAR">Belum Bayar</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-10 h-10 text-smk-blue animate-spin" />
            <p className="text-slate-500 text-sm font-semibold">Memuat data iuran...</p>
          </div>
        ) : filteredSiswas.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-400 font-medium">Tidak ada data siswa yang cocok dengan filter pencarian.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-slate-400 font-bold text-xs uppercase border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-semibold text-center w-16">No</th>
                  <th className="px-6 py-4 font-semibold">Nama Lengkap / NISN</th>
                  <th className="px-6 py-4 font-semibold">Kelas</th>
                  <th className="px-6 py-4 font-semibold">Instansi PKL</th>
                  <th className="px-6 py-4 font-semibold">No. BPJS</th>
                  <th className="px-6 py-4 font-semibold">Total Tagihan</th>
                  <th className="px-6 py-4 font-semibold">Terbayar</th>
                  <th className="px-6 py-4 font-semibold">Sisa</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSiswas.map((siswa, idx) => {
                  const bpjsData = siswa.pembayaranBpjs;
                  const total = bpjsData?.nominalTotal ?? 50000;
                  const terbayar = getTotalPaid(bpjsData);
                  const sisa = Math.max(0, total - terbayar);
                  const status = bpjsData?.status || "BELUM_BAYAR";

                  return (
                    <tr key={siswa.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4.5 text-center text-slate-400 font-medium">{idx + 1}</td>
                      <td className="px-6 py-4.5">
                        <div className="font-bold text-slate-800 leading-tight">{siswa.namaLengkap}</div>
                        <div className="text-xs text-slate-400 mt-1 font-mono">{siswa.nisn}</div>
                      </td>
                      <td className="px-6 py-4.5 font-medium text-slate-600">{siswa.kelas || "-"}</td>
                      <td className="px-6 py-4.5">
                        {siswa.perusahaan ? (
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <Building2 size={14} className="text-slate-400 shrink-0" />
                            <span className="font-semibold">{siswa.perusahaan.nama}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-medium italic">Belum di-plot</span>
                        )}
                      </td>
                      <td className="px-6 py-4.5 font-mono text-slate-600">{siswa.bpjs || "-"}</td>
                      <td className="px-6 py-4.5 font-semibold text-slate-700">{formatRupiah(total)}</td>
                      <td className="px-6 py-4.5 font-semibold text-green-600">{formatRupiah(terbayar)}</td>
                      <td className="px-6 py-4.5 font-semibold text-rose-600">{formatRupiah(sisa)}</td>
                      <td className="px-6 py-4.5">{getStatusBadge(status)}</td>
                      <td className="px-6 py-4.5 text-center">
                        <button
                          onClick={() => handleOpenBayar(siswa)}
                          className="px-3.5 py-1.5 bg-smk-blue text-white font-bold rounded-lg hover:bg-smk-blue/90 transition-all text-xs shadow-sm flex items-center gap-1.5 mx-auto"
                        >
                          <CreditCard size={13} />
                          Detail & Bayar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Main Payment Modal */}
      {isModalOpen && selectedSiswa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-2xl border border-slate-200 shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-slate-100 flex justify-between items-center bg-smk-blue text-white rounded-t-2xl">
              <div>
                <h3 className="font-bold text-lg">Catat Pembayaran BPJS</h3>
                <p className="text-xs text-blue-100 mt-0.5">Siswa: {selectedSiswa.namaLengkap}</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/80 hover:text-white transition-colors p-1"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Siswa Metadata Info */}
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block font-semibold uppercase">NISN / Kelas</span>
                  <span className="font-bold text-slate-700">{selectedSiswa.nisn} / {selectedSiswa.kelas || "-"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold uppercase">Tempat PKL</span>
                  <span className="font-bold text-slate-700 flex items-center gap-1">
                    <Building2 size={11} className="text-slate-400 shrink-0" />
                    {selectedSiswa.perusahaan?.nama || "-"}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block font-semibold uppercase">No. Kartu BPJS</span>
                  <span className="font-mono font-bold text-slate-700 bg-slate-200/50 px-2 py-0.5 rounded w-fit block mt-0.5">
                    {selectedSiswa.bpjs || "Belum Mengisi No BPJS"}
                  </span>
                </div>
              </div>

              {/* Tagihan Summary Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-bold text-slate-800">Ringkasan Tagihan</span>
                  <button
                    onClick={() => {
                      setCustomNominalTotal(selectedSiswa.pembayaranBpjs?.nominalTotal ?? 50000);
                      setIsConfigOpen(!isConfigOpen);
                    }}
                    className="text-xs font-bold text-smk-blue flex items-center gap-1 hover:underline"
                  >
                    <Edit3 size={11} />
                    Ubah Nominal Tagihan
                  </button>
                </div>

                {isConfigOpen ? (
                  <form onSubmit={handleSaveConfig} className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex items-end gap-2 mb-3">
                    <div className="flex-1">
                      <label className="text-xs text-slate-500 font-bold block mb-1">Set Total Tagihan BPJS</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 text-xs font-bold">Rp</span>
                        <input
                          type="number"
                          placeholder="Contoh: 50000"
                          className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-smk-blue text-sm text-slate-800"
                          value={customNominalTotal}
                          onChange={(e) => setCustomNominalTotal(e.target.value !== "" ? Number(e.target.value) : "")}
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-3.5 py-2 bg-smk-orange hover:bg-smk-orange/90 text-white text-xs font-bold rounded-lg transition-colors"
                    >
                      Update
                    </button>
                  </form>
                ) : null}

                <div className="grid grid-cols-3 gap-2 text-center text-xs mt-2 border-t border-slate-100 pt-3">
                  <div className="border-r border-slate-100">
                    <div className="text-slate-400 mb-0.5">Total Tagihan</div>
                    <div className="font-bold text-slate-800 text-sm">
                      {formatRupiah(selectedSiswa.pembayaranBpjs?.nominalTotal ?? 50000)}
                    </div>
                  </div>
                  <div className="border-r border-slate-100">
                    <div className="text-slate-400 mb-0.5">Total Terbayar</div>
                    <div className="font-bold text-green-600 text-sm">
                      {formatRupiah(getTotalPaid(selectedSiswa.pembayaranBpjs))}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 mb-0.5">Sisa Tagihan</div>
                    <div className="font-bold text-rose-600 text-sm">
                      {formatRupiah(
                        Math.max(
                          0,
                          (selectedSiswa.pembayaranBpjs?.nominalTotal ?? 50000) -
                            getTotalPaid(selectedSiswa.pembayaranBpjs)
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* History Cicilan (Maksimal 3x) */}
              <div className="space-y-3">
                <span className="text-sm font-bold text-slate-800 block">Riwayat Transaksi Cicilan (Maksimal 3x)</span>

                <div className="space-y-2.5">
                  {/* Cicilan 1 */}
                  <div className="border border-slate-200 rounded-xl p-3.5 flex justify-between items-center bg-white shadow-sm">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-bold text-[10px] rounded-full border border-slate-200">
                          Cicilan 1
                        </span>
                        {selectedSiswa.pembayaranBpjs?.cicilan1Nominal !== null && (
                          <span className="text-xs text-slate-400 font-medium">
                            Dicatat oleh: <strong className="text-slate-600">{selectedSiswa.pembayaranBpjs?.cicilan1AdminNama}</strong>
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                        <Calendar size={11} />
                        {formatTanggal(selectedSiswa.pembayaranBpjs?.cicilan1Tanggal ?? null)}
                      </div>
                    </div>
                    <div className="text-right">
                      {selectedSiswa.pembayaranBpjs?.cicilan1Nominal !== null ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditCicilan(1, selectedSiswa.pembayaranBpjs?.cicilan1Nominal || 0)}
                            className="p-1 hover:bg-slate-100 text-slate-400 hover:text-smk-blue rounded transition-colors"
                            title="Ubah nominal"
                          >
                            <Edit3 size={13} />
                          </button>
                          <span className="text-sm font-bold text-slate-700 bg-slate-50 px-3 py-1 rounded-lg border border-slate-150 block">
                            {formatRupiah(selectedSiswa.pembayaranBpjs?.cicilan1Nominal || 0)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic font-medium">Belum ada pembayaran</span>
                      )}
                    </div>
                  </div>

                  {/* Cicilan 2 */}
                  <div className="border border-slate-200 rounded-xl p-3.5 flex justify-between items-center bg-white shadow-sm">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-bold text-[10px] rounded-full border border-slate-200">
                          Cicilan 2
                        </span>
                        {selectedSiswa.pembayaranBpjs?.cicilan2Nominal !== null && (
                          <span className="text-xs text-slate-400 font-medium">
                            Dicatat oleh: <strong className="text-slate-600">{selectedSiswa.pembayaranBpjs?.cicilan2AdminNama}</strong>
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                        <Calendar size={11} />
                        {formatTanggal(selectedSiswa.pembayaranBpjs?.cicilan2Tanggal ?? null)}
                      </div>
                    </div>
                    <div className="text-right">
                      {selectedSiswa.pembayaranBpjs?.cicilan2Nominal !== null ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditCicilan(2, selectedSiswa.pembayaranBpjs?.cicilan2Nominal || 0)}
                            className="p-1 hover:bg-slate-100 text-slate-400 hover:text-smk-blue rounded transition-colors"
                            title="Ubah nominal"
                          >
                            <Edit3 size={13} />
                          </button>
                          <span className="text-sm font-bold text-slate-700 bg-slate-50 px-3 py-1 rounded-lg border border-slate-150 block">
                            {formatRupiah(selectedSiswa.pembayaranBpjs?.cicilan2Nominal || 0)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic font-medium">Belum ada pembayaran</span>
                      )}
                    </div>
                  </div>

                  {/* Cicilan 3 */}
                  <div className="border border-slate-200 rounded-xl p-3.5 flex justify-between items-center bg-white shadow-sm">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-bold text-[10px] rounded-full border border-slate-200">
                          Cicilan 3
                        </span>
                        {selectedSiswa.pembayaranBpjs?.cicilan3Nominal !== null && (
                          <span className="text-xs text-slate-400 font-medium">
                            Dicatat oleh: <strong className="text-slate-600">{selectedSiswa.pembayaranBpjs?.cicilan3AdminNama}</strong>
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                        <Calendar size={11} />
                        {formatTanggal(selectedSiswa.pembayaranBpjs?.cicilan3Tanggal ?? null)}
                      </div>
                    </div>
                    <div className="text-right">
                      {selectedSiswa.pembayaranBpjs?.cicilan3Nominal !== null ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditCicilan(3, selectedSiswa.pembayaranBpjs?.cicilan3Nominal || 0)}
                            className="p-1 hover:bg-slate-100 text-slate-400 hover:text-smk-blue rounded transition-colors"
                            title="Ubah nominal"
                          >
                            <Edit3 size={13} />
                          </button>
                          <span className="text-sm font-bold text-slate-700 bg-slate-50 px-3 py-1 rounded-lg border border-slate-150 block">
                            {formatRupiah(selectedSiswa.pembayaranBpjs?.cicilan3Nominal || 0)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic font-medium">Belum ada pembayaran</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Input Pembayaran baru */}
              {selectedSiswa.pembayaranBpjs?.status !== "LUNAS" && getInstallmentCount(selectedSiswa.pembayaranBpjs) < 3 ? (
                <form onSubmit={handleSaveBayar} className="border-t border-slate-100 pt-5 space-y-4">
                  <span className="text-sm font-bold text-slate-800 block">Form Input Pembayaran Cicilan Baru</span>

                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">Nominal Pembayaran</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 font-bold">Rp</span>
                      <input
                        type="number"
                        required
                        placeholder="Masukkan nominal uang, misal 20000"
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-smk-blue text-sm text-slate-800"
                        value={nominalCicilan}
                        onChange={(e) => setNominalCicilan(e.target.value !== "" ? Number(e.target.value) : "")}
                      />
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3.5 text-xs flex gap-2.5">
                    <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Pemberitahuan Audit Transaksi</span>
                      <span className="text-slate-600">
                        Pembayaran akan dicatat sebagai <strong>Cicilan Ke-{getInstallmentCount(selectedSiswa.pembayaranBpjs) + 1}</strong>.
                        Sistem mencatat tanggal-waktu pembayaran secara otomatis serta operator admin yang menginput (<strong>{adminName}</strong>).
                      </span>
                    </div>
                  </div>

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
                      Simpan Pembayaran
                    </button>
                  </div>
                </form>
              ) : (
                <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-4 text-xs flex gap-2.5 items-center">
                  <CheckCircle size={20} className="text-green-600 shrink-0" />
                  <div>
                    <span className="font-bold block">Penyetoran Selesai / Terkunci</span>
                    <span className="text-slate-600">
                      Siswa ini telah melunasi tagihannya atau batas maksimal cicilan 3x sudah tercapai. Form transaksi baru dinonaktifkan.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
