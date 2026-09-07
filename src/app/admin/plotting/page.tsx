"use client";

import React, { useState, useEffect } from "react";
import { Search, MapPin, Building2, Layers, ChevronRight, UserCircle2, Briefcase, GraduationCap, X } from "lucide-react";
import { toast } from 'sonner';

type Siswa = {
  id: number;
  namaLengkap: string;
  kelas: string;
  jk: string;
  perusahaanId: number | null;
  jurusanId: number;
  perusahaan?: { nama: string };
};

type SiswaMagang = {
  id: number;
  jk: string;
};

type Perusahaan = {
  id: number;
  nama: string;
  logo: string | null;
  siswaMagang: SiswaMagang[];
};

type KuotaDudi = {
  id: number;
  perusahaanId: number;
  jurusanId: number;
  kuotaPria: number;
  kuotaWanita: number;
  perusahaan: Perusahaan;
};

type KelasItem = {
  id: number;
  nama: string;
  jurusanId: number;
};

import ConfirmModal from '../../../components/ConfirmModal';

export default function PlottingPage() {
  const [kelasList, setKelasList] = useState<KelasItem[]>([]);
  const [selectedKelas, setSelectedKelas] = useState<KelasItem | null>(null);
  
  const [siswaList, setSiswaList] = useState<Siswa[]>([]);
  const [kuotaList, setKuotaList] = useState<KuotaDudi[]>([]);
  
  const [searchSiswa, setSearchSiswa] = useState("");
  const [searchDudi, setSearchDudi] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [globalStats, setGlobalStats] = useState({ total: 0, plotted: 0, unplotted: 0 });

  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, action: (() => void) | null, message: string}>({
    isOpen: false, 
    action: null, 
    message: ''
  });



  const generatePDF = () => {
    import('jspdf').then(jsPDFModule => {
      import('jspdf-autotable').then(autoTableModule => {
        const jsPDF = jsPDFModule.default;
        const autoTable = autoTableModule.default;
        const doc = new jsPDF();
        
        doc.setFontSize(16);
        doc.text(`Data Plotting Siswa - ${selectedKelas ? selectedKelas.nama : 'Semua'}`, 14, 15);
        doc.setFontSize(10);
        
        const now = new Date();
        const dateString = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        const timeString = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        doc.text(`Dicetak pada: ${dateString} pukul ${timeString}`, 14, 22);

        // Siapkan data DUDI dan siswa yang diplot ke sana
        const tableData: any[] = [];
        let index = 1;

        // Loop Kuota DUDI untuk mengambil list perusahaannya
        kuotaList.forEach(k => {
          // Cari siswa yang diplot ke perusahaan ini
          const siswaDiDudi = siswaList.filter(s => s.perusahaanId === k.perusahaanId);
          if (siswaDiDudi.length > 0) {
            const namaSiswaList = siswaDiDudi.map(s => `- ${s.namaLengkap}`).join('\n');
            tableData.push([
              index++,
              k.perusahaan.nama,
              namaSiswaList
            ]);
          } else {
            tableData.push([
              index++,
              k.perusahaan.nama,
              'Belum ada siswa'
            ]);
          }
        });

        autoTable(doc, {
          startY: 28,
          head: [['No', 'Nama Perusahaan', 'Daftar Siswa']],
          body: tableData,
          theme: 'grid',
          styles: { fontSize: 10, cellPadding: 3 },
          headStyles: { fillColor: [41, 128, 185] },
        });

        window.open(doc.output('bloburl'));
      });
    });
  };

  useEffect(() => {
    // Ambil data kelas
    fetch(`${process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}`}/kelas`)
      .then(res => res.json())
      .then(data => setKelasList(data))
      .catch(err => console.error(err));

    // Ambil semua siswa untuk statistik global
    fetch(`${process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}`}/siswa`)
      .then(res => res.json())
      .then((data: Siswa[]) => {
        const plotted = data.filter(s => s.perusahaanId !== null).length;
        setGlobalStats({
          total: data.length,
          plotted: plotted,
          unplotted: data.length - plotted
        });
      })
      .catch(err => console.error(err));
  }, []);

  const handleSelectKelas = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const kelasId = e.target.value;
    if (!kelasId) {
      setSelectedKelas(null);
      setSiswaList([]);
      setKuotaList([]);
      return;
    }
    
    const kelasObj = kelasList.find(k => k.id.toString() === kelasId);
    setSelectedKelas(kelasObj || null);
    
    if (kelasObj) {
      setIsLoading(true);
      try {
        const [resSiswa, resKuota] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}`}/siswa?kelas=${encodeURIComponent(kelasObj.nama)}`),
          fetch(`${process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}`}/kuota-dudi?jurusanId=${kelasObj.jurusanId}`)
        ]);
        
        const dataSiswa = await resSiswa.json();
        const dataKuota = await resKuota.json();
        
        setSiswaList(Array.isArray(dataSiswa) ? dataSiswa : []);
        setKuotaList(Array.isArray(dataKuota) ? dataKuota : []);
      } catch (error) {
        console.error(error);
        toast.error("Gagal memuat data plotting");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleDragStart = (e: React.DragEvent, siswa: Siswa) => {
    e.dataTransfer.setData("siswaId", siswa.id.toString());
    e.dataTransfer.setData("siswaJk", siswa.jk || 'L');
    if (siswa.perusahaanId) {
      e.dataTransfer.setData("oldPerusahaanId", siswa.perusahaanId.toString());
    }
    e.currentTarget.classList.add("opacity-50");
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("opacity-50");
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const executeDrop = async (
    targetSiswaId: number,
    targetPerusahaanId: number,
    targetCabangId: number | null,
    siswaJk: string,
    oldPerusahaanIdNum: number | null,
    perusahaanNama: string
  ) => {
    const toastId = toast.loading("Memploting siswa...");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}`}/siswa/${targetSiswaId}`, {
        method: "PATCH",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          perusahaanId: targetPerusahaanId,
          cabangId: targetCabangId
        })
      });
      if (res.ok) {
        toast.success("Siswa berhasil ditempatkan!", { id: toastId });
        
        setSiswaList(prev => prev.map(s => s.id === targetSiswaId ? { 
          ...s, 
          perusahaanId: targetPerusahaanId,
          perusahaan: { nama: perusahaanNama }
        } : s));
        setKuotaList(prev => prev.map(k => {
          let newSiswaMagang = [...k.perusahaan.siswaMagang];
          
          // If dragging from another DUDI, remove from old DUDI
          if (k.perusahaanId === oldPerusahaanIdNum) {
            newSiswaMagang = newSiswaMagang.filter(s => s.id !== targetSiswaId);
          } else if (k.perusahaanId === targetPerusahaanId) {
            newSiswaMagang.push({ id: targetSiswaId, jk: siswaJk });
          }

          return {
            ...k,
            perusahaan: {
              ...k.perusahaan,
              siswaMagang: newSiswaMagang
            }
          };
        }));
        
        if (!oldPerusahaanIdNum) {
          setGlobalStats(prev => ({
            ...prev,
            plotted: prev.plotted + 1,
            unplotted: prev.unplotted - 1
          }));
        }
      } else {
        throw new Error();
      }
    } catch (error) {
      toast.error("Gagal melakukan plotting", { id: toastId });
    }
  };

  const handleDrop = async (e: React.DragEvent, kuota: KuotaDudi) => {
    e.preventDefault();
    const siswaId = e.dataTransfer.getData("siswaId");
    const siswaJk = e.dataTransfer.getData("siswaJk");
    const oldPerusahaanId = e.dataTransfer.getData("oldPerusahaanId");
    
    if (!siswaId) return;

    const oldPerusahaanIdNum = oldPerusahaanId ? parseInt(oldPerusahaanId) : null;
    if (oldPerusahaanIdNum === kuota.perusahaanId) return; // Drop ke tempat yang sama

    // Cek sisa kuota
    const LakiFilled = kuota.perusahaan.siswaMagang.filter(s => s.jk === 'L').length;
    const PerempFilled = kuota.perusahaan.siswaMagang.filter(s => s.jk === 'P').length;

    if (siswaJk === 'L' && LakiFilled >= kuota.kuotaPria) {
      toast.error(`Kuota Laki-laki di ${kuota.perusahaan.nama} sudah penuh!`);
      return;
    }
    if (siswaJk === 'P' && PerempFilled >= kuota.kuotaWanita) {
      toast.error(`Kuota Perempuan di ${kuota.perusahaan.nama} sudah penuh!`);
      return;
    }

    const id = parseInt(siswaId);
    if (oldPerusahaanId && oldPerusahaanId !== kuota.perusahaanId.toString()) {
      setConfirmModal({
        isOpen: true,
        message: "Siswa ini sudah ditempatkan di DUDI lain. Apakah Anda yakin ingin memindahkannya? Riwayat kepindahan akan disimpan jika ada data terkait.",
        action: () => executeDrop(id, kuota.perusahaanId, null, siswaJk, oldPerusahaanIdNum, kuota.perusahaan.nama)
      });
    } else {
      executeDrop(id, kuota.perusahaanId, null, siswaJk, oldPerusahaanIdNum, kuota.perusahaan.nama);
    }
  };

  const handleRemovePlot = (siswaId: number, perusahaanId: number, jk: string) => {
    setConfirmModal({
      isOpen: true,
      message: "Apakah Anda yakin ingin membatalkan plotting siswa ini? Riwayat pembatalan akan disimpan jika sudah ada data absen atau jurnal.",
      action: async () => {
        const toastId = toast.loading("Membatalkan penempatan...");
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}`}/siswa/${siswaId}`, {
            method: "PATCH",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ perusahaanId: null })
          });
          if (res.ok) {
            toast.success("Penempatan dibatalkan", { id: toastId });
            setSiswaList(prev => prev.map(s => s.id === siswaId ? { ...s, perusahaanId: null, perusahaan: undefined } : s));
            setKuotaList(prev => prev.map(k => {
              if (k.perusahaanId === perusahaanId) {
                return {
                  ...k,
                  perusahaan: {
                    ...k.perusahaan,
                    siswaMagang: k.perusahaan.siswaMagang.filter(s => s.id !== siswaId)
                  }
                };
              }
              return k;
            }));
            
            setGlobalStats(prev => ({
              ...prev,
              plotted: prev.plotted - 1,
              unplotted: prev.unplotted + 1
            }));
          }
        } catch (e) {
          toast.error("Gagal membatalkan", { id: toastId });
        }
      }
    });
  };

  const displayedSiswa = (siswaList || []).filter(s => s?.namaLengkap?.toLowerCase().includes(searchSiswa.toLowerCase()));
  const filteredKuota = (kuotaList || []).filter(k => k?.perusahaan?.nama?.toLowerCase().includes(searchDudi.toLowerCase()));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-[85vh] flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <MapPin className="text-smk-blue" size={28} />
            Plotting Siswa ke DUDI
          </h1>
          <p className="text-sm text-slate-500 mt-1">Tarik dan letakkan (Drag & Drop) siswa ke dalam DUDI tujuan.</p>
        </div>
        
        {/* Statistik Global */}
        <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden divide-x divide-slate-100 items-stretch">
          <div className="px-4 py-2.5 bg-slate-50/50 flex flex-col items-center justify-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total Siswa</div>
            <div className="text-lg font-black text-slate-800 leading-none">{globalStats.total}</div>
          </div>
          <div className="px-4 py-2.5 flex flex-col items-center justify-center">
            <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-0.5">Sudah Diplot</div>
            <div className="text-lg font-black text-emerald-600 leading-none">{globalStats.plotted}</div>
          </div>
          <div className="px-4 py-2.5 flex flex-col items-center justify-center">
            <div className="text-[10px] font-bold text-orange-500 uppercase tracking-wider mb-0.5">Belum Diplot</div>
            <div className="text-lg font-black text-orange-600 leading-none">{globalStats.unplotted}</div>
          </div>
          <button 
            onClick={() => window.open('/admin/plotting/laporan', '_blank')}
            className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 flex flex-col items-center justify-center transition-colors text-blue-600 cursor-pointer"
            title="Cetak Laporan Resmi PDF"
          >
            <div className="text-[10px] font-bold uppercase tracking-wider mb-0.5 font-sans">Laporan</div>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col sm:flex-row gap-4 items-center">
        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
          <Layers size={24} />
        </div>
        <div className="flex-1 w-full">
          <label className="block text-sm font-semibold text-slate-700 mb-1">Pilih Kelas</label>
          <select
            onChange={handleSelectKelas}
            className="w-full sm:max-w-xs px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-smk-blue/20 focus:border-smk-blue transition-all"
          >
            <option value="">-- Silakan Pilih Kelas --</option>
            {kelasList.map(k => (
              <option key={k.id} value={k.id}>{k.nama}</option>
            ))}
          </select>
        </div>
      </div>

      {!selectedKelas ? (
        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 text-slate-400 p-12">
          <Building2 size={48} className="mb-4 opacity-50" />
          <h3 className="text-lg font-bold text-slate-600 mb-1">Pilih Kelas Terlebih Dahulu</h3>
          <p className="text-sm text-center max-w-sm">Pilih kelas di menu atas untuk mulai melakukan plotting siswa ke DUDI yang sesuai dengan jurusan mereka.</p>
        </div>
      ) : isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-smk-blue/20 border-t-smk-blue rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-6 flex-1">
          {/* KIRI - Daftar Siswa Belum Diplot */}
          <div className="w-full sm:flex-1 flex flex-col bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-white border-b border-slate-200 shadow-sm flex flex-col gap-3">
              <h3 className="font-bold text-slate-800 flex justify-between items-center">
                <span>Daftar Siswa</span>
                <span className="bg-orange-100 text-smk-orange px-2 py-0.5 rounded-md text-xs">{displayedSiswa.length} Siswa</span>
              </h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Cari nama siswa..."
                  value={searchSiswa}
                  onChange={(e) => setSearchSiswa(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-smk-blue"
                />
              </div>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto space-y-3 max-h-[600px]">
              {displayedSiswa.length === 0 ? (
                <div className="text-center p-8 text-sm text-slate-400 font-medium">Siswa tidak ditemukan.</div>
              ) : (
                displayedSiswa.map(siswa => {
                  const isPlotted = siswa.perusahaanId !== null;
                  return (
                    <div
                      key={siswa.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, siswa)}
                      onDragEnd={handleDragEnd}
                      className={`p-3 rounded-xl shadow-sm border cursor-grab active:cursor-grabbing transition-all flex items-center justify-between group ${
                        isPlotted 
                          ? 'bg-emerald-50 border-emerald-200 hover:border-emerald-400 hover:shadow-md' 
                          : 'bg-white border-slate-200 hover:border-smk-blue hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          isPlotted ? 'bg-emerald-200 text-emerald-700' : (siswa.jk === 'L' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600')
                        }`}>
                          <UserCircle2 size={18} />
                        </div>
                        <div>
                          <div className={`text-sm font-bold line-clamp-1 ${isPlotted ? 'text-emerald-900' : 'text-slate-800'}`}>
                            {siswa.namaLengkap}
                          </div>
                          <div className={`text-xs font-semibold mt-0.5 ${isPlotted ? 'text-emerald-600' : 'text-slate-500'}`}>
                            {isPlotted ? `📍 ${siswa.perusahaan?.nama || 'Diplot'}` : (siswa.jk === 'L' ? 'Laki-laki' : 'Perempuan')}
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={16} className={`${isPlotted ? 'text-emerald-400 group-hover:text-emerald-600' : 'text-slate-300 group-hover:text-smk-blue'} group-hover:translate-x-1 transition-transform`} />
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* KANAN - Daftar DUDI & Area Drop */}
          <div className="w-full sm:flex-1 flex flex-col bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-white border-b border-slate-200 shadow-sm flex flex-col gap-3">
              <h3 className="font-bold text-slate-800 flex justify-between items-center">
                <span>Daftar DUDI & Kuota</span>
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md text-xs">{filteredKuota.length} DUDI</span>
              </h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Cari DUDI..."
                  value={searchDudi}
                  onChange={(e) => setSearchDudi(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-smk-blue"
                />
              </div>
            </div>

            <div className="flex-1 p-4 grid grid-cols-1 gap-4 overflow-y-auto max-h-[600px]">
              {filteredKuota.length === 0 ? (
                <div className="col-span-2 text-center p-12 text-slate-500 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl">
                  Tidak ada DUDI yang membuka kuota untuk kelas ini.
                </div>
              ) : (
                filteredKuota.map(kuota => {
                  const LakiFilled = kuota.perusahaan.siswaMagang.filter(s => s.jk === 'L').length;
                  const PerempFilled = kuota.perusahaan.siswaMagang.filter(s => s.jk === 'P').length;
                  
                  const isLakiFull = LakiFilled >= kuota.kuotaPria;
                  const isPerempFull = PerempFilled >= kuota.kuotaWanita;
                  const isFull = isLakiFull && isPerempFull;

                  return (
                    <div
                      key={kuota.id}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, kuota)}
                      className={`bg-white rounded-2xl shadow-sm border-2 transition-colors flex flex-col h-fit ${isFull ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200 hover:border-smk-blue/50'}`}
                    >
                      <div className="p-2 border-b border-slate-100 flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                          {kuota.perusahaan.logo ? (
                            <img src={`${process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}`}${kuota.perusahaan.logo}`} alt={kuota.perusahaan.nama} className="w-full h-full object-cover" />
                          ) : (
                            <Briefcase className="text-slate-400" size={18} />
                          )}
                        </div>
                        <div className="flex-1 truncate">
                          <div className="text-sm font-bold text-slate-900 truncate">{kuota.perusahaan.nama}</div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            Total Kuota: {kuota.kuotaPria + kuota.kuotaWanita} Siswa
                          </div>
                        </div>
                      </div>

                      {/* Bar Kuota */}
                      <div className="p-2 bg-slate-50/50 flex flex-col gap-1.5">
                        <div className="flex flex-row gap-3">
                          <div className="flex-1">
                            <div className="flex justify-between text-xs font-bold mb-1">
                              <span className="text-blue-700">Laki-laki</span>
                              <span className={`${isLakiFull ? 'text-emerald-600' : 'text-blue-600'}`}>{LakiFilled} / {kuota.kuotaPria}</span>
                            </div>
                            <div className="w-full h-1.5 bg-blue-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-500 ${isLakiFull ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                                style={{ width: `${kuota.kuotaPria === 0 ? 0 : (LakiFilled / kuota.kuotaPria) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex justify-between text-xs font-bold mb-1">
                              <span className="text-pink-700">Perempuan</span>
                              <span className={`${isPerempFull ? 'text-emerald-600' : 'text-pink-600'}`}>{PerempFilled} / {kuota.kuotaWanita}</span>
                            </div>
                            <div className="w-full h-1.5 bg-pink-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-500 ${isPerempFull ? 'bg-emerald-500' : 'bg-pink-500'}`} 
                                style={{ width: `${kuota.kuotaWanita === 0 ? 0 : (PerempFilled / kuota.kuotaWanita) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>

                        {/* Drop Zone / Daftar Plotted */}
                        <div className={`mt-1 rounded-lg p-1.5 border-2 border-dashed ${isFull ? 'bg-emerald-50/50 border-emerald-200' : 'bg-white border-slate-200'} relative`}>
                          {LakiFilled + PerempFilled === 0 ? (
                            <div className="text-[10px] text-center text-slate-400 font-medium py-1 flex flex-row items-center justify-center gap-1.5">
                              <UserCircle2 size={14} className="opacity-50" />
                              Tarik & lepas siswa ke sini
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {/* Ambil siswa yang sudah diplot ke dudi ini. (Hanya yang dari kelas ini) */}
                              {siswaList
                                .filter(s => s.perusahaanId === kuota.perusahaanId)
                                .map(siswa => (
                                  <div 
                                    key={siswa.id} 
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, siswa)}
                                    onDragEnd={handleDragEnd}
                                    className={`flex items-center justify-between p-1.5 rounded text-[10px] font-bold cursor-grab active:cursor-grabbing ${siswa.jk === 'L' ? 'bg-blue-50 text-blue-800' : 'bg-pink-50 text-pink-800'}`}
                                  >
                                    <span className="truncate">{siswa.namaLengkap}</span>
                                    <button 
                                      onClick={() => handleRemovePlot(siswa.id, kuota.perusahaanId, siswa.jk)}
                                      className="text-slate-400 hover:text-red-500 shrink-0" 
                                      title="Batal Ploting"
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>

                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title="Konfirmasi Perubahan"
        message={confirmModal.message}
        onConfirm={() => {
          if (confirmModal.action) confirmModal.action();
          setConfirmModal({ isOpen: false, action: null, message: '' });
        }}
        onCancel={() => setConfirmModal({ isOpen: false, action: null, message: '' })}
      />

    </div>
  );
}
