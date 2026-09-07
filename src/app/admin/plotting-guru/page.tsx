"use client";

import React, { useState, useEffect } from "react";
import { Search, MapPin, Building2, ChevronRight, UserCircle2, Briefcase, X, GraduationCap, Users } from "lucide-react";
import { toast } from 'sonner';
import ConfirmModal from '../../../components/ConfirmModal';

type Guru = {
  id: number;
  namaLengkap: string;
  nip: string;
  perusahaanBimbingan: { id: number; nama: string }[];
};

type Perusahaan = {
  id: number;
  nama: string;
  logo: string | null;
  alamat?: string;
  alamatLengkap?: string;
  guruPembimbingId: number | null;
  guruPembimbing?: { id: number; namaLengkap: string; nip: string } | null;
};

export default function PlottingGuruPage() {
  const [guruList, setGuruList] = useState<Guru[]>([]);
  const [dudiList, setDudiList] = useState<Perusahaan[]>([]);
  
  const [searchGuru, setSearchGuru] = useState("");
  const [searchDudi, setSearchDudi] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [globalStats, setGlobalStats] = useState({ totalDudi: 0, terisi: 0, kosong: 0 });

  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, action: (() => void) | null, message: string}>({
    isOpen: false, 
    action: null, 
    message: ''
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [resGuru, resDudi] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}`}/guru-pembimbing`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}`}/perusahaan`)
      ]);
      const dataGuru = await resGuru.json();
      const dataDudi = await resDudi.json();
      
      setGuruList(dataGuru);
      setDudiList(dataDudi);
      
      const terisi = dataDudi.filter((d: Perusahaan) => d.guruPembimbingId !== null).length;
      setGlobalStats({
        totalDudi: dataDudi.length,
        terisi: terisi,
        kosong: dataDudi.length - terisi
      });
    } catch (err) {
      toast.error("Gagal memuat data");
    } finally {
      setIsLoading(false);
    }
  };

  const generatePDF = () => {
    import('jspdf').then(jsPDFModule => {
      import('jspdf-autotable').then(autoTableModule => {
        const jsPDF = jsPDFModule.default;
        const autoTable = autoTableModule.default;
        const doc = new jsPDF();
        
        doc.setFontSize(16);
        doc.text(`Data Plotting Guru Pembimbing`, 14, 15);
        doc.setFontSize(10);
        
        const now = new Date();
        const dateString = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        const timeString = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        doc.text(`Dicetak pada: ${dateString} pukul ${timeString}`, 14, 22);

        const tableData: any[] = [];
        let index = 1;

        dudiList.forEach(dudi => {
          tableData.push([
            index++,
            dudi.nama,
            dudi.guruPembimbing ? dudi.guruPembimbing.namaLengkap : 'BELUM DIPLOT'
          ]);
        });

        autoTable(doc, {
          startY: 28,
          head: [['No', 'Nama Perusahaan', 'Guru Pembimbing']],
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
    fetchData();
  }, []);

  const handleDragStart = (e: React.DragEvent, guru: Guru) => {
    e.dataTransfer.setData("guruId", guru.id.toString());
    e.currentTarget.classList.add("opacity-50");
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("opacity-50");
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const executePlotting = async (guruIdStr: string, dudiId: number) => {
    const guruId = parseInt(guruIdStr);
    const toastId = toast.loading("Memploting guru...");
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}`}/perusahaan/${dudiId}`, {
        method: "PATCH",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guruPembimbingId: guruId })
      });
      
      if (res.ok) {
        toast.success("Guru berhasil ditempatkan!", { id: toastId });
        await fetchData(); // Refresh data to get relations updated
      } else {
        throw new Error();
      }
    } catch (error) {
      toast.error("Gagal melakukan plotting", { id: toastId });
    }
  };

  const handleDrop = async (e: React.DragEvent, dudi: Perusahaan) => {
    e.preventDefault();
    const guruIdStr = e.dataTransfer.getData("guruId");
    
    if (!guruIdStr) return;

    if (dudi.guruPembimbingId && dudi.guruPembimbingId.toString() === guruIdStr) {
      // Sama
      return;
    }

    if (dudi.guruPembimbingId) {
      setConfirmModal({
        isOpen: true,
        message: `DUDI ${dudi.nama} sudah dibimbing oleh ${dudi.guruPembimbing?.namaLengkap}. Anda yakin ingin menggantinya?`,
        action: () => executePlotting(guruIdStr, dudi.id)
      });
    } else {
      executePlotting(guruIdStr, dudi.id);
    }
  };

  const handleRemovePlot = (dudiId: number) => {
    setConfirmModal({
      isOpen: true,
      message: "Apakah Anda yakin ingin menghapus pembimbing dari DUDI ini?",
      action: async () => {
        const toastId = toast.loading("Menghapus pembimbing...");
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}`}/perusahaan/${dudiId}`, {
            method: "PATCH",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ guruPembimbingId: null })
          });
          if (res.ok) {
            toast.success("Pembimbing dihapus", { id: toastId });
            await fetchData();
          } else {
            throw new Error();
          }
        } catch (e) {
          toast.error("Gagal membatalkan", { id: toastId });
        }
      }
    });
  };

  const displayedGuru = guruList.filter(g => g.namaLengkap.toLowerCase().includes(searchGuru.toLowerCase()));
  const displayedDudi = dudiList.filter(d => d.nama.toLowerCase().includes(searchDudi.toLowerCase()));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-[85vh] flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <GraduationCap className="text-smk-blue" size={28} />
            Plotting Guru Pembimbing
          </h1>
          <p className="text-sm text-slate-500 mt-1">Tarik dan letakkan Guru ke dalam kotak DUDI tujuan.</p>
        </div>
        
        {/* Statistik Global */}
        <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden divide-x divide-slate-100 items-stretch">
          <div className="px-4 py-2.5 bg-slate-50/50 flex flex-col items-center justify-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total DUDI</div>
            <div className="text-lg font-black text-slate-800 leading-none">{globalStats.totalDudi}</div>
          </div>
          <div className="px-4 py-2.5 flex flex-col items-center justify-center">
            <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-0.5">Terisi Guru</div>
            <div className="text-lg font-black text-emerald-600 leading-none">{globalStats.terisi}</div>
          </div>
          <div className="px-4 py-2.5 flex flex-col items-center justify-center">
            <div className="text-[10px] font-bold text-orange-500 uppercase tracking-wider mb-0.5">Belum Ada Guru</div>
            <div className="text-lg font-black text-orange-600 leading-none">{globalStats.kosong}</div>
          </div>
          <button 
            onClick={generatePDF}
            className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 flex flex-col items-center justify-center transition-colors text-blue-600 cursor-pointer"
            title="Cetak Data Plotting Guru"
          >
            <div className="text-[10px] font-bold uppercase tracking-wider mb-0.5">Cetak</div>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-smk-blue/20 border-t-smk-blue rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-6 items-stretch flex-1 min-h-0">
          
          {/* KIRI - Daftar Guru */}
          <div className="w-full sm:flex-1 flex flex-col bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-white border-b border-slate-200 shadow-sm flex flex-col gap-3">
              <h3 className="font-bold text-slate-800 flex flex-wrap justify-between items-center gap-2">
                <span className="flex items-center gap-2">
                  <Users size={18} className="text-smk-blue" />
                  Daftar Guru
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-md text-[11px] border border-blue-100 font-bold">
                    Total: {guruList.length}
                  </span>
                  <span className="bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-md text-[11px] border border-emerald-100 font-bold">
                    Sudah Plotting: {guruList.filter(g => g.perusahaanBimbingan && g.perusahaanBimbingan.length > 0).length}
                  </span>
                  <span className="bg-rose-50 text-rose-700 px-2.5 py-0.5 rounded-md text-[11px] border border-rose-100 font-bold">
                    Belum Plotting: {guruList.filter(g => !g.perusahaanBimbingan || g.perusahaanBimbingan.length === 0).length}
                  </span>
                </div>
              </h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Cari nama guru..."
                  value={searchGuru}
                  onChange={(e) => setSearchGuru(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-smk-blue"
                  autoComplete="off"
                  data-lpignore="true"
                />
              </div>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto space-y-3 max-h-[600px]">
              {displayedGuru.length === 0 ? (
                <div className="text-center p-8 text-sm text-slate-400 font-medium">Guru tidak ditemukan.</div>
              ) : (
                displayedGuru.map(guru => {
                  return (
                    <div
                      key={guru.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, guru)}
                      onDragEnd={handleDragEnd}
                      className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 cursor-grab active:cursor-grabbing hover:border-smk-blue hover:shadow-md transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                          <UserCircle2 size={18} />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-800 line-clamp-1">{guru.namaLengkap}</div>
                          <div className="text-[10px] font-medium text-slate-500 mt-1 line-clamp-2 leading-tight">
                            {guru.perusahaanBimbingan && guru.perusahaanBimbingan.length > 0 
                              ? <span className="text-emerald-600 font-semibold">{guru.perusahaanBimbingan.map((p: any) => p.nama).join(', ')}</span>
                              : "Belum membimbing DUDI"
                            }
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-slate-300 group-hover:text-smk-blue group-hover:translate-x-1 transition-transform" />
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* KANAN - Daftar DUDI */}
          <div className="w-full sm:flex-1 flex flex-col bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-white border-b border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h3 className="font-bold text-slate-800">Daftar DUDI ({displayedDudi.length})</h3>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Cari DUDI..."
                  value={searchDudi}
                  onChange={(e) => setSearchDudi(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-smk-blue"
                  autoComplete="off"
                  data-lpignore="true"
                />
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3 max-h-[600px]">
              {displayedDudi.length === 0 ? (
                <div className="text-center p-8 text-sm text-slate-400 font-medium">DUDI tidak ditemukan.</div>
              ) : (
                displayedDudi.map(dudi => {
                  const isFilled = dudi.guruPembimbingId !== null;

                  return (
                    <div
                      key={dudi.id}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, dudi)}
                      className={`bg-white p-3 rounded-xl shadow-sm border-2 transition-all flex flex-col xl:flex-row xl:items-center justify-between gap-3 group ${isFilled ? 'border-emerald-200 bg-emerald-50/10' : 'border-slate-200 hover:border-smk-blue'}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-100 overflow-hidden shrink-0 flex items-center justify-center text-orange-600">
                          {dudi.logo ? (
                            <img src={`${process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}`}${dudi.logo}`} alt={dudi.nama} className="w-full h-full object-cover" />
                          ) : (
                            <Building2 size={16} />
                          )}
                        </div>
                        <div className="truncate">
                          <div className="text-sm font-bold text-slate-800 line-clamp-1">{dudi.nama}</div>
                          <div className="text-[10px] font-semibold text-slate-500 mt-0.5 truncate">
                            {dudi.alamatLengkap || dudi.alamat || 'Alamat belum diatur'}
                          </div>
                        </div>
                      </div>

                      {/* Drop Zone Guru */}
                      <div className={`rounded-lg p-1.5 border-2 border-dashed shrink-0 sm:w-48 xl:w-56 ${isFilled ? 'bg-emerald-50 border-emerald-300' : 'bg-slate-50 border-slate-300'} flex items-center justify-center transition-colors`}>
                        {!isFilled ? (
                          <div className="text-[10px] text-center text-slate-400 font-medium flex items-center gap-1.5 py-1">
                            <UserCircle2 size={14} className="opacity-50" />
                            Tarik Guru ke sini
                          </div>
                        ) : (
                          <div className="w-full flex items-center justify-between text-xs font-bold bg-emerald-100 text-emerald-800 px-2 py-1.5 rounded-md">
                            <div className="flex items-center gap-1.5 truncate">
                              <GraduationCap size={14} className="text-emerald-600 shrink-0" />
                              <span className="truncate">{dudi.guruPembimbing?.namaLengkap}</span>
                            </div>
                            <button 
                              onClick={() => handleRemovePlot(dudi.id)}
                              className="text-emerald-500 hover:text-red-500 shrink-0 ml-1.5 bg-white rounded p-0.5" 
                              title="Ganti/Hapus Pembimbing"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        )}
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
        title="Konfirmasi Penempatan"
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
