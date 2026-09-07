"use client";

import React, { useState, useEffect, useRef } from "react";
import Cookies from "js-cookie";
import Swal from "sweetalert2";
import { toast } from "sonner";
import { 
  Search, 
  Printer, 
  Trash2, 
  Loader2, 
  FileText, 
  Calendar, 
  Building2, 
  FileCheck,
  Upload,
  Eye,
  Plus,
  ArrowRightLeft,
  Inbox,
  Send,
  Edit3,
  CheckCircle,
  X,
  Save
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Guru {
  id: number;
  namaLengkap: string;
  nip: string;
  perusahaanNego?: { id: number; nama: string; alamat?: string; alamatLengkap?: string }[];
}

interface Siswa {
  id: number;
  namaLengkap: string;
  kelas: string;
}

interface Perusahaan {
  id: number;
  nama: string;
  alamat: string | null;
  pembimbing: string | null;
  guruPembimbingId: number | null;
  guruPembimbing?: Guru | null;
  guruNegoId: number | null;
  guruNego?: Guru | null;
  siswaMagang: Siswa[];
}

interface SiswaBrief {
  namaLengkap: string;
  nisn: string;
  kelas: string | null;
}

interface SuratTugas {
  id: number;
  noSurat: string;
  tipe: "PENGAJUAN_PKL" | "NEGO_DUDI" | "PENGANTARAN" | "MONITORING_1" | "MONITORING_2" | "PENJEMPUTAN" | "PENYERAHAN";
  guruId: number;
  perusahaanId: number;
  tanggalTugas: string;
  tanggalSelesai?: string | null;
  tanggalSurat?: string | null;
  keterangan: string | null;
  scanFile?: string | null;
  createdAt: string;
  updatedAt: string;
  guru: {
    id?: number;
    namaLengkap: string;
    nip: string;
    perusahaanNego?: { id: number; nama: string; alamat?: string; alamatLengkap?: string }[];
  };
  perusahaan: {
    nama: string;
    alamat: string | null;
    siswaMagang?: SiswaBrief[];
  };
  siswaList?: SiswaBrief[];
}

interface SuratMasuk {
  id: number;
  noSurat: string;
  pengirim: string;
  perihal: string;
  tanggalMasuk: string;
  scanFile?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SuratCustom {
  id: number;
  noSurat: string;
  tanggalSurat: string;
  perihal: string;
  tujuan: string;
  alamatTujuan?: string | null;
  isiSurat: string;
  namaPenandatangan: string;
  nipPenandatangan?: string | null;
  pangkatPenandatangan?: string | null;
  scanFile?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SuratKeluarManual {
  id: number;
  noSurat: string;
  penerima: string;
  perihal: string;
  tanggalKeluar: string;
  scanFile?: string | null;
  createdAt: string;
  updatedAt: string;
}

type MainTabType = "SURAT_KELUAR" | "SURAT_MASUK";
type OutgoingTabType = "PENGAJUAN_PKL" | "NEGO_DUDI" | "PENGANTARAN" | "PENYERAHAN" | "MONITORING_1" | "MONITORING_2" | "PENJEMPUTAN" | "MANUAL" | "CUSTOM";

export default function SuratTugasPage() {
  // Main view state
  const [mainTab, setMainTab] = useState<MainTabType>("SURAT_KELUAR");
  const [outgoingTab, setOutgoingTab] = useState<OutgoingTabType>("PENGAJUAN_PKL");
  
  // Data lists
  const [letters, setLetters] = useState<SuratTugas[]>([]);
  const [inboundLetters, setInboundLetters] = useState<SuratMasuk[]>([]);
  const [customLetters, setCustomLetters] = useState<SuratCustom[]>([]);
  const [manualLetters, setManualLetters] = useState<SuratKeluarManual[]>([]);
  const [perusahaans, setPerusahaans] = useState<Perusahaan[]>([]);
  const [gurus, setGurus] = useState<Guru[]>([]);
  
  // General configurations
  const [pengaturan, setPengaturan] = useState<any>(null);
  const [lastLetters, setLastLetters] = useState<{ lastOutgoing: string | null; lastIncoming: string | null }>({
    lastOutgoing: null,
    lastIncoming: null,
  });
  
  // App UI states
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isSingleModalOpen, setIsSingleModalOpen] = useState(false);
  const [selectedPlotId, setSelectedPlotId] = useState("");

  // Outgoing letter format & sequence state (Global Configuration Panel)
  const [formatSuratTugas, setFormatSuratTugas] = useState("094/xxx/101.6.5.19/" + new Date().getFullYear());
  const [formatSuratKeluar, setFormatSuratKeluar] = useState("400.3/xxx/101.6.5.24/" + new Date().getFullYear());
  const [isSavingFormat, setIsSavingFormat] = useState(false);
  const [nomorSuratSeq, setNomorSuratSeq] = useState("1");
  const [tanggalSurat, setTanggalSurat] = useState(new Date().toISOString().split("T")[0]);
  const [tanggalTugas, setTanggalTugas] = useState(new Date().toISOString().split("T")[0]);
  const [tanggalSelesai, setTanggalSelesai] = useState(new Date().toISOString().split("T")[0]);
  const [keterangan, setKeterangan] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Surat Tugas Modal states
  const [isEditTugasModalOpen, setIsEditTugasModalOpen] = useState(false);
  const [editingTugasId, setEditingTugasId] = useState<number | null>(null);
  const [editNoSurat, setEditNoSurat] = useState("");
  const [editTanggalSurat, setEditTanggalSurat] = useState("");
  const [editTanggalTugas, setEditTanggalTugas] = useState("");
  const [editTanggalSelesai, setEditTanggalSelesai] = useState("");
  const [editGuruId, setEditGuruId] = useState("");
  const [editPerusahaanId, setEditPerusahaanId] = useState("");
  const [editKeterangan, setEditKeterangan] = useState("");

  // Incoming form states
  const [inboundNoSurat, setInboundNoSurat] = useState("");
  const [inboundPengirim, setInboundPengirim] = useState("");
  const [inboundPerihal, setInboundPerihal] = useState("");
  const [inboundTanggalMasuk, setInboundTanggalMasuk] = useState(new Date().toISOString().split("T")[0]);
  const [inboundFile, setInboundFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual outgoing form states
  const [manualNoSurat, setManualNoSurat] = useState("");
  const [manualPenerima, setManualPenerima] = useState("");
  const [manualPerihal, setManualPerihal] = useState("");
  const [manualTanggalKeluar, setManualTanggalKeluar] = useState(new Date().toISOString().split("T")[0]);
  const [manualFile, setManualFile] = useState<File | null>(null);
  const manualFileInputRef = useRef<HTMLInputElement>(null);
  const [editingManualId, setEditingManualId] = useState<number | null>(null);
  const [isEditManualModalOpen, setIsEditManualModalOpen] = useState(false);
  const [editManualNoSurat, setEditManualNoSurat] = useState("");
  const [editManualPenerima, setEditManualPenerima] = useState("");
  const [editManualPerihal, setEditManualPerihal] = useState("");
  const [editManualTanggalKeluar, setEditManualTanggalKeluar] = useState("");

  // Custom letter form states
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [customId, setCustomId] = useState<number | null>(null); // For edit
  const [customNoSuratFormat, setCustomNoSuratFormat] = useState("005/xxx/411.201.206.6/" + new Date().getFullYear());
  const [customNomorSuratSeq, setCustomNomorSuratSeq] = useState("1");
  const [customTanggalSurat, setCustomTanggalSurat] = useState(new Date().toISOString().split("T")[0]);
  const [customPerihal, setCustomPerihal] = useState("");
  const [customTujuan, setCustomTujuan] = useState("");
  const [customAlamatTujuan, setCustomAlamatTujuan] = useState("");
  const [customIsiSurat, setCustomIsiSurat] = useState("");
  const [customNamaPenandatangan, setCustomNamaPenandatangan] = useState("");
  const [customNipPenandatangan, setCustomNipPenandatangan] = useState("");
  const [customPangkatPenandatangan, setCustomPangkatPenandatangan] = useState("");

  // WYSIWYG Visual Editor Preview states
  const [isVisualEditorOpen, setIsVisualEditorOpen] = useState(false);
  const [editingCustomLetter, setEditingCustomLetter] = useState<SuratCustom | null>(null);
  const [isSavingVisual, setIsSavingVisual] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
  const logoUrl = "/logo_jatim.png";
  const namaKepsek = pengaturan?.namaKepalaSekolah || "Evi Silviana, S.Pd,M.M";
  const nipKepsek = pengaturan?.nipKepalaSekolah || "19750527 199903 2 005";
  const pangkatKepsek = pengaturan?.pangkatKepalaSekolah || "Pembina Utama Muda";

  const isSuratTugasTab = (tab: OutgoingTabType) => {
    return tab === "NEGO_DUDI" || tab === "PENGANTARAN" || tab === "MONITORING_1" || tab === "MONITORING_2" || tab === "PENJEMPUTAN";
  };

  const getTabLabel = (tab: OutgoingTabType) => {
    switch (tab) {
      case "PENGAJUAN_PKL": return "1. Surat Pengajuan PKL";
      case "NEGO_DUDI": return "2. Surat Tugas Nego";
      case "PENGANTARAN": return "3. Surat Tugas Pemberangkatan";
      case "PENYERAHAN": return "4. Surat Penyerahan";
      case "MONITORING_1": return "5. Surat Tugas Monitoring 1";
      case "MONITORING_2": return "6. Surat Tugas Monitoring 2";
      case "PENJEMPUTAN": return "7. Surat Tugas Penarikan";
      case "MANUAL": return "8. Surat Keluar Manual";
      case "CUSTOM": return "9. Surat Custom";
    }
  };

  const activeNoSuratFormat = isSuratTugasTab(outgoingTab) ? formatSuratTugas : formatSuratKeluar;

  const handleSaveFormat = async () => {
    setIsSavingFormat(true);
    try {
      const res = await fetch(`${API_URL}/siswa/pengaturan-umum`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formatNomorSuratTugas: formatSuratTugas.trim(),
          formatNomorSuratKeluar: formatSuratKeluar.trim(),
        }),
      });
      if (!res.ok) throw new Error("Gagal menyimpan format nomor surat");
      const savedConfig = await res.json();
      setPengaturan(savedConfig);
      if (savedConfig.formatNomorSuratTugas) setFormatSuratTugas(savedConfig.formatNomorSuratTugas);
      if (savedConfig.formatNomorSuratKeluar) setFormatSuratKeluar(savedConfig.formatNomorSuratKeluar);
      toast.success("Format nomor surat tugas & surat keluar berhasil disimpan!");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan format");
    } finally {
      setIsSavingFormat(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [mainTab, outgoingTab]);

  const isRangeTab = (tab: OutgoingTabType) => {
    return tab === "PENGAJUAN_PKL" || tab === "MONITORING_1" || tab === "MONITORING_2" || tab === "PENYERAHAN";
  };

  const extractSeqFromNoSurat = (noSurat: string | null, formatTemplate?: string): string => {
    if (!noSurat || noSurat.includes("xxx") || noSurat.includes("XXX")) return "-";
    
    // 1. If formatTemplate is provided and contains xxx, match by segment index
    if (formatTemplate && (formatTemplate.includes("xxx") || formatTemplate.includes("XXX"))) {
      const formatParts = formatTemplate.split("/");
      const xxxIdx = formatParts.findIndex(p => p.toLowerCase() === "xxx");
      if (xxxIdx !== -1) {
        const noParts = noSurat.split("/");
        if (noParts.length === formatParts.length && noParts[xxxIdx]) {
          return noParts[xxxIdx];
        }
      }
    }

    // 2. Generic robust parsing
    const parts = noSurat.split("/");
    if (parts.length >= 2) {
      for (let i = 1; i < parts.length; i++) {
        const p = parts[i].trim();
        if (/^\d+$/.test(p)) {
          if (i === parts.length - 1 && p.length === 4 && Number(p) >= 2020) {
            continue;
          }
          return p;
        }
      }
    }

    return noSurat;
  };

  const parseFormatAndSeq = (lastNo: string | null, fallbackNum: number, defaultPrefix: string = "800") => {
    if (!lastNo) {
      return {
        format: `${defaultPrefix}/xxx/411.201.206.6/${new Date().getFullYear()}`,
        seq: fallbackNum
      };
    }
    const parts = lastNo.split("/");
    if (parts.length >= 2) {
      for (let i = 1; i < parts.length; i++) {
        const p = parts[i].trim();
        if (/^\d+$/.test(p)) {
          if (i === parts.length - 1 && p.length === 4 && Number(p) >= 2020) {
            continue;
          }
          const seq = parseInt(p, 10) + 1;
          const formatParts = [...parts];
          formatParts[i] = "xxx";
          return {
            format: formatParts.join("/"),
            seq: seq
          };
        }
      }
    }
    return {
      format: `${defaultPrefix}/xxx/411.201.206.6/${new Date().getFullYear()}`,
      seq: fallbackNum
    };
  };

  const getBase64Image = async (url: string): Promise<string> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.warn("Gagal convert gambar ke base64:", err);
      return '';
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch general settings & last letters for global consistency
      const [resConfig, resLast] = await Promise.all([
        fetch(`${API_URL}/siswa/pengaturan-umum`),
        fetch(`${API_URL}/surat-masuk/last-letter`),
      ]);

      let dataConfig: any = null;
      if (resConfig.ok) {
        dataConfig = await resConfig.json();
        setPengaturan(dataConfig);
        if (dataConfig.formatNomorSuratTugas) {
          setFormatSuratTugas(dataConfig.formatNomorSuratTugas);
        }
        if (dataConfig.formatNomorSuratKeluar) {
          setFormatSuratKeluar(dataConfig.formatNomorSuratKeluar);
        }
      }

      let dataLast: any = null;
      if (resLast.ok) {
        dataLast = await resLast.json();
        setLastLetters(dataLast);
      }

      if (mainTab === "SURAT_KELUAR") {
        if (outgoingTab === "CUSTOM") {
          const resCustom = await fetch(`${API_URL}/surat-custom`);
          if (!resCustom.ok) throw new Error("Gagal mengambil data surat custom");
          const dataCustom = await resCustom.json();
          setCustomLetters(dataCustom);

          if (dataLast) {
            const parsed = parseFormatAndSeq(dataLast.lastOutgoing, dataCustom.length + 1, "005");
            setCustomNoSuratFormat(parsed.format);
            setCustomNomorSuratSeq(parsed.seq.toString());
          }
        } else if (outgoingTab === "MANUAL") {
          const resManual = await fetch(`${API_URL}/surat-keluar-manual`);
          if (!resManual.ok) throw new Error("Gagal mengambil data surat keluar manual");
          const dataManual = await resManual.json();
          setManualLetters(dataManual);
        } else {
          const [resLetters, resPerusahaans, resGurus] = await Promise.all([
            fetch(`${API_URL}/surat-tugas?tipe=${outgoingTab}`),
            fetch(`${API_URL}/perusahaan`),
            fetch(`${API_URL}/guru-pembimbing`),
          ]);

          if (!resLetters.ok) throw new Error("Gagal mengambil data surat tugas");
          if (!resPerusahaans.ok) throw new Error("Gagal mengambil data instansi DUDI");
          if (!resGurus.ok) throw new Error("Gagal mengambil data guru pembimbing");

          const dataLetters = await resLetters.json();
          const dataPerusahaans = await resPerusahaans.json();
          const dataGurus = await resGurus.json();

          if (dataLast) {
            const activeFmt = isSuratTugasTab(outgoingTab)
              ? (dataConfig?.formatNomorSuratTugas || formatSuratTugas)
              : (dataConfig?.formatNomorSuratKeluar || formatSuratKeluar);
            const lastSeqStr = extractSeqFromNoSurat(dataLast.lastOutgoing, activeFmt);
            if (lastSeqStr !== "-" && !isNaN(Number(lastSeqStr))) {
              setNomorSuratSeq((parseInt(lastSeqStr, 10) + 1).toString());
            } else {
              setNomorSuratSeq((dataLetters.length + 1).toString());
            }
          }

          setLetters(dataLetters);
          setPerusahaans(dataPerusahaans);
          setGurus(dataGurus);
        }
      } else {
        const resInbound = await fetch(`${API_URL}/surat-masuk`);
        if (!resInbound.ok) throw new Error("Gagal mengambil data surat masuk");
        const dataInbound = await resInbound.json();
        setInboundLetters(dataInbound);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Gagal memuat data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeNoSuratFormat.trim() || !nomorSuratSeq.trim() || !tanggalTugas || !tanggalSurat) {
      toast.error("Format Nomor Surat, No. Mulai, Tanggal Pelaksanaan, dan Tanggal Surat wajib diisi");
      return;
    }

    if (outgoingTab === "NEGO_DUDI") {
      if (activeGuruNegoList.length === 0) {
        toast.error("Tidak ada guru yang memiliki plotingan negosiasi DUDI.");
        return;
      }

      const confirmRes = await Swal.fire({
        title: "Generate Masal Surat Tugas Nego?",
        text: `Apakah Anda yakin ingin memproses generate Surat Tugas Nego masal untuk ${activeGuruNegoList.length} guru negosiasi (${unGeneratedGuruNego.length} belum terbit)? Setiap guru akan diterbitkan 1 surat tugas yang merangkum seluruh DUDI tugasnya.`,
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Ya, Generate!",
        cancelButtonText: "Batal",
      });

      if (!confirmRes.isConfirmed) return;

      setIsSubmitting(true);
      try {
        const payload = {
          noSurat: activeNoSuratFormat.trim(),
          tipe: "NEGO_DUDI",
          tanggalTugas,
          tanggalSurat,
          keterangan: keterangan.trim() || undefined,
          startingNumber: parseInt(nomorSuratSeq, 10),
        };

        const res = await fetch(`${API_URL}/surat-tugas/bulk`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.message || "Gagal melakukan generate masal");

        toast.success(`Berhasil membuat ${result.length || 0} surat tugas nego per guru!`);
        setKeterangan("");
        fetchData();
      } catch (error: any) {
        toast.error(error.message || "Terjadi kesalahan");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (activePlots.length === 0) {
      toast.error("Tidak ada data DUDI ter-plot.");
      return;
    }

    const confirmRes = await Swal.fire({
      title: "Generate Masal?",
      text: `Apakah Anda yakin ingin memproses generate ${getTabLabel(outgoingTab)} masal untuk ${activePlots.length} plotingan DUDI aktif?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Ya, Generate!",
      cancelButtonText: "Batal"
    });

    if (!confirmRes.isConfirmed) return;

    setIsSubmitting(true);
    try {
      const payload = {
        noSurat: activeNoSuratFormat.trim(),
        tipe: outgoingTab,
        tanggalTugas,
        tanggalSurat,
        tanggalSelesai: isRangeTab(outgoingTab) ? tanggalSelesai : undefined,
        keterangan: keterangan.trim() || undefined,
        startingNumber: parseInt(nomorSuratSeq, 10)
      };

      const res = await fetch(`${API_URL}/surat-tugas/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Gagal melakukan generate masal");

      toast.success(`Berhasil membuat ${result.length || 0} surat tugas baru secara masal!`);
      setKeterangan("");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSingleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlotId) {
      toast.error("Silakan pilih plotingan terlebih dahulu");
      return;
    }
    if (!activeNoSuratFormat.trim() || !nomorSuratSeq.trim() || !tanggalTugas || !tanggalSurat) {
      toast.error("Format Nomor Surat, No. Surat, Tanggal Pelaksanaan, dan Tanggal Surat wajib diisi");
      return;
    }

    setIsSubmitting(true);
    try {
      const computedNoSurat = activeNoSuratFormat.replace("xxx", nomorSuratSeq.trim());

      let payload: any;
      if (outgoingTab === "NEGO_DUDI") {
        const selectedGuruItem = unGeneratedGuruNego.find((item) => item.id === Number(selectedPlotId));
        if (!selectedGuruItem) {
          toast.error("Guru negosiasi yang dipilih tidak ditemukan");
          setIsSubmitting(false);
          return;
        }
        const primaryPerusahaanId = selectedGuruItem.assignedDudis[0]?.id || 1;
        payload = {
          noSurat: computedNoSurat,
          tipe: "NEGO_DUDI",
          guruId: selectedGuruItem.id.toString(),
          perusahaanId: primaryPerusahaanId.toString(),
          tanggalTugas,
          tanggalSurat,
          keterangan: keterangan.trim() || undefined,
        };
      } else {
        const selectedPlot = unGeneratedPlots.find((p) => p.id === Number(selectedPlotId));
        if (!selectedPlot) return;

        const selectedGuruId = (outgoingTab === "PENGAJUAN_PKL")
          ? (selectedPlot.guruNegoId || selectedPlot.guruPembimbingId || gurus[0]?.id || 1)
          : (selectedPlot.guruPembimbingId || gurus[0]?.id || 1);

        payload = {
          noSurat: computedNoSurat,
          tipe: outgoingTab,
          guruId: selectedGuruId.toString(),
          perusahaanId: selectedPlot.id.toString(),
          tanggalTugas,
          tanggalSurat,
          tanggalSelesai: isRangeTab(outgoingTab) ? tanggalSelesai : undefined,
          keterangan: keterangan.trim() || undefined,
        };
      }

      const res = await fetch(`${API_URL}/surat-tugas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Gagal membuat surat");

      toast.success("Berhasil menerbitkan surat satuan!");
      setIsSingleModalOpen(false);
      setSelectedPlotId("");
      setKeterangan("");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditTugasModal = (letter: SuratTugas) => {
    setEditingTugasId(letter.id);
    setEditNoSurat(letter.noSurat);
    setEditTanggalSurat(letter.tanggalSurat ? new Date(letter.tanggalSurat).toISOString().split("T")[0] : "");
    setEditTanggalTugas(new Date(letter.tanggalTugas).toISOString().split("T")[0]);
    setEditTanggalSelesai(letter.tanggalSelesai ? new Date(letter.tanggalSelesai).toISOString().split("T")[0] : "");
    setEditGuruId(letter.guruId.toString());
    setEditPerusahaanId(letter.perusahaanId.toString());
    setEditKeterangan(letter.keterangan || "");
    setIsEditTugasModalOpen(true);
  };

  const handleUpdateTugas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTugasId) return;

    setIsSubmitting(true);
    try {
      const payload = {
        noSurat: editNoSurat.trim(),
        guruId: editGuruId,
        perusahaanId: editPerusahaanId,
        tanggalTugas: editTanggalTugas,
        tanggalSelesai: isRangeTab(outgoingTab) ? editTanggalSelesai : undefined,
        tanggalSurat: editTanggalSurat || undefined,
        keterangan: editKeterangan.trim() || undefined,
      };

      const res = await fetch(`${API_URL}/surat-tugas/${editingTugasId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Gagal memperbarui surat tugas");

      toast.success("Surat tugas berhasil diperbarui!");
      setIsEditTugasModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateInbound = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inboundNoSurat.trim() || !inboundPengirim.trim() || !inboundPerihal.trim() || !inboundTanggalMasuk) {
      toast.error("Semua kolom bertanda * wajib diisi");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        noSurat: inboundNoSurat.trim(),
        pengirim: inboundPengirim.trim(),
        perihal: inboundPerihal.trim(),
        tanggalMasuk: inboundTanggalMasuk,
      };

      const res = await fetch(`${API_URL}/surat-masuk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Gagal mencatat surat masuk");

      // Upload file scan if selected
      if (inboundFile) {
        await uploadScanFile(result.id, inboundFile, "SURAT_MASUK");
      }

      toast.success("Surat masuk berhasil dicatat!");
      setInboundNoSurat("");
      setInboundPengirim("");
      setInboundPerihal("");
      setInboundFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualNoSurat.trim() || !manualPenerima.trim() || !manualPerihal.trim() || !manualTanggalKeluar) {
      toast.error("Semua kolom bertanda * wajib diisi");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        noSurat: manualNoSurat.trim(),
        penerima: manualPenerima.trim(),
        perihal: manualPerihal.trim(),
        tanggalKeluar: manualTanggalKeluar,
      };

      const res = await fetch(`${API_URL}/surat-keluar-manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Gagal mencatat surat keluar manual");

      // Upload file scan if selected
      if (manualFile) {
        await uploadScanFile(result.id, manualFile, "SURAT_KELUAR_MANUAL");
      }

      toast.success("Surat keluar manual berhasil dicatat!");
      setManualNoSurat("");
      setManualPenerima("");
      setManualPerihal("");
      setManualFile(null);
      if (manualFileInputRef.current) manualFileInputRef.current.value = "";
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualDelete = async (id: number) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus catatan surat keluar manual ini?")) return;
    try {
      const res = await fetch(`${API_URL}/surat-keluar-manual/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Gagal menghapus surat");
      }
      toast.success("Surat keluar manual berhasil dihapus");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Gagal menghapus surat");
    }
  };

  const handleOpenEditManualModal = (letter: SuratKeluarManual) => {
    setEditingManualId(letter.id);
    setEditManualNoSurat(letter.noSurat);
    setEditManualPenerima(letter.penerima);
    setEditManualPerihal(letter.perihal);
    setEditManualTanggalKeluar(new Date(letter.tanggalKeluar).toISOString().split("T")[0]);
    setIsEditManualModalOpen(true);
  };

  const handleUpdateManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingManualId) return;

    setIsSubmitting(true);
    try {
      const payload = {
        noSurat: editManualNoSurat.trim(),
        penerima: editManualPenerima.trim(),
        perihal: editManualPerihal.trim(),
        tanggalKeluar: editManualTanggalKeluar,
      };

      const res = await fetch(`${API_URL}/surat-keluar-manual/${editingManualId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Gagal memperbarui surat");

      toast.success("Surat keluar manual berhasil diperbarui!");
      setIsEditManualModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenCreateCustomModal = () => {
    setCustomId(null);
    const parsed = parseFormatAndSeq(lastLetters.lastOutgoing, customLetters.length + 1, "005");
    setCustomNoSuratFormat(parsed.format);
    setCustomNomorSuratSeq(parsed.seq.toString());
    setCustomTanggalSurat(new Date().toISOString().split("T")[0]);
    setCustomPerihal("");
    setCustomTujuan("");
    setCustomAlamatTujuan("");
    setCustomIsiSurat("");
    setCustomNamaPenandatangan(namaKepsek);
    setCustomNipPenandatangan(nipKepsek);
    setCustomPangkatPenandatangan(pangkatKepsek);
    setIsCustomModalOpen(true);
  };

  const handleOpenEditCustomModal = (letter: SuratCustom) => {
    setCustomId(letter.id);
    
    // Parse the existing stored full number back to format & sequence inputs
    const parsed = parseFormatAndSeq(letter.noSurat, 1, "005");
    setCustomNoSuratFormat(parsed.format);
    setCustomNomorSuratSeq((parsed.seq - 1).toString()); // use current sequence number
    
    setCustomTanggalSurat(new Date(letter.tanggalSurat).toISOString().split("T")[0]);
    setCustomPerihal(letter.perihal);
    setCustomTujuan(letter.tujuan);
    setCustomAlamatTujuan(letter.alamatTujuan || "");
    setCustomIsiSurat(letter.isiSurat);
    setCustomNamaPenandatangan(letter.namaPenandatangan);
    setCustomNipPenandatangan(letter.nipPenandatangan || "");
    setCustomPangkatPenandatangan(letter.pangkatPenandatangan || "");
    setIsCustomModalOpen(true);
  };

  const handleCreateOrUpdateCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customNoSuratFormat.trim() || !customNomorSuratSeq.trim() || !customPerihal.trim() || !customTujuan.trim() || !customIsiSurat.trim() || !customNamaPenandatangan.trim()) {
      toast.error("Semua kolom bertanda * wajib diisi");
      return;
    }

    setIsSubmitting(true);
    try {
      const computedCustomNo = customNoSuratFormat.replace("xxx", customNomorSuratSeq.trim());

      const payload = {
        noSurat: computedCustomNo,
        tanggalSurat: customTanggalSurat,
        perihal: customPerihal.trim(),
        tujuan: customTujuan.trim(),
        alamatTujuan: customAlamatTujuan.trim() || undefined,
        isiSurat: customIsiSurat.trim(),
        namaPenandatangan: customNamaPenandatangan.trim(),
        nipPenandatangan: customNipPenandatangan.trim() || undefined,
        pangkatPenandatangan: customPangkatPenandatangan.trim() || undefined,
      };

      let res;
      if (customId) {
        // Edit Mode
        res = await fetch(`${API_URL}/surat-custom/${customId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        // Create Mode
        res = await fetch(`${API_URL}/surat-custom`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Gagal memproses surat custom");

      toast.success(customId ? "Surat custom berhasil diperbarui!" : "Surat custom berhasil diterbitkan!");
      setIsCustomModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenVisualEditor = (letter: SuratCustom) => {
    setEditingCustomLetter(letter);
    setIsVisualEditorOpen(true);
  };

  // Field change updates in WYSIWYG modal state
  const handleVisualFieldChange = (field: keyof SuratCustom, value: string) => {
    if (!editingCustomLetter) return;
    setEditingCustomLetter({
      ...editingCustomLetter,
      [field]: value
    });
  };

  const saveVisualEdits = async () => {
    if (!editingCustomLetter) return;

    setIsSavingVisual(true);
    try {
      const payload = {
        noSurat: editingCustomLetter.noSurat,
        tanggalSurat: editingCustomLetter.tanggalSurat,
        perihal: editingCustomLetter.perihal,
        tujuan: editingCustomLetter.tujuan,
        alamatTujuan: editingCustomLetter.alamatTujuan || null,
        isiSurat: editingCustomLetter.isiSurat,
        namaPenandatangan: editingCustomLetter.namaPenandatangan,
        nipPenandatangan: editingCustomLetter.nipPenandatangan || null,
        pangkatPenandatangan: editingCustomLetter.pangkatPenandatangan || null,
      };

      const res = await fetch(`${API_URL}/surat-custom/${editingCustomLetter.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Gagal menyimpan perubahan visual");
      }

      toast.success("Perubahan visual berhasil disimpan!");
      setIsVisualEditorOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan perubahan");
    } finally {
      setIsSavingVisual(false);
    }
  };

  const uploadScanFile = async (id: number, file: File, type: "SURAT_KELUAR" | "SURAT_MASUK" | "SURAT_CUSTOM" | "SURAT_KELUAR_MANUAL") => {
    const formData = new FormData();
    formData.append("scanFile", file);

    const endpoint = 
      type === "SURAT_MASUK" ? `${API_URL}/surat-masuk/${id}/upload-scan` :
      type === "SURAT_CUSTOM" ? `${API_URL}/surat-custom/${id}/upload-scan` :
      type === "SURAT_KELUAR_MANUAL" ? `${API_URL}/surat-keluar-manual/${id}/upload-scan` :
      `${API_URL}/surat-tugas/${id}/upload-scan`;
      
    const res = await fetch(endpoint, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      throw new Error("Gagal mengunggah berkas scan pendukung");
    }
  };

  const handleRowScanUpload = async (id: number, file: File, type: "SURAT_KELUAR" | "SURAT_MASUK" | "SURAT_CUSTOM" | "SURAT_KELUAR_MANUAL") => {
    const toastId = toast.loading("Mengunggah berkas scan...");
    try {
      await uploadScanFile(id, file, type);
      toast.success("Berkas scan berhasil diunggah!", { id: toastId });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Gagal mengunggah berkas scan", { id: toastId });
    }
  };

  const handleDeleteLetter = async (id: number) => {
    const confirmRes = await Swal.fire({
      title: "Hapus Surat Tugas?",
      text: "Data surat tugas yang dihapus tidak dapat dikembalikan.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal"
    });

    if (!confirmRes.isConfirmed) return;

    try {
      const res = await fetch(`${API_URL}/surat-tugas/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Surat tugas berhasil dihapus!");
        fetchData();
      } else {
        const data = await res.json();
        throw new Error(data.message || "Gagal menghapus data");
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteInbound = async (id: number) => {
    const confirmRes = await Swal.fire({
      title: "Hapus Surat Masuk?",
      text: "Catatan surat masuk yang dihapus tidak dapat dikembalikan.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal"
    });

    if (!confirmRes.isConfirmed) return;

    try {
      const res = await fetch(`${API_URL}/surat-masuk/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Catatan surat masuk berhasil dihapus!");
        fetchData();
      } else {
        const data = await res.json();
        throw new Error(data.message || "Gagal menghapus data");
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteCustom = async (id: number) => {
    const confirmRes = await Swal.fire({
      title: "Hapus Surat Custom?",
      text: "Data surat custom yang dihapus tidak dapat dikembalikan.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal"
    });

    if (!confirmRes.isConfirmed) return;

    try {
      const res = await fetch(`${API_URL}/surat-custom/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Surat custom berhasil dihapus!");
        fetchData();
      } else {
        const data = await res.json();
        throw new Error(data.message || "Gagal menghapus data");
      }
    } catch (error: any) {
      toast.error(error.message);
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

  const formatTanggalPendek = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const toTitleCase = (str?: string) => {
    if (!str) return "-";
    return str
      .toLowerCase()
      .replace(/(?:^|\s|\/|\(|\-|\[)\S/g, (char) => char.toUpperCase());
  };

  const getTanggalTugasDisplay = (letter: SuratTugas) => {
    const t1 = formatTanggal(letter.tanggalTugas);
    if (letter.tanggalSelesai && new Date(letter.tanggalSelesai).getTime() !== new Date(letter.tanggalTugas).getTime()) {
      return `${t1} s.d. ${formatTanggal(letter.tanggalSelesai)}`;
    }
    return t1;
  };

  const generatePDFForLetters = async (lettersToPrint: SuratTugas[]) => {
    if (lettersToPrint.length === 0) {
      toast.error("Tidak ada data surat tugas untuk dicetak.");
      return;
    }

    setIsGeneratingPDF(true);
    const toastId = toast.loading(
      lettersToPrint.length === 1 
        ? "Sedang membuat dokumen PDF..." 
        : `Sedang membuat ${lettersToPrint.length} halaman PDF...`, 
      { id: "pdf-generate" }
    );

    try {
      const doc = new jsPDF('p', 'pt', 'a4');
      
      // Load logo and signature once
      let logoBase64 = '';
      let ttdBase64 = '';
      try {
        logoBase64 = await getBase64Image('/logo_jatim.png');
      } catch (err) {
        console.warn("Gagal memuat logo:", err);
      }
      try {
        ttdBase64 = await getBase64Image('/ttd_kepsek.png');
      } catch (err) {
        console.warn("Gagal memuat ttd:", err);
      }

      for (let index = 0; index < lettersToPrint.length; index++) {
        const letter = lettersToPrint[index];
        
        // Add new page for subsequent letters
        if (index > 0) {
          doc.addPage();
        }

        // 1. Draw Kop Surat
        const marginLeft = 54;
        const marginRight = 54;
        const contentWidth = 595.28 - marginLeft - marginRight; // ~487.28 pt
        const rightEdge = marginLeft + contentWidth;
        const centerX = 297.64; // Exact center of A4

        if (logoBase64) {
          doc.addImage(logoBase64, 'PNG', marginLeft, 44, 42, 60);
        }
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.text("PEMERINTAH PROVINSI JAWA TIMUR", centerX, 48, { align: 'center' });
        doc.text("DINAS PENDIDIKAN", centerX, 62, { align: 'center' });
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text("SMK NEGERI 6 JEMBER", centerX, 79, { align: 'center' });
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.text("Jl. PB. Sudirman 114 Tanggul Telp/Fax. (0336) 441347 Jember 68155", centerX, 93, { align: 'center' });
        doc.setFont('helvetica', 'italic');
        doc.text("Pos-el : smkn6.jember@yahoo.com Laman : smkn6.jember.sch.id", centerX, 105, { align: 'center' });

        // Double Line
        doc.setLineWidth(2.5);
        doc.line(marginLeft, 114, rightEdge, 114);
        doc.setLineWidth(0.6);
        doc.line(marginLeft, 117, rightEdge, 117);

        if (letter.tipe === "PENGAJUAN_PKL") {
          // 2. Letter details (Nomor, Sifat, Lampiran, Hal, Tanggal)
          const dateText = `Jember, ${letter.tanggalSurat ? formatTanggalPendek(letter.tanggalSurat) : formatTanggalPendek(letter.createdAt)}`;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          
          let curY = 138;
          doc.text(dateText, 375, curY);

          doc.text("Nomor", marginLeft, curY);
          doc.text(`:  ${letter.noSurat}`, 110, curY);
          
          curY += 15;
          doc.text("Sifat", marginLeft, curY);
          doc.text(":  ", 110, curY);
          doc.text("Penting", 118, curY);
          const pentingWidth = doc.getTextWidth("Penting");
          doc.setLineWidth(0.5);
          doc.line(118, curY + 1.5, 118 + pentingWidth, curY + 1.5); // Underline on Penting
          
          curY += 15;
          doc.text("Lampiran", marginLeft, curY);
          doc.text(":  1", 110, curY);
          
          curY += 15;
          doc.text("Hal", marginLeft, curY);
          doc.setFont('helvetica', 'bold');
          doc.text(":  Permohonan tempat", 110, curY);
          curY += 14;
          doc.text("   Praktik Kerja Lapangan (PKL)", 110, curY);

          // 3. Recipient
          curY += 24;
          doc.setFont('helvetica', 'normal');
          doc.text(`Yth. Pimpinan ${toTitleCase(letter.perusahaan?.nama || "-")}`, marginLeft, curY);
          curY += 14;
          doc.text("Di –", marginLeft, curY);
          curY += 14;
          doc.text("        Tempat", marginLeft, curY);

          // 4. Paragraf 1 (Justified)
          curY += 24;
          const p1 = "        Praktik  Kerja  Lapangan  (PKL)  SMK  Negeri  6  Jember,  sebagai  tindak  lanjut kebijakan Dinas Pendidikan dalam penyelenggaraan Kurikulum Sekolah Menengah Kejuruan (SMK) bertujuan untuk :";
          const splitP1 = doc.splitTextToSize(p1, contentWidth);
          doc.text(p1, marginLeft, curY, { maxWidth: contentWidth, align: 'justify', lineHeightFactor: 1.4 });

          curY += (splitP1.length * 14) + 8;

          const itemsTujuan = [
            { no: "1.", text: "Meningkatkan ketrampilan dan kompetensi siswa di bidang keahlian masing-masing konsentrasi keahlian sesuai dengan tuntutan pasar kerja di Industri Dunia Kerja (IDUKA)." },
            { no: "2.", text: "Menambah wawasan siswa tentang standar kemampuan yang dimiliki oleh Industri Dunia Kerja." },
            { no: "3.", text: "Mendekatkan kesesuaian mutu tamatan yang meliputi kemampuan kerja dan sikap yang profesional." }
          ];

          for (const item of itemsTujuan) {
            const textWidth = contentWidth - 26;
            const splitText = doc.splitTextToSize(item.text, textWidth);
            doc.text(item.no, marginLeft + 10, curY);
            doc.text(item.text, marginLeft + 26, curY, { maxWidth: textWidth, align: 'justify', lineHeightFactor: 1.35 });
            curY += (splitText.length * 13.5) + 6;
          }

          curY += 4;

          // 5. Paragraf 2 (Justified)
          const tglMulai = formatTanggalPendek(letter.tanggalTugas);
          const tglSelesai = letter.tanggalSelesai ? formatTanggalPendek(letter.tanggalSelesai) : "";
          const rangeDateStr = tglSelesai && tglSelesai !== tglMulai ? `${tglMulai} s.d ${tglSelesai}` : tglMulai;
          
          const fullP2 = `        Sehubungan dengan hal tersebut, kami mohon Bapak/Ibu berkenan untuk memberikan tempat dan kesempatan kepada siswa SMK Negeri 6 Jember untuk melaksanakan PKL yang akan dilaksanakan pada ${rangeDateStr} di Instansi yang Bapak/Ibu pimpin dengan Konsentrasi Keahlian sebagai berikut :`;
          
          const splitP2 = doc.splitTextToSize(fullP2, contentWidth);
          doc.text(fullP2, marginLeft, curY, { maxWidth: contentWidth, align: 'justify', lineHeightFactor: 1.4 });

          curY += (splitP2.length * 14) + 8;

          // List Konsentrasi Keahlian
          const jurusans = [
            "a.   Akuntansi",
            "b.   Manajemen Perkantoran",
            "c.   Bisnis Digital",
            "d.   Kriya Kreatif Batik dan Tekstil",
            "e.   Pengembangan Perangkat Lunak dan Gim",
            "f.    Desain Komunikasi Visual"
          ];

          for (const j of jurusans) {
            doc.text(j, marginLeft + 14, curY);
            curY += 14.5;
          }

          curY += 6;

          // 6. Paragraf 3 (Penutup)
          doc.text("        Selanjutnya, kami mohon Bapak/Ibu berkenan untuk mengisi form terlampir.", marginLeft, curY, { maxWidth: contentWidth, align: 'justify', lineHeightFactor: 1.4 });
          curY += 16;
          doc.text("        Atas perkenan dan kerjasamanya disampaikan terima kasih.", marginLeft, curY, { maxWidth: contentWidth, align: 'justify', lineHeightFactor: 1.4 });

          // 7. Signature Block (Kepala Sekolah)
          const sigY = curY + 28;
          doc.text("Kepala Sekolah,", 365, sigY);

          if (ttdBase64) {
            doc.addImage(ttdBase64, 'PNG', 360, sigY + 5, 115, 68);
          }

          const namaY = sigY + 76;
          doc.setFont('helvetica', 'bold');
          doc.text(namaKepsek, 365, namaY);
          const nameWidth = doc.getTextWidth(namaKepsek);
          doc.setLineWidth(0.5);
          doc.line(365, namaY + 1.5, 365 + nameWidth, namaY + 1.5);

          doc.setFont('helvetica', 'normal');
          doc.text(pangkatKepsek, 365, namaY + 13);
          doc.text(`NIP. ${nipKepsek}`, 365, namaY + 25);
        } else if (letter.tipe === "PENYERAHAN") {
          // 2. Letter details (Nomer, Lampiran, Hal, Tanggal)
          const dateText = `Jember, ${letter.tanggalSurat ? formatTanggalPendek(letter.tanggalSurat) : formatTanggalPendek(letter.createdAt)}`;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          
          let curY = 145;
          // Date at right side
          doc.text(dateText, 360, curY);

          // Left elements
          doc.text("Nomer", marginLeft, curY);
          doc.text(`:  ${letter.noSurat}`, 110, curY);
          
          curY += 16;
          doc.text("Lampiran", marginLeft, curY);
          doc.text(":  1 lembar", 110, curY);
          
          curY += 16;
          doc.text("Hal", marginLeft, curY);
          doc.text(":  ", 110, curY);
          doc.setFont('helvetica', 'bold');
          doc.text("Penyerahan Siswa PKL", 118, curY);
          doc.setFont('helvetica', 'normal');

          // 3. Recipient
          curY += 30;
          doc.text("Yth.", marginLeft, curY);
          doc.text(`Pimpinan ${letter.perusahaan?.nama?.toUpperCase() || "-"}`, marginLeft + 35, curY);
          curY += 16;
          doc.text("di -", marginLeft + 10, curY);
          curY += 16;
          doc.setFont('helvetica', 'italic');
          doc.text("Tempat", marginLeft + 10, curY);
          doc.setFont('helvetica', 'normal');

          // 4. Paragraf 1
          curY += 30;
          const tglMulai = formatTanggalPendek(letter.tanggalTugas);
          const tglSelesai = letter.tanggalSelesai ? formatTanggalPendek(letter.tanggalSelesai) : "";
          const dateRangeStr = tglSelesai && tglSelesai !== tglMulai ? `${tglMulai} s.d ${tglSelesai}` : tglMulai;
          
          const paragraf1 = `Menindak lanjuti kesediaan Bapak/Ibu memberikan tempat dan kesempatan bagi siswa SMK Negeri 6 Jember untuk melaksanakan Praktik Kerja Lapangan ( PKL ) mulai tanggal ${dateRangeStr} di`;
          
          const splitParagraf1 = doc.splitTextToSize(paragraf1, contentWidth);
          doc.text(paragraf1, marginLeft, curY, { maxWidth: contentWidth, align: 'justify', lineHeightFactor: 1.45 });
          
          curY += (splitParagraf1.length * 15) + 12;

          // Centered & Bold DUDI Name
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10.5);
          doc.text(letter.perusahaan?.nama?.toUpperCase() || "-", centerX, curY, { align: 'center' });
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);

          curY += 24;

          // 5. Paragraf 2
          const p2 = "Berikut kami kirimkan data siswa SMK Negeri 6 Jember kelas XII (dua belas) yang siap mengikuti kegiatan tersebut.";
          const splitP2 = doc.splitTextToSize(p2, contentWidth);
          doc.text(p2, marginLeft, curY, { maxWidth: contentWidth, align: 'justify', lineHeightFactor: 1.45 });

          curY += (splitP2.length * 15) + 24;

          // 6. Closing Paragraph
          doc.setFont('helvetica', 'normal');
          doc.text("Atas bantuan dan kerjasamanya yang baik disampaikan terima kasih.", marginLeft, curY);
          curY += 55;

          // 7. Signature block (Kepala Sekolah)
          const sigY = curY;
          const sigX = 360;
          doc.text("Kepala Sekolah,", sigX, sigY);

          if (ttdBase64) {
            doc.addImage(ttdBase64, 'PNG', sigX - 5, sigY + 6, 115, 68);
          }

          const penyerahanNamaY = sigY + 80;
          doc.setFont('helvetica', 'bold');
          doc.text(namaKepsek, sigX, penyerahanNamaY);
          const kepsekNameWidth = doc.getTextWidth(namaKepsek);
          doc.setLineWidth(0.5);
          doc.line(sigX, penyerahanNamaY + 1.5, sigX + kepsekNameWidth, penyerahanNamaY + 1.5);

          doc.setFont('helvetica', 'normal');
          doc.text(pangkatKepsek, sigX, penyerahanNamaY + 13);
          doc.text(`NIP. ${nipKepsek}`, sigX, penyerahanNamaY + 25);
        } else {
          // 2. Title & Nomor (FORMAT SURAT TUGAS for NEGO_DUDI, PENGANTARAN, MONITORING_1, MONITORING_2, PENJEMPUTAN)
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(13);
          doc.text("SURAT TUGAS", centerX, 138, { align: 'center' });
          const titleWidth = doc.getTextWidth("SURAT TUGAS");
          doc.setLineWidth(1);
          doc.line(centerX - titleWidth / 2, 140.5, centerX + titleWidth / 2, 140.5); // Underline exactly under SURAT TUGAS
          
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.text(`Nomor : ${letter.noSurat}`, centerX, 154, { align: 'center' });

          // 3. Opening Text (Justified)
          let curY = 178;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          const pOpen = "        Yang bertandatangan di bawah ini Kepala SMK Negeri 6 Jember, dengan ini memberikan tugas kepada :";
          const splitOpen = doc.splitTextToSize(pOpen, contentWidth);
          doc.text(pOpen, marginLeft, curY, { maxWidth: contentWidth, align: 'justify', lineHeightFactor: 1.4 });
          curY += (splitOpen.length * 14) + 12;

          // 4. Structured metadata layout
          const colLabelX = marginLeft + 12;
          const colColonX = marginLeft + 115;
          const colValX = marginLeft + 125;
          const valWidth = rightEdge - colValX;
          const lineHeight = 15;

          // Nama
          doc.text("Nama", colLabelX, curY);
          doc.text(":", colColonX, curY);
          doc.text(letter.guru?.namaLengkap || "-", colValX, curY);
          curY += lineHeight;

          // NIP/NUPTK/NIG
          doc.text("NIP/NUPTK/NIG", colLabelX, curY);
          doc.text(":", colColonX, curY);
          doc.text(letter.guru?.nip || "-", colValX, curY);
          curY += lineHeight;

          // Jabatan
          doc.text("Jabatan", colLabelX, curY);
          doc.text(":", colColonX, curY);
          doc.text(letter.tipe === "NEGO_DUDI" ? "Guru" : "Guru ( Pembimbing PKL)", colValX, curY);
          curY += lineHeight;

          // Pangkat/ Golongan
          doc.text("Pangkat/ Golongan", colLabelX, curY);
          doc.text(":", colColonX, curY);
          doc.text(letter.guru?.nip ? "PPPK/IX" : "-", colValX, curY);
          curY += lineHeight;

          // Keperluan
          doc.text("Keperluan", colLabelX, curY);
          doc.text(":", colColonX, curY);

          if (letter.tipe === "NEGO_DUDI") {
            doc.text("Mengantar surat permohonan tempat PKL di :", colValX, curY);
            curY += lineHeight;

            // Get all DUDIs assigned to this guru for NEGO_DUDI
            const assignedDudis = perusahaans.filter(p => p.guruNegoId === letter.guruId);
            const dudiList = assignedDudis.length > 0 ? assignedDudis.map(p => p.nama) : [letter.perusahaan?.nama || "-"];

            for (let i = 0; i < dudiList.length; i++) {
              const dudiLine = `${i + 1}.  ${dudiList[i]}`;
              const splitDudi = doc.splitTextToSize(dudiLine, valWidth - 10);
              doc.text(splitDudi, colValX + 10, curY);
              curY += (splitDudi.length * 14);
            }
          } else {
            const defaultPurpose = 
              letter.tipe === "PENGANTARAN" ? `Mengantar siswa PKL di ${letter.perusahaan?.nama || '-'}` :
              letter.tipe === "MONITORING_1" ? `Monitoring siswa PKL Tahap I di ${letter.perusahaan?.nama || '-'}` :
              letter.tipe === "MONITORING_2" ? `Monitoring siswa PKL Tahap II di ${letter.perusahaan?.nama || '-'}` :
              `Menjemput / Penarikan siswa PKL di ${letter.perusahaan?.nama || '-'}`;
            
            const splitPurpose = doc.splitTextToSize(defaultPurpose, valWidth);
            doc.text(splitPurpose, colValX, curY);
            curY += (splitPurpose.length * lineHeight);
          }

          curY += 4;

          // Pelaksanaan
          const tanggalPelaksanaan = getTanggalTugasDisplay(letter);
          doc.text("Pelaksanaan", colLabelX, curY);
          doc.text(":", colColonX, curY);
          doc.text(tanggalPelaksanaan, colValX, curY);
          curY += lineHeight;

          // Pukul
          doc.text("Pukul", colLabelX, curY);
          doc.text(":", colColonX, curY);
          doc.text("08.00 WIB - selesai", colValX, curY);
          curY += lineHeight + 16;

          // 5. Closing Text (Justified)
          const pClose = "        Demikian surat ini kami buat, apabila sudah menyelesaikan tugas harap memberikan laporan kepada Kepala Sekolah.";
          const splitClose = doc.splitTextToSize(pClose, contentWidth);
          doc.text(pClose, marginLeft, curY, { maxWidth: contentWidth, align: 'justify', lineHeightFactor: 1.4 });
          curY += (splitClose.length * 14) + 24;

          // 6. Signatures (2 Columns)
          const sigY = curY;

          // Left Column (Yang Diberi Tugas)
          const leftColX = marginLeft + 8;
          doc.text("Yang Diberi Tugas,", leftColX, sigY);
          doc.text(letter.tipe === "NEGO_DUDI" ? "Guru," : "Guru Pembimbing,", leftColX, sigY + 14);

          const leftNamaY = sigY + 84;
          const guruNama = letter.guru?.namaLengkap || "-";
          doc.setFont('helvetica', 'bold');
          doc.text(guruNama, leftColX, leftNamaY);
          const guruNameWidth = doc.getTextWidth(guruNama);
          doc.setLineWidth(0.5);
          doc.line(leftColX, leftNamaY + 1.5, leftColX + guruNameWidth, leftNamaY + 1.5);

          doc.setFont('helvetica', 'normal');
          doc.text(`NIP.  ${letter.guru?.nip || "-"}`, leftColX, leftNamaY + 12);

          // Right Column (Yang Memberikan Tugas)
          const dateText = `Jember, ${letter.tanggalSurat ? formatTanggalPendek(letter.tanggalSurat) : formatTanggalPendek(letter.createdAt)}`;
          doc.text(dateText, 365, sigY);
          doc.text("Yang Memberikan Tugas", 365, sigY + 14);
          doc.text("Kepala Sekolah,", 365, sigY + 28);

          if (ttdBase64) {
            doc.addImage(ttdBase64, 'PNG', 360, sigY + 32, 115, 68);
          }

          const rightNamaY = sigY + 104;
          doc.setFont('helvetica', 'bold');
          doc.text(namaKepsek, 365, rightNamaY);
          const kepsekNameWidth = doc.getTextWidth(namaKepsek);
          doc.setLineWidth(0.5);
          doc.line(365, rightNamaY + 1.5, 365 + kepsekNameWidth, rightNamaY + 1.5);

          doc.setFont('helvetica', 'normal');
          doc.text(pangkatKepsek, 365, rightNamaY + 13);
          doc.text(`NIP. ${nipKepsek}`, 365, rightNamaY + 25);
        }
      }

      const pdfBlob = doc.output('blob');
      window.open(URL.createObjectURL(pdfBlob), '_blank');
      toast.success("Dokumen PDF berhasil dibuka!", { id: "pdf-generate" });
    } catch (error) {
      console.error(error);
      toast.error("Gagal membuat berkas PDF.", { id: "pdf-generate" });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const generateCustomPDF = async (letter: SuratCustom) => {
    toast.loading("Sedang membuat dokumen PDF...", { id: "pdf-custom" });

    try {
      const doc = new jsPDF('p', 'pt', 'a4');
      
      // Load logo
      let logoBase64 = '';
      try {
        logoBase64 = await getBase64Image('/logo_jatim.png');
      } catch (err) {
        console.warn("Gagal memuat logo:", err);
      }

      // 1. Draw Kop Surat
      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', 40, 40, 50, 60);
      }
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text("PEMERINTAH PROVINSI JAWA TIMUR", 320, 43, { align: 'center' });
      doc.text("DINAS PENDIDIKAN", 320, 56, { align: 'center' });
      doc.setFontSize(15);
      doc.text("SMK NEGERI 6 JEMBER", 320, 74, { align: 'center' });
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text("Jalan PB. Sudirman 114 Tanggul Telp/Fax. (0336) 441347 Jember 68155", 320, 88, { align: 'center' });
      doc.setFont('helvetica', 'italic');
      doc.text("E-mail : smkn6.jember@yahoo.com Website : smkn6.jember.sch.id", 320, 99, { align: 'center' });

      // Double Line
      doc.setLineWidth(2.5);
      doc.line(40, 107, 555, 107);
      doc.setLineWidth(0.5);
      doc.line(40, 110, 555, 110);

      // 2. Outgoing letter meta (Nomor, Hal, Tanggal)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      
      // Left elements
      doc.text(`Nomor   : ${letter.noSurat}`, 40, 135);
      doc.text(`Lamp.     : -`, 40, 149);
      doc.text(`Hal         : ${letter.perihal}`, 40, 163);

      // Right element (Date)
      const dateText = `Jember, ${formatTanggalPendek(letter.tanggalSurat)}`;
      doc.text(dateText, 440, 135);

      // 3. Recipient
      doc.text("Kepada Yth.", 40, 195);
      doc.setFont('helvetica', 'bold');
      doc.text(letter.tujuan, 40, 209);
      doc.setFont('helvetica', 'normal');
      if (letter.alamatTujuan) {
        doc.text(letter.alamatTujuan, 40, 223, { maxWidth: 300 });
      }
      doc.text("di tempat", 40, letter.alamatTujuan ? 250 : 235);

      // 4. Body Content
      const bodyY = letter.alamatTujuan ? 280 : 265;
      const splitIsi = doc.splitTextToSize(letter.isiSurat, 515);
      doc.text(splitIsi, 40, bodyY);

      const finalBodyY = bodyY + (splitIsi.length * 14) + 40;

      // 5. Signature Block
      doc.text("Yang Memberikan Tugas,", 360, finalBodyY);
      doc.text("Kepala Sekolah,", 360, finalBodyY + 12);
      
      doc.setFont('helvetica', 'bold');
      doc.text(letter.namaPenandatangan, 360, finalBodyY + 75);
      
      doc.setFont('helvetica', 'normal');
      if (letter.pangkatPenandatangan) {
        doc.text(letter.pangkatPenandatangan, 360, finalBodyY + 87);
      }
      if (letter.nipPenandatangan) {
        doc.text(`NIP. ${letter.nipPenandatangan}`, 360, finalBodyY + 98);
      }

      const pdfBlob = doc.output('blob');
      window.open(URL.createObjectURL(pdfBlob), '_blank');
      toast.success("Dokumen PDF berhasil dibuka!", { id: "pdf-custom" });
    } catch (error) {
      console.error(error);
      toast.error("Gagal membuat berkas PDF.", { id: "pdf-custom" });
    }
  };

  const getLastOutgoingSeq = () => {
    if (!lastLetters.lastOutgoing) return "-";
    return extractSeqFromNoSurat(lastLetters.lastOutgoing, activeNoSuratFormat);
  };

  // Guru Negosiasi plotting list (grouped per Guru)
  const activeGuruNegoList = gurus.map((g) => {
    // Find all companies where this guru is assigned as guruNego
    const assignedDudis = perusahaans.filter((p) => p.guruNegoId === g.id);
    const matchedLetter = letters.find((l) => l.tipe === "NEGO_DUDI" && l.guruId === g.id);
    return {
      guru: g,
      id: g.id,
      namaLengkap: g.namaLengkap,
      nip: g.nip,
      assignedDudis,
      dudiCount: assignedDudis.length,
      matchedLetter,
    };
  }).filter((item) => item.dudiCount > 0);

  const unGeneratedGuruNego = activeGuruNegoList.filter((item) => !item.matchedLetter);

  const filteredGuruNego = activeGuruNegoList.filter((item) => {
    const query = searchQuery.toLowerCase();
    const matchGuru = item.namaLengkap.toLowerCase().includes(query) || item.nip.toLowerCase().includes(query);
    const matchDudi = item.assignedDudis.some((d) => d.nama.toLowerCase().includes(query));
    return matchGuru || matchDudi;
  });

  // Filter companies that are actively plotted
  const activePlots = perusahaans.filter(c => {
    if (outgoingTab === "PENGAJUAN_PKL") {
      return c.guruNegoId !== null || (c.siswaMagang && c.siswaMagang.length > 0);
    }
    return c.guruPembimbingId && c.siswaMagang?.length > 0;
  });

  // Plots that do not have generated letters for the current outgoingTab yet
  const unGeneratedPlots = activePlots.filter(plot => {
    return !letters.some(l => l.perusahaanId === plot.id && l.tipe === outgoingTab);
  });
  
  // Search query filters
  const filteredOutgoing = activePlots.filter(c => {
    const query = searchQuery.toLowerCase();
    const teacherName = (outgoingTab === "PENGAJUAN_PKL")
      ? (c.guruNego?.namaLengkap || c.guruPembimbing?.namaLengkap || "") 
      : (c.guruPembimbing?.namaLengkap || "");
    return c.nama.toLowerCase().includes(query) || 
      teacherName.toLowerCase().includes(query);
  });

  const filteredIncoming = inboundLetters.filter(l => {
    const query = searchQuery.toLowerCase();
    return l.noSurat.toLowerCase().includes(query) ||
      l.pengirim.toLowerCase().includes(query) ||
      l.perihal.toLowerCase().includes(query);
  });

  const filteredCustom = customLetters.filter(l => {
    const query = searchQuery.toLowerCase();
    return l.noSurat.toLowerCase().includes(query) ||
      l.tujuan.toLowerCase().includes(query) ||
      l.perihal.toLowerCase().includes(query);
  });

  const filteredManual = manualLetters.filter(l => {
    const query = searchQuery.toLowerCase();
    return l.noSurat.toLowerCase().includes(query) ||
      l.penerima.toLowerCase().includes(query) ||
      l.perihal.toLowerCase().includes(query);
  });

  // Global computed preview of outgoing number
  const computedOutgoingNoStr = activeNoSuratFormat.replace("xxx", nomorSuratSeq);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-[85vh]">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="text-smk-blue" size={28} />
            Manajemen Surat PKL
          </h1>
          <p className="text-sm text-slate-500 mt-1">Kelola pencatatan surat masuk, penerbitan surat tugas keluar, serta pembuatan surat custom.</p>
        </div>
      </div>

      {/* Info Nomor Surat Terakhir (Tata Usaha Reference Card) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-smk-blue/10 flex items-center justify-center text-smk-blue">
            <Send size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Acuan Nomor Surat Keluar Terakhir</p>
            <p className="text-sm font-mono font-bold text-slate-800 mt-0.5">
              {lastLetters.lastOutgoing || "Belum ada surat keluar"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 border-t md:border-t-0 md:border-l border-slate-200/60 pt-3 md:pt-0 md:pl-5">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/10 flex items-center justify-center text-indigo-600">
            <Inbox size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nomor Surat Masuk Terakhir</p>
            <p className="text-sm font-mono font-bold text-slate-800 mt-0.5">
              {lastLetters.lastIncoming || "Belum ada surat masuk"}
            </p>
          </div>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex bg-slate-100 rounded-xl p-1 gap-1 border border-slate-200">
        <button
          onClick={() => { setMainTab("SURAT_KELUAR"); setSearchQuery(""); }}
          className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
            mainTab === "SURAT_KELUAR" 
              ? "bg-white text-slate-800 shadow-sm border border-slate-200/50" 
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Send size={15} />
          Surat Keluar (Tugas & Custom)
        </button>
        <button
          onClick={() => { setMainTab("SURAT_MASUK"); setSearchQuery(""); }}
          className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
            mainTab === "SURAT_MASUK" 
              ? "bg-white text-slate-800 shadow-sm border border-slate-200/50" 
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Inbox size={15} />
          Surat Masuk
        </button>
      </div>

      {/* --- SURAT KELUAR TAB CONTENT --- */}
      {mainTab === "SURAT_KELUAR" && (
        <>
          {/* Global Format & Sequence Number Configuration Panel */}
          {outgoingTab !== "CUSTOM" && (
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
                  <FileCheck className="text-smk-blue" size={18} />
                  Pengaturan Format Nomor Surat
                </h3>
                <button
                  type="button"
                  onClick={handleSaveFormat}
                  disabled={isSavingFormat}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-sm cursor-pointer self-end sm:self-auto disabled:opacity-50"
                >
                  {isSavingFormat ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  Simpan Format Nomor
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
                <div className="flex flex-col">
                  <label className="text-xs font-bold text-slate-600 uppercase mb-1.5 flex items-center gap-1.5 h-5">
                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
                    Format No. Surat Tugas *
                  </label>
                  <input
                    type="text"
                    value={formatSuratTugas}
                    onChange={(e) => setFormatSuratTugas(e.target.value)}
                    placeholder="094/xxx/101.6.5.19/2026"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-smk-blue font-mono h-10"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block h-4 truncate">Surat Tugas (Nego, Berangkat, Monit, Tarik)</span>
                </div>

                <div className="flex flex-col">
                  <label className="text-xs font-bold text-slate-600 uppercase mb-1.5 flex items-center gap-1.5 h-5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0"></span>
                    Format No. Surat Keluar *
                  </label>
                  <input
                    type="text"
                    value={formatSuratKeluar}
                    onChange={(e) => setFormatSuratKeluar(e.target.value)}
                    placeholder="421.5/xxx/101.6.5.19/2026"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-smk-blue font-mono h-10"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block h-4 truncate">Surat Keluar (Pengajuan PKL, Penyerahan, dsb)</span>
                </div>

                <div className="flex flex-col">
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 h-5 flex items-center">
                    No. Urut Mulai (xxx) *
                  </label>
                  <input
                    type="number"
                    value={nomorSuratSeq}
                    onChange={(e) => setNomorSuratSeq(e.target.value)}
                    placeholder="1"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-smk-blue h-10"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block h-4 truncate">Penomoran awal untuk generate</span>
                </div>

                <div className="flex flex-col">
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 h-5 flex items-center">
                    No. Terakhir Digunakan
                  </label>
                  <div className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 h-10 flex items-center justify-center font-mono">
                    {getLastOutgoingSeq()}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block h-4 truncate">Berdasarkan arsip surat terakhir</span>
                </div>
              </div>

              <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 font-semibold bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-600 font-bold">Kategori Aktif ({getTabLabel(outgoingTab)}):</span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${isSuratTugasTab(outgoingTab) ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>
                    {isSuratTugasTab(outgoingTab) ? 'SURAT TUGAS' : 'SURAT KELUAR'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-600 font-bold">Pratinjau Nomor Terbentuk:</span>
                  <code className="font-mono text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                    {computedOutgoingNoStr}
                  </code>
                </div>
              </div>
            </div>
          )}

          {/* Subtabs for Outgoing Tipe + Custom tab */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-2.5">
            <div className="flex flex-wrap gap-2">
              {(["PENGAJUAN_PKL", "NEGO_DUDI", "PENGANTARAN", "PENYERAHAN", "MONITORING_1", "MONITORING_2", "PENJEMPUTAN", "MANUAL", "CUSTOM"] as OutgoingTabType[]).map((tab) => {
                const isActive = outgoingTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => { setOutgoingTab(tab); setSearchQuery(""); }}
                    className={`py-2 px-3.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center text-center whitespace-normal leading-tight ${
                      isActive 
                        ? "bg-smk-blue text-white shadow-sm ring-2 ring-smk-blue/20" 
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-800 border border-slate-200/60"
                    }`}
                  >
                    {getTabLabel(tab)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Render Custom Letter section if selected tab is CUSTOM */}
          {outgoingTab === "CUSTOM" ? (
            <>
              {/* Action Header Card for Custom */}
              <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative flex-1 w-full sm:max-w-md">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
                  <input
                    type="text"
                    placeholder="Cari surat custom berdasarkan nomor, perihal, atau tujuan..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-smk-blue bg-slate-50/50"
                  />
                </div>
                <button
                  onClick={handleOpenCreateCustomModal}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-sm cursor-pointer w-full sm:w-auto justify-center"
                >
                  <Plus size={16} />
                  Buat Surat Custom
                </button>
              </div>

              {/* Custom Letters List Table */}
              <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
                {isLoading ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-smk-blue" />
                    <p className="text-sm font-semibold text-slate-500">Memuat berkas custom...</p>
                  </div>
                ) : filteredCustom.length === 0 ? (
                  <div className="py-16 text-center">
                    <FileText className="mx-auto text-slate-300 mb-3" size={48} />
                    <p className="text-sm font-bold text-slate-500">Belum ada surat custom dibuat.</p>
                    <p className="text-xs text-slate-400 mt-1">Klik tombol 'Buat Surat Custom' di atas untuk memulai.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-sm text-slate-600">
                      <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-4 w-12 text-center">No</th>
                          <th className="px-6 py-4 w-44">Nomor Surat</th>
                          <th className="px-6 py-4">Tujuan / Penerima</th>
                          <th className="px-6 py-4">Perihal</th>
                          <th className="px-6 py-4 w-32">Tanggal</th>
                          <th className="px-6 py-4 w-36 text-center">Scan Stempel</th>
                          <th className="px-6 py-4 text-center w-36">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredCustom.map((letter, index) => (
                          <tr key={letter.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 text-center font-bold text-slate-400">{index + 1}</td>
                            <td className="px-6 py-4 font-mono font-bold text-slate-700">{letter.noSurat}</td>
                            <td className="px-6 py-4 font-bold text-slate-800">{letter.tujuan}</td>
                            <td className="px-6 py-4 font-medium text-slate-650">{letter.perihal}</td>
                            <td className="px-6 py-4 text-xs font-medium">{formatTanggalPendek(letter.tanggalSurat)}</td>
                            
                            <td className="px-6 py-4 text-center">
                              <div className="flex flex-col items-center gap-1.5">
                                {letter.scanFile ? (
                                  <div className="flex items-center gap-1">
                                    <a
                                      href={`${API_URL}${letter.scanFile}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 rounded-lg text-xs font-semibold cursor-pointer"
                                    >
                                      <Eye size={12} />
                                      Lihat
                                    </a>
                                    <label className="p-1 text-slate-500 hover:text-slate-700 bg-slate-100 border border-slate-200 rounded-lg cursor-pointer" title="Ganti Berkas">
                                      <Upload size={12} />
                                      <input
                                        type="file"
                                        accept="application/pdf,image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                          if (e.target.files?.[0]) {
                                            handleRowScanUpload(letter.id, e.target.files[0], "SURAT_CUSTOM");
                                          }
                                        }}
                                      />
                                    </label>
                                  </div>
                                ) : (
                                  <label className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-medium cursor-pointer">
                                    <Upload size={12} />
                                    Upload Scan
                                    <input
                                      type="file"
                                      accept="application/pdf,image/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        if (e.target.files?.[0]) {
                                          handleRowScanUpload(letter.id, e.target.files[0], "SURAT_CUSTOM");
                                        }
                                      }}
                                    />
                                  </label>
                                )}
                              </div>
                            </td>

                            <td className="px-6 py-4 text-center">
                              <div className="flex justify-center gap-1.5">
                                <button
                                  onClick={() => handleOpenVisualEditor(letter)}
                                  className="p-1.5 bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
                                  title="Visual WYSIWYG Editor Preview"
                                >
                                  <Edit3 size={15} />
                                </button>
                                <button
                                  onClick={() => generateCustomPDF(letter)}
                                  className="p-1.5 bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                                  title="Cetak Surat PDF"
                                >
                                  <Printer size={15} />
                                </button>
                                <button
                                  onClick={() => handleOpenEditCustomModal(letter)}
                                  className="p-1.5 bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                  title="Edit Form"
                                >
                                  <FileText size={15} />
                                </button>
                                <button
                                  onClick={() => handleDeleteCustom(letter.id)}
                                  className="p-1.5 bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
                                  title="Hapus Surat"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : outgoingTab === "MANUAL" ? (
            <>
              {/* Logger Form for Manual Outgoing Letters */}
              <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6">
                <h3 className="font-bold text-slate-800 text-sm mb-4 uppercase tracking-wider flex items-center gap-2">
                  <Send className="text-indigo-600" size={18} />
                  Pencatatan Surat Keluar Manual Baru
                </h3>
                <form onSubmit={handleCreateManual} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nomor Surat Keluar *</label>
                    <input
                      type="text"
                      value={manualNoSurat}
                      onChange={(e) => setManualNoSurat(e.target.value)}
                      placeholder="Misal: 421.6/501/101.6.5.24/2026"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-smk-blue"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tujuan / Penerima *</label>
                    <input
                      type="text"
                      value={manualPenerima}
                      onChange={(e) => setManualPenerima(e.target.value)}
                      placeholder="PT. Sinar Emas / Kepala Cabdin"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-smk-blue"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tanggal Surat Dikirim *</label>
                    <input
                      type="date"
                      value={manualTanggalKeluar}
                      onChange={(e) => setManualTanggalKeluar(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-smk-blue"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Perihal / Hal *</label>
                    <input
                      type="text"
                      value={manualPerihal}
                      onChange={(e) => setManualPerihal(e.target.value)}
                      placeholder="Surat Pengantar Kerjasama PKL Mandiri"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-smk-blue"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Pilih Berkas Scan (Optional)</label>
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      ref={manualFileInputRef}
                      onChange={(e) => setManualFile(e.target.files?.[0] || null)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none"
                    />
                  </div>

                  <div className="md:col-span-3 flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmitting || isLoading}
                      className="py-2 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50 w-full sm:w-auto"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Plus size={14} />
                          Simpan Surat Keluar Manual
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Search Filter Card */}
              <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
                  <input
                    type="text"
                    placeholder="Cari berdasarkan nomor surat, tujuan, atau perihal surat keluar manual..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-smk-blue bg-slate-50/50"
                  />
                </div>
              </div>

              {/* Manual Outgoing Letters Table */}
              <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
                {isLoading ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-smk-blue" />
                    <p className="text-sm font-semibold text-slate-500">Memuat data arsip...</p>
                  </div>
                ) : filteredManual.length === 0 ? (
                  <div className="py-16 text-center">
                    <Inbox className="mx-auto text-slate-300 mb-3" size={48} />
                    <p className="text-sm font-bold text-slate-500">Belum ada arsip surat keluar manual.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                          <th className="px-6 py-4 text-center w-16">No</th>
                          <th className="px-6 py-4">Nomor Surat</th>
                          <th className="px-6 py-4">Tujuan / Penerima</th>
                          <th className="px-6 py-4">Perihal</th>
                          <th className="px-6 py-4 w-36">Tanggal Keluar</th>
                          <th className="px-6 py-4 text-center w-40">Berkas Scan</th>
                          <th className="px-6 py-4 text-center w-28">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredManual.map((manual, index) => (
                          <tr key={manual.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 text-center font-bold text-slate-400">{index + 1}</td>
                            <td className="px-6 py-4 font-mono text-xs font-bold text-indigo-600">{manual.noSurat}</td>
                            <td className="px-6 py-4 font-bold text-slate-800">{manual.penerima}</td>
                            <td className="px-6 py-4 font-semibold text-slate-700">{manual.perihal}</td>
                            <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                              {new Date(manual.tanggalKeluar).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "long",
                                year: "numeric"
                              })}
                            </td>
                            <td className="px-6 py-4 text-center">
                              {manual.scanFile ? (
                                <div className="flex items-center justify-center gap-1.5">
                                  <a
                                    href={`${API_URL}${manual.scanFile}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 rounded-lg text-xs font-semibold cursor-pointer"
                                  >
                                    <Eye size={12} />
                                    Lihat Scan
                                  </a>
                                  <label className="p-1 text-slate-500 hover:text-slate-700 bg-slate-100 border border-slate-200 rounded-lg cursor-pointer" title="Ganti Scan">
                                    <Upload size={12} />
                                    <input
                                      type="file"
                                      accept="application/pdf,image/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        if (e.target.files?.[0]) {
                                          handleRowScanUpload(manual.id, e.target.files[0], "SURAT_KELUAR_MANUAL");
                                        }
                                      }}
                                    />
                                  </label>
                                </div>
                              ) : (
                                <label className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-medium cursor-pointer">
                                  <Upload size={12} />
                                  Upload Scan
                                  <input
                                    type="file"
                                    accept="application/pdf,image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      if (e.target.files?.[0]) {
                                        handleRowScanUpload(manual.id, e.target.files[0], "SURAT_KELUAR_MANUAL");
                                      }
                                    }}
                                  />
                                </label>
                              )}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleOpenEditManualModal(manual)}
                                  className="p-1 text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-all cursor-pointer"
                                  title="Edit Data"
                                >
                                  <Edit3 size={14} />
                                </button>
                                <button
                                  onClick={() => handleManualDelete(manual.id)}
                                  className="p-1 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-100 rounded-lg transition-all cursor-pointer"
                                  title="Hapus"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Bulk Generate Form */}
              <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6">
                <h3 className="font-bold text-slate-800 text-sm mb-4 uppercase tracking-wider flex items-center gap-2">
                  <FileCheck className="text-smk-blue" size={18} />
                  Form Setup Masal - {getTabLabel(outgoingTab)}
                </h3>
                <form onSubmit={handleBulkGenerate} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tanggal Surat *</label>
                      <input
                        type="date"
                        value={tanggalSurat}
                        onChange={(e) => setTanggalSurat(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-smk-blue"
                        required
                      />
                    </div>
                    
                    {isRangeTab(outgoingTab) ? (
                      <>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tanggal Mulai Pelaksanaan *</label>
                          <input
                            type="date"
                            value={tanggalTugas}
                            onChange={(e) => setTanggalTugas(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-smk-blue"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tanggal Selesai Pelaksanaan *</label>
                          <input
                            type="date"
                            value={tanggalSelesai}
                            onChange={(e) => setTanggalSelesai(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-smk-blue"
                            required
                          />
                        </div>
                      </>
                    ) : (
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tanggal Pelaksanaan *</label>
                        <input
                          type="date"
                          value={tanggalTugas}
                          onChange={(e) => setTanggalTugas(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-smk-blue"
                          required
                        />
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Keterangan Tambahan (Opsional)</label>
                      <input
                        type="text"
                        value={keterangan}
                        onChange={(e) => setKeterangan(e.target.value)}
                        placeholder="Misal: Gelombang 1 TA 2026/2027"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-smk-blue"
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={isSubmitting || isLoading}
                        className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <FileCheck size={14} />
                            Generate Masal
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsSingleModalOpen(true)}
                        disabled={isLoading}
                        className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                      >
                        <Plus size={14} />
                        Generate Satuan
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* Search & Bulk Print Filter Card */}
              <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 flex flex-col sm:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
                  <input
                    type="text"
                    placeholder={outgoingTab === "NEGO_DUDI" ? "Cari berdasarkan nama guru negosiasi, NIP, atau nama DUDI..." : "Cari berdasarkan nama instansi DUDI atau nama guru pembimbing..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-smk-blue bg-slate-50/50"
                  />
                </div>
                <button
                  onClick={() => generatePDFForLetters(letters)}
                  disabled={letters.length === 0 || isGeneratingPDF}
                  className="px-4 py-2 bg-smk-blue hover:bg-smk-blue/90 text-white font-bold rounded-xl text-sm transition-all flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50 w-full sm:w-auto justify-center"
                >
                  {isGeneratingPDF ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Printer size={16} />
                      Cetak Semua PDF ({letters.length})
                    </>
                  )}
                </button>
              </div>

              {/* Outgoing Letters Table */}
              <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
                {isLoading ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-smk-blue" />
                    <p className="text-sm font-semibold text-slate-500">Memuat data...</p>
                  </div>
                ) : outgoingTab === "NEGO_DUDI" ? (
                  /* === PER-GURU TABLE FOR NEGO_DUDI === */
                  filteredGuruNego.length === 0 ? (
                    <div className="py-16 text-center">
                      <Building2 className="mx-auto text-slate-300 mb-3" size={48} />
                      <p className="text-sm font-bold text-slate-500">Tidak ada data guru negosiasi yang cocok.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-100">
                          <tr>
                            <th className="px-6 py-4 w-12 text-center">No</th>
                            <th className="px-6 py-4 w-64">Guru Negosiasi</th>
                            <th className="px-6 py-4">Daftar DUDI Ditugaskan</th>
                            <th className="px-6 py-4 w-36 text-center">Nomor Surat</th>
                            <th className="px-6 py-4 w-44">Tanggal Pelaksanaan</th>
                            <th className="px-6 py-4 w-36 text-center">Scan Stempel</th>
                            <th className="px-6 py-4 text-center w-32">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredGuruNego.map((item, index) => {
                            const matchedLetter = item.matchedLetter;
                            return (
                              <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 text-center font-bold text-slate-400">{index + 1}</td>
                                <td className="px-6 py-4">
                                  <div className="font-bold text-slate-800">{item.namaLengkap}</div>
                                  <div className="text-xs text-slate-400 font-mono mt-0.5">NIP: {item.nip || "-"}</div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-1.5 mb-1.5">
                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-md border border-blue-100">
                                      {item.dudiCount} DUDI Ditugaskan
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {item.assignedDudis.map((d, dIdx) => (
                                      <span key={d.id} className="inline-flex items-center bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium border border-slate-200/60">
                                        {dIdx + 1}. {d.nama}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  {matchedLetter ? (
                                    <span className="font-mono text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                                      {matchedLetter.noSurat}
                                    </span>
                                  ) : (
                                    <span className="text-xs font-bold text-slate-400">-</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-xs font-medium text-slate-550">
                                  {matchedLetter ? getTanggalTugasDisplay(matchedLetter) : "-"}
                                </td>
                                <td className="px-6 py-4 text-center">
                                  {matchedLetter ? (
                                    <div className="flex flex-col items-center gap-1.5">
                                      {matchedLetter.scanFile ? (
                                        <div className="flex items-center gap-1">
                                          <a
                                            href={`${API_URL}${matchedLetter.scanFile}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 rounded-lg text-xs font-semibold cursor-pointer"
                                          >
                                            <Eye size={12} />
                                            Lihat Scan
                                          </a>
                                          <label className="p-1 text-slate-500 hover:text-slate-700 bg-slate-100 border border-slate-200 rounded-lg cursor-pointer" title="Ganti Scan">
                                            <Upload size={12} />
                                            <input
                                              type="file"
                                              accept="application/pdf,image/*"
                                              className="hidden"
                                              onChange={(e) => {
                                                if (e.target.files?.[0]) {
                                                  handleRowScanUpload(matchedLetter.id, e.target.files[0], "SURAT_KELUAR");
                                                }
                                              }}
                                            />
                                          </label>
                                        </div>
                                      ) : (
                                        <label className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-medium cursor-pointer">
                                          <Upload size={12} />
                                          Upload Scan
                                          <input
                                            type="file"
                                            accept="application/pdf,image/*"
                                            className="hidden"
                                            onChange={(e) => {
                                              if (e.target.files?.[0]) {
                                                handleRowScanUpload(matchedLetter.id, e.target.files[0], "SURAT_KELUAR");
                                              }
                                            }}
                                          />
                                        </label>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-slate-400 font-bold">-</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-center">
                                  {matchedLetter ? (
                                    <div className="flex justify-center gap-1.5">
                                      <button
                                        onClick={() => handleOpenEditTugasModal(matchedLetter)}
                                        className="p-1.5 bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                        title="Edit Surat Tugas"
                                      >
                                        <Edit3 size={15} />
                                      </button>
                                      <button
                                        onClick={() => generatePDFForLetters([matchedLetter])}
                                        className="p-1.5 bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                                        title="Cetak Surat Tugas PDF"
                                      >
                                        <Printer size={15} />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteLetter(matchedLetter.id)}
                                        className="p-1.5 bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
                                        title="Hapus Surat Tugas"
                                      >
                                        <Trash2 size={15} />
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-xs font-bold text-slate-400">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )
                ) : (
                  /* === PER-DUDI TABLE FOR OTHER TABS === */
                  filteredOutgoing.length === 0 ? (
                    <div className="py-16 text-center">
                      <Building2 className="mx-auto text-slate-300 mb-3" size={48} />
                      <p className="text-sm font-bold text-slate-500">Tidak ada data plotingan yang cocok.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-100">
                          <tr>
                            <th className="px-6 py-4 w-12 text-center">No</th>
                            <th className="px-6 py-4">Nama DUDI</th>
                            <th className="px-6 py-4">{outgoingTab === "PENGAJUAN_PKL" ? "Guru Negosiasi / Pengaju" : "Guru Pembimbing"}</th>
                            <th className="px-6 py-4 w-32 text-center">Nomor Surat</th>
                            <th className="px-6 py-4 w-44">Tanggal Pelaksanaan</th>
                            <th className="px-6 py-4 w-36 text-center">Scan Stempel (PDF/Img)</th>
                            <th className="px-6 py-4 text-center w-32">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredOutgoing.map((plot, index) => {
                            const matchedLetter = letters.find(
                              (l) => l.perusahaanId === plot.id && l.tipe === outgoingTab
                            );

                            return (
                              <tr key={plot.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 text-center font-bold text-slate-400">{index + 1}</td>
                                <td className="px-6 py-4 font-bold text-slate-800">{plot.nama}</td>
                                <td className="px-6 py-4 font-semibold text-slate-700">
                                  {outgoingTab === "PENGAJUAN_PKL"
                                    ? (plot.guruNego?.namaLengkap || plot.guruPembimbing?.namaLengkap || "Belum di-plot") 
                                    : (plot.guruPembimbing?.namaLengkap || "Belum di-plot")}
                                </td>
                                <td className="px-6 py-4 text-center">
                                  {matchedLetter ? (
                                    <span className="font-mono text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                                      {matchedLetter.noSurat}
                                    </span>
                                  ) : (
                                    <span className="text-xs font-bold text-slate-400">-</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-xs font-medium text-slate-550">
                                  {matchedLetter ? getTanggalTugasDisplay(matchedLetter) : "-"}
                                </td>
                                
                                <td className="px-6 py-4 text-center">
                                  {matchedLetter ? (
                                    <div className="flex flex-col items-center gap-1.5">
                                      {matchedLetter.scanFile ? (
                                        <div className="flex items-center gap-1">
                                          <a
                                            href={`${API_URL}${matchedLetter.scanFile}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 rounded-lg text-xs font-semibold cursor-pointer"
                                          >
                                            <Eye size={12} />
                                            Lihat Scan
                                          </a>
                                          <label className="p-1 text-slate-500 hover:text-slate-700 bg-slate-100 border border-slate-200 rounded-lg cursor-pointer" title="Ganti Scan">
                                            <Upload size={12} />
                                            <input
                                              type="file"
                                              accept="application/pdf,image/*"
                                              className="hidden"
                                              onChange={(e) => {
                                                if (e.target.files?.[0]) {
                                                  handleRowScanUpload(matchedLetter.id, e.target.files[0], "SURAT_KELUAR");
                                                }
                                              }}
                                            />
                                          </label>
                                        </div>
                                      ) : (
                                        <label className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-medium cursor-pointer">
                                          <Upload size={12} />
                                          Upload Scan
                                          <input
                                            type="file"
                                            accept="application/pdf,image/*"
                                            className="hidden"
                                            onChange={(e) => {
                                              if (e.target.files?.[0]) {
                                                handleRowScanUpload(matchedLetter.id, e.target.files[0], "SURAT_KELUAR");
                                              }
                                            }}
                                          />
                                        </label>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-slate-400 font-bold">-</span>
                                  )}
                                </td>

                                <td className="px-6 py-4 text-center">
                                  {matchedLetter ? (
                                    <div className="flex justify-center gap-1.5">
                                      <button
                                        onClick={() => handleOpenEditTugasModal(matchedLetter)}
                                        className="p-1.5 bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                        title="Edit Surat Tugas"
                                      >
                                        <Edit3 size={15} />
                                      </button>
                                      <button
                                        onClick={() => generatePDFForLetters([matchedLetter])}
                                        className="p-1.5 bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                                        title="Cetak Surat Tugas PDF"
                                      >
                                        <Printer size={15} />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteLetter(matchedLetter.id)}
                                        className="p-1.5 bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
                                        title="Hapus Surat Tugas"
                                      >
                                        <Trash2 size={15} />
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-xs font-bold text-slate-400">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* --- SURAT MASUK TAB CONTENT --- */}
      {mainTab === "SURAT_MASUK" && (
        <>
          {/* Logger Form for Incoming Letters */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6">
            <h3 className="font-bold text-slate-800 text-sm mb-4 uppercase tracking-wider flex items-center gap-2">
              <Inbox className="text-indigo-600" size={18} />
              Pencatatan Surat Masuk Baru
            </h3>
            <form onSubmit={handleCreateInbound} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nomor Surat Masuk *</label>
                <input
                  type="text"
                  value={inboundNoSurat}
                  onChange={(e) => setInboundNoSurat(e.target.value)}
                  placeholder="Misal: 421.3/987/101.6.21/2026"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-smk-blue"
                  required
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Pengirim / Asal Surat *</label>
                <input
                  type="text"
                  value={inboundPengirim}
                  onChange={(e) => setInboundPengirim(e.target.value)}
                  placeholder="PT. Sinar Abadi / Cabdin Jember"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-smk-blue"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tanggal Surat Diterima *</label>
                <input
                  type="date"
                  value={inboundTanggalMasuk}
                  onChange={(e) => setInboundTanggalMasuk(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-smk-blue"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Perihal / Hal *</label>
                <input
                  type="text"
                  value={inboundPerihal}
                  onChange={(e) => setInboundPerihal(e.target.value)}
                  placeholder="Permohonan Penempatan Siswa Magang PKL"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-smk-blue"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Pilih Berkas Scan (Optional)</label>
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  ref={fileInputRef}
                  onChange={(e) => setInboundFile(e.target.files?.[0] || null)}
                  className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none"
                />
              </div>

              <div className="md:col-span-3 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting || isLoading}
                  className="py-2 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50 w-full sm:w-auto"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Plus size={14} />
                      Simpan Surat Masuk
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Search Filter Card */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5">
            <div className="relative w-full">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Cari berdasarkan nomor surat, pengirim, atau perihal surat masuk..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-smk-blue bg-slate-50/50"
              />
            </div>
          </div>

          {/* Incoming Letters Table */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-smk-blue" />
                <p className="text-sm font-semibold text-slate-500">Memuat data arsip...</p>
              </div>
            ) : filteredIncoming.length === 0 ? (
              <div className="py-16 text-center">
                <Inbox className="mx-auto text-slate-300 mb-3" size={48} />
                <p className="text-sm font-bold text-slate-500">Belum ada arsip surat masuk.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 w-12 text-center">No</th>
                      <th className="px-6 py-4">Nomor Surat</th>
                      <th className="px-6 py-4">Pengirim</th>
                      <th className="px-6 py-4">Perihal</th>
                      <th className="px-6 py-4 w-40">Tanggal Diterima</th>
                      <th className="px-6 py-4 w-36 text-center">Berkas Scan</th>
                      <th className="px-6 py-4 text-center w-24">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredIncoming.map((inbound, index) => (
                      <tr key={inbound.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 text-center font-bold text-slate-400">{index + 1}</td>
                        <td className="px-6 py-4 font-mono font-bold text-slate-700">{inbound.noSurat}</td>
                        <td className="px-6 py-4 font-bold text-slate-800">{inbound.pengirim}</td>
                        <td className="px-6 py-4 font-medium text-slate-650">{inbound.perihal}</td>
                        <td className="px-6 py-4 text-xs font-medium">{formatTanggalPendek(inbound.tanggalMasuk)}</td>
                        
                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center gap-1.5">
                            {inbound.scanFile ? (
                              <div className="flex items-center gap-1">
                                <a
                                  href={`${API_URL}${inbound.scanFile}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 rounded-lg text-xs font-semibold cursor-pointer"
                                >
                                  <Eye size={12} />
                                  Lihat Scan
                                </a>
                                <label className="p-1 text-slate-500 hover:text-slate-700 bg-slate-100 border border-slate-200 rounded-lg cursor-pointer" title="Ganti Berkas">
                                  <Upload size={12} />
                                  <input
                                    type="file"
                                    accept="application/pdf,image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      if (e.target.files?.[0]) {
                                        handleRowScanUpload(inbound.id, e.target.files[0], "SURAT_MASUK");
                                      }
                                    }}
                                  />
                                </label>
                              </div>
                            ) : (
                              <label className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-medium cursor-pointer">
                                <Upload size={12} />
                                Upload Scan
                                <input
                                  type="file"
                                  accept="application/pdf,image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    if (e.target.files?.[0]) {
                                      handleRowScanUpload(inbound.id, e.target.files[0], "SURAT_MASUK");
                                    }
                                  }}
                                />
                              </label>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleDeleteInbound(inbound.id)}
                            className="p-1.5 bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Catatan"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Outgoing Generate Satuan Modal */}
      {isSingleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-2xl flex flex-col p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
                <FileCheck className="text-indigo-600" size={18} />
                Generate Satuan - {getTabLabel(outgoingTab)}
              </h3>
              <button onClick={() => setIsSingleModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSingleGenerate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                  {outgoingTab === "NEGO_DUDI" ? "Pilih Guru Negosiasi *" : "Pilih Plotingan Guru & DUDI *"}
                </label>
                <select
                  value={selectedPlotId}
                  onChange={(e) => setSelectedPlotId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-smk-blue"
                  required
                >
                  <option value="">{outgoingTab === "NEGO_DUDI" ? "-- Pilih Guru Negosiasi --" : "-- Pilih Plotingan --"}</option>
                  {outgoingTab === "NEGO_DUDI"
                    ? unGeneratedGuruNego.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.namaLengkap} ({item.dudiCount} DUDI: {item.assignedDudis.map((d) => d.nama).join(", ")})
                        </option>
                      ))
                    : unGeneratedPlots.map((plot) => {
                        const teacher = outgoingTab === "PENGAJUAN_PKL"
                          ? (plot.guruNego?.namaLengkap || plot.guruPembimbing?.namaLengkap || "Belum di-plot")
                          : (plot.guruPembimbing?.namaLengkap || "Belum di-plot");
                        return (
                          <option key={plot.id} value={plot.id}>
                            {plot.nama} ({outgoingTab === "PENGAJUAN_PKL" ? "Pengaju" : "Pembimbing"}: {teacher})
                          </option>
                        );
                      })}
                </select>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs space-y-1">
                <span className="font-semibold text-slate-500">Nomor Surat Terbentuk:</span>
                <div className="font-mono text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded border border-emerald-100 truncate mt-1">
                  {computedOutgoingNoStr}
                </div>
                <p className="text-[10px] text-slate-450 mt-1">Format & nomor urut disesuaikan dari panel pengaturan global di atas.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tanggal Surat *</label>
                <input
                  type="date"
                  value={tanggalSurat}
                  onChange={(e) => setTanggalSurat(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-smk-blue"
                  required
                />
              </div>

              {isRangeTab(outgoingTab) ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tgl Mulai *</label>
                    <input
                      type="date"
                      value={tanggalTugas}
                      onChange={(e) => setTanggalTugas(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-smk-blue"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tgl Selesai *</label>
                    <input
                      type="date"
                      value={tanggalSelesai}
                      onChange={(e) => setTanggalSelesai(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-smk-blue"
                      required
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tanggal Pelaksanaan *</label>
                  <input
                    type="date"
                    value={tanggalTugas}
                    onChange={(e) => setTanggalTugas(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-smk-blue"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Keterangan Tambahan</label>
                <input
                  type="text"
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  placeholder="Opsional"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-smk-blue"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setIsSingleModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    "Generate Surat"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Surat Tugas Modal */}
      {isEditTugasModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-2xl flex flex-col p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
                <Edit3 className="text-smk-blue" size={18} />
                Edit Data Surat Tugas
              </h3>
              <button onClick={() => setIsEditTugasModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleUpdateTugas} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nomor Surat *</label>
                <input
                  type="text"
                  value={editNoSurat}
                  onChange={(e) => setEditNoSurat(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-smk-blue font-mono font-bold text-slate-700"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">{(outgoingTab === "PENGAJUAN_PKL" || outgoingTab === "NEGO_DUDI") ? "Guru Negosiasi / Pengaju *" : "Guru Pembimbing *"}</label>
                <select
                  value={editGuruId}
                  onChange={(e) => setEditGuruId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-smk-blue"
                  required
                >
                  {gurus.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.namaLengkap} (NIP: {g.nip || "-"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Instansi DUDI *</label>
                <select
                  value={editPerusahaanId}
                  onChange={(e) => setEditPerusahaanId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-smk-blue"
                  required
                >
                  {perusahaans.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tanggal Surat *</label>
                <input
                  type="date"
                  value={editTanggalSurat}
                  onChange={(e) => setEditTanggalSurat(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-smk-blue"
                  required
                />
              </div>

              {isRangeTab(outgoingTab) ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tgl Mulai *</label>
                    <input
                      type="date"
                      value={editTanggalTugas}
                      onChange={(e) => setEditTanggalTugas(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-smk-blue"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tgl Selesai *</label>
                    <input
                      type="date"
                      value={editTanggalSelesai}
                      onChange={(e) => setEditTanggalSelesai(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-smk-blue"
                      required
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tanggal Pelaksanaan *</label>
                  <input
                    type="date"
                    value={editTanggalTugas}
                    onChange={(e) => setEditTanggalTugas(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-smk-blue"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Keterangan Tambahan</label>
                <input
                  type="text"
                  value={editKeterangan}
                  onChange={(e) => setEditKeterangan(e.target.value)}
                  placeholder="Opsional"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-smk-blue"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditTugasModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    "Simpan"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Surat Keluar Manual Modal */}
      {isEditManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-2xl flex flex-col p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
                <Edit3 className="text-smk-blue" size={18} />
                Edit Data Surat Keluar Manual
              </h3>
              <button onClick={() => setIsEditManualModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleUpdateManual} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nomor Surat *</label>
                <input
                  type="text"
                  value={editManualNoSurat}
                  onChange={(e) => setEditManualNoSurat(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-smk-blue font-mono font-bold text-slate-700"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tujuan / Penerima *</label>
                <input
                  type="text"
                  value={editManualPenerima}
                  onChange={(e) => setEditManualPenerima(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-smk-blue font-bold text-slate-700"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Perihal / Hal *</label>
                <input
                  type="text"
                  value={editManualPerihal}
                  onChange={(e) => setEditManualPerihal(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-smk-blue font-semibold text-slate-700"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tanggal Surat Dikirim *</label>
                <input
                  type="date"
                  value={editManualTanggalKeluar}
                  onChange={(e) => setEditManualTanggalKeluar(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-smk-blue text-slate-700"
                  required
                />
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditManualModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    "Simpan"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Letter Create/Edit Form Modal */}
      {isCustomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-slate-200 shadow-2xl flex flex-col p-6 space-y-4 max-h-[90vh]">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
                <FileText className="text-indigo-600" size={18} />
                {customId ? "Edit Setup Surat Custom" : "Buat Surat Custom Baru"}
              </h3>
              <button onClick={() => setIsCustomModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleCreateOrUpdateCustom} className="space-y-3 overflow-y-auto pr-1 flex-1">
              <div className="grid grid-cols-4 gap-3 items-end">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Format Nomor *</label>
                  <input
                    type="text"
                    value={customNoSuratFormat}
                    onChange={(e) => setCustomNoSuratFormat(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-smk-blue font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">No. Surat *</label>
                  <input
                    type="text"
                    value={customNomorSuratSeq}
                    onChange={(e) => setCustomNomorSuratSeq(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Terakhir</label>
                  <div className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 h-[32px] flex items-center justify-center">
                    {getLastOutgoingSeq()}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tanggal Surat *</label>
                <input
                  type="date"
                  value={customTanggalSurat}
                  onChange={(e) => setCustomTanggalSurat(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-smk-blue"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Perihal / Hal Surat *</label>
                <input
                  type="text"
                  value={customPerihal}
                  onChange={(e) => setCustomPerihal(e.target.value)}
                  placeholder="Misal: Undangan Rapat Pleno I"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-smk-blue"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tujuan Penerima *</label>
                  <input
                    type="text"
                    value={customTujuan}
                    onChange={(e) => setCustomTujuan(e.target.value)}
                    placeholder="Misal: Bapak/Ibu Pimpinan PT. XYZ"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-smk-blue"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Alamat Penerima (Opsional)</label>
                  <input
                    type="text"
                    value={customAlamatTujuan}
                    onChange={(e) => setCustomAlamatTujuan(e.target.value)}
                    placeholder="Misal: Jalan PB. Sudirman No. 12, Jember"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-smk-blue"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Isi Surat / Pesan Utama *</label>
                <textarea
                  rows={6}
                  value={customIsiSurat}
                  onChange={(e) => setCustomIsiSurat(e.target.value)}
                  placeholder="Ketik isi surat di sini secara lengkap..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-smk-blue font-serif leading-relaxed"
                  required
                ></textarea>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Penandatangan Surat Resmi</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Nama Pejabat *</label>
                    <input
                      type="text"
                      value={customNamaPenandatangan}
                      onChange={(e) => setCustomNamaPenandatangan(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">NIP Pejabat</label>
                    <input
                      type="text"
                      value={customNipPenandatangan}
                      onChange={(e) => setCustomNipPenandatangan(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Pangkat/Golongan</label>
                    <input
                      type="text"
                      value={customPangkatPenandatangan}
                      onChange={(e) => setCustomPangkatPenandatangan(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCustomModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    customId ? "Simpan Perubahan" : "Terbitkan Surat"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WYSIWYG Visual Preview Editor Modal */}
      {isVisualEditorOpen && editingCustomLetter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-2xl border border-slate-200 shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Modal Header Actions */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-smk-blue text-white rounded-t-2xl">
              <div>
                <h3 className="font-bold text-base flex items-center gap-1.5">
                  <Edit3 size={18} />
                  WYSIWYG Visual Preview Editor
                </h3>
                <p className="text-xs text-blue-100">Klik langsung pada teks di kertas A4 di bawah ini untuk mengedit isinya secara langsung!</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={saveVisualEdits}
                  disabled={isSavingVisual}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-all text-xs flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSavingVisual ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle size={14} />
                      Simpan Perubahan
                    </>
                  )}
                </button>
                <button onClick={() => setIsVisualEditorOpen(false)} className="text-white hover:text-white/80 p-1 cursor-pointer">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Scrollable Visual Editor Workspace */}
            <div className="flex-1 overflow-y-auto p-8 bg-slate-100/50 flex justify-center">
              <div className="bg-white border border-slate-300 p-12 w-full max-w-[210mm] min-h-[297mm] text-slate-900 font-serif leading-relaxed text-sm box-border flex flex-col justify-between shadow-lg relative">
                
                <div>
                  {/* Kop Surat (Read Only / Logo branding) */}
                  <div className="text-center border-b-4 border-black pb-3 flex items-center justify-between font-sans select-none">
                    <div className="w-[12%] flex justify-start">
                      <img src={logoUrl} alt="Logo Jatim" className="w-16 h-16 object-contain" />
                    </div>
                    <div className="w-[88%] text-center font-bold">
                      <h2 className="text-xs uppercase tracking-wide leading-tight text-slate-800">Pemerintah Provinsi Jawa Timur</h2>
                      <h2 className="text-sm uppercase leading-tight text-slate-800">Dinas Pendidikan</h2>
                      <h1 className="text-base uppercase leading-tight font-extrabold text-slate-900">SMK NEGERI 6 JEMBER</h1>
                      <p className="text-[9px] font-normal leading-tight font-serif mt-0.5 text-slate-600">
                        Jalan PB. Sudirman 114 Tanggul Telp/Fax. (0336) 441347 Jember 68155
                      </p>
                      <p className="text-[9px] font-normal leading-tight italic font-serif text-slate-650">
                        E-mail : smkn6.jember@yahoo.com Website : smkn6.jember.sch.id
                      </p>
                    </div>
                  </div>

                  {/* Date & Outgoing Letter Info (Visual Editable) */}
                  <div className="flex justify-between items-start mt-6 mb-6 text-xs">
                    <div className="space-y-1 w-[60%]">
                      <div className="flex">
                        <span className="w-16 font-semibold text-slate-500">Nomor</span>
                        <span className="w-3">:</span>
                        <span 
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) => handleVisualFieldChange("noSurat", e.currentTarget.innerText)}
                          className="flex-1 font-mono font-semibold border-b border-dashed border-slate-300 hover:bg-yellow-50 focus:bg-yellow-50 px-1 focus:outline-none"
                        >
                          {editingCustomLetter.noSurat}
                        </span>
                      </div>
                      <div className="flex">
                        <span className="w-16 font-semibold text-slate-500">Lamp.</span>
                        <span className="w-3">:</span>
                        <span className="flex-1 text-slate-400">-</span>
                      </div>
                      <div className="flex">
                        <span className="w-16 font-semibold text-slate-500">Hal</span>
                        <span className="w-3">:</span>
                        <span 
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) => handleVisualFieldChange("perihal", e.currentTarget.innerText)}
                          className="flex-1 font-semibold border-b border-dashed border-slate-300 hover:bg-yellow-50 focus:bg-yellow-50 px-1 focus:outline-none"
                        >
                          {editingCustomLetter.perihal}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-right w-[35%] flex justify-end gap-1">
                      <span>Jember, </span>
                      <span 
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => handleVisualFieldChange("tanggalSurat", e.currentTarget.innerText)}
                        className="font-semibold border-b border-dashed border-slate-300 hover:bg-yellow-50 focus:bg-yellow-50 px-1 focus:outline-none"
                      >
                        {formatTanggalPendek(editingCustomLetter.tanggalSurat)}
                      </span>
                    </div>
                  </div>

                  {/* Recipient Address Block (Visual Editable) */}
                  <div className="text-xs mb-8 space-y-1">
                    <p className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Kepada Yth.</p>
                    <p 
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => handleVisualFieldChange("tujuan", e.currentTarget.innerText)}
                      className="font-bold border-b border-dashed border-slate-300 hover:bg-yellow-50 focus:bg-yellow-50 px-1 focus:outline-none text-slate-900"
                    >
                      {editingCustomLetter.tujuan}
                    </p>
                    <div 
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => handleVisualFieldChange("alamatTujuan", e.currentTarget.innerText)}
                      className="border-b border-dashed border-slate-300 hover:bg-yellow-50 focus:bg-yellow-50 px-1 focus:outline-none text-slate-800"
                    >
                      {editingCustomLetter.alamatTujuan || "Ketik alamat penerima..."}
                    </div>
                    <p className="text-slate-600">di tempat</p>
                  </div>

                  {/* Main Letter Body (WYSIWYG Visual Editable) */}
                  <div className="text-xs leading-relaxed text-slate-800 font-serif my-8">
                    <p className="text-slate-400 font-sans uppercase tracking-wider text-[10px] mb-1 font-semibold select-none">Isi Surat / Pesan Utama</p>
                    <div 
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => handleVisualFieldChange("isiSurat", e.currentTarget.innerText)}
                      className="border border-dashed border-slate-300 rounded-lg p-3 hover:bg-yellow-50 focus:bg-yellow-50 focus:outline-none whitespace-pre-wrap leading-relaxed min-h-[150px]"
                    >
                      {editingCustomLetter.isiSurat}
                    </div>
                  </div>
                </div>

                {/* Signee Footer Block (Visual Editable) */}
                <div className="flex justify-end text-xs mt-10">
                  <div className="w-[45%] text-left space-y-1 border-l border-dashed border-slate-300 pl-4 py-2 hover:bg-slate-50 rounded-r-lg">
                    <p className="text-slate-650">Yang Memberikan Tugas,</p>
                    <p className="font-bold text-slate-700">Kepala Sekolah,</p>
                    <div className="h-16"></div>
                    
                    {/* Name Editable */}
                    <div 
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => handleVisualFieldChange("namaPenandatangan", e.currentTarget.innerText)}
                      className="font-bold underline border-b border-dashed border-transparent hover:border-slate-300 focus:bg-yellow-50 px-1 focus:outline-none text-slate-900"
                    >
                      {editingCustomLetter.namaPenandatangan}
                    </div>
                    
                    {/* Rank/Pangkat Editable */}
                    <div 
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => handleVisualFieldChange("pangkatPenandatangan", e.currentTarget.innerText)}
                      className="text-slate-650 border-b border-dashed border-transparent hover:border-slate-300 focus:bg-yellow-50 px-1 focus:outline-none"
                    >
                      {editingCustomLetter.pangkatPenandatangan || ""}
                    </div>
                    
                    {/* NIP Editable */}
                    <div className="flex items-center gap-1 font-mono text-[10px]">
                      <span>NIP.</span>
                      <span 
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => handleVisualFieldChange("nipPenandatangan", e.currentTarget.innerText)}
                        className="border-b border-dashed border-transparent hover:border-slate-300 focus:bg-yellow-50 px-1 focus:outline-none flex-1"
                      >
                        {editingCustomLetter.nipPenandatangan || ""}
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
