"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, Printer, RefreshCw } from "lucide-react";
import Link from "next/link";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Siswa = {
  id: number;
  namaLengkap: string;
  kelas: string;
  jk: string;
};

type GuruPembimbing = {
  id: number;
  namaLengkap: string;
  nip: string;
  kontak: string | null;
};

type Perusahaan = {
  id: number;
  nama: string;
  alamat: string | null;
  alamatLengkap: string | null;
  pembimbing: string | null;
  guruPembimbing: GuruPembimbing | null;
  siswaMagang: Siswa[];
};

type PengaturanUmum = {
  pklMulaiDefault: string | null;
  pklSelesaiDefault: string | null;
  logoSekolah?: string | null;
};

const JEMBER_KECAMATAN = [
  "AJUNG", "AMBULU", "ARJASA", "BALUNG", "BANGSALSARI", "GUMUKMAS", "JELBUK", 
  "JENGGAWAH", "JOMBANG", "KALISAT", "KALIWATES", "KENCONG", "LEDOKOMBO", 
  "MAYANG", "MUMBULSARI", "PAKUSARI", "PANTI", "PATRANG", "PUGER", 
  "RAMBIPUJI", "SEMBORO", "SILO", "SUKORAMBI", "SUKOWONO", "SUMBERBARU", 
  "SUMBERJAMBE", "SUMBERSARI", "TANGGUL", "TEMPUREJO", "UMBULSARI", "WULUHAN"
];

function getKecamatan(alamat: string | null, alamatLengkap?: string | null): string {
  const raw = (alamat || alamatLengkap || "").trim();
  if (!raw) return "LAIN-LAIN";
  
  // 1. Ambil baris pertama / nama wilayah bersih (pisahkan dari baris link Maps, Koordinat, dsb)
  let firstLine = raw.split('\n')[0].split('Maps:')[0].split('(Koordinat:')[0].replace(/^Kec\.\s*/i, '').trim().toUpperCase();
  
  // Normalisasi typo / variasi umum
  if (firstLine === "KECONG") firstLine = "KENCONG";
  if (firstLine === "JEMBER KOTA") firstLine = "JEMBER";
  
  // 2. Cocokkan jika baris pertama adalah salah satu kecamatan Jember
  const matchKec = JEMBER_KECAMATAN.find(k => k === firstLine);
  if (matchKec) return matchKec;
  
  // 3. Cocokkan jika baris pertama / teks alamat mengandung nama kecamatan Jember
  const substrKec = JEMBER_KECAMATAN.find(k => firstLine.includes(k) || raw.toUpperCase().includes(k));
  if (substrKec) return substrKec;
  
  // 4. Jika baris pertama adalah nama wilayah / kota yang valid dan ringkas
  if (firstLine && firstLine.length < 35 && !firstLine.startsWith("HTTP")) {
    return firstLine;
  }
  
  return "LAIN-LAIN";
}

export default function LaporanPlottingPage() {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<Perusahaan[]>([]);
  const [pengaturan, setPengaturan] = useState<PengaturanUmum | null>(null);

  const apiHost = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resComp, resConfig] = await Promise.all([
        fetch(`${apiHost}/perusahaan`),
        fetch(`${apiHost}/siswa/pengaturan-umum`)
      ]);

      if (resComp.ok) {
        const dataComp = await resComp.json();
        setCompanies(dataComp);
      }
      if (resConfig.ok) {
        const dataConfig = await resConfig.json();
        setPengaturan(dataConfig);
      }
    } catch (error) {
      console.error("Gagal mengambil data laporan:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Group companies by Kecamatan (field 'alamat' holds kecamatan name)
  const grouped: { [kecamatan: string]: Perusahaan[] } = {};
  companies.forEach(comp => {
    const kec = getKecamatan(comp.alamat, comp.alamatLengkap);
    if (!grouped[kec]) {
      grouped[kec] = [];
    }
    grouped[kec].push(comp);
  });

  // Sort kecamatan names, putting "LAIN-LAIN" at the end
  const sortedKecamatans = Object.keys(grouped).sort((a, b) => {
    if (a === "LAIN-LAIN") return 1;
    if (b === "LAIN-LAIN") return -1;
    return a.localeCompare(b);
  });

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

  const handlePrint = async () => {
    try {
      const doc = new jsPDF('p', 'pt', 'a4');
      
      // Load logo
      let logoBase64 = '';
      try {
        const logoUrl = '/logo_jatim.png';
        logoBase64 = await getBase64Image(logoUrl);
      } catch (err) {
        console.warn("Gagal memuat logo sekolah:", err);
      }

      // Draw Kop Surat
      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', 44, 38, 43, 62);
      }
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text("PEMERINTAH PROVINSI JAWA TIMUR", 320, 43, { align: 'center' });
      doc.text("DINAS PENDIDIKAN", 320, 56, { align: 'center' });
      doc.setFontSize(15);
      doc.text("SMK NEGERI 6 JEMBER", 320, 74, { align: 'center' });
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text("Jl. PB. Sudirman No. 114 Telp/ Fax. (0336) 441347 Jember 68155", 320, 88, { align: 'center' });
      doc.setFont('helvetica', 'italic');
      doc.text("Email : smkn6.jember@yahoo.com website : smkn6.jember.sch.id", 320, 99, { align: 'center' });

      // Double Line
      doc.setLineWidth(2);
      doc.line(40, 107, 555, 107);
      doc.setLineWidth(0.5);
      doc.line(40, 110, 555, 110);

      // Title Section
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text("PLOTING PEMBIMBING PRAKTIK KERJA LAPANGAN (PKL)", 297, 135, { align: 'center' });
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      doc.text(dateRange, 297, 150, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.text(`TAHUN PELAJARAN ${schoolYear}`, 297, 165, { align: 'center' });

      // Build table data
      const tableData: any[] = [];
      
      sortedKecamatans.forEach(kecamatan => {
        // 1. Add Kecamatan header row
        tableData.push([
          { 
            content: kecamatan, 
            colSpan: 6, 
            styles: { 
              halign: 'center', 
              fillColor: [241, 245, 249], 
              fontStyle: 'bold',
              fontSize: 10
            } 
          }
        ]);

        const companiesInKec = grouped[kecamatan];
        companiesInKec.forEach((perusahaan, compIdx) => {
          const siswaList = perusahaan.siswaMagang || [];
          const totalSiswa = siswaList.length;

          if (totalSiswa === 0) {
            tableData.push([
              compIdx + 1,
              perusahaan.nama,
              perusahaan.guruPembimbing?.namaLengkap || "Belum di-plot",
              '0',
              { content: 'Belum ada siswa', styles: { fontStyle: 'italic', textColor: [150, 150, 150] } },
              { content: '-', styles: { halign: 'center', textColor: [150, 150, 150] } }
            ]);
          } else {
            // First student row (has rowspan fields)
            tableData.push([
              { content: compIdx + 1, rowSpan: totalSiswa, styles: { halign: 'center', valign: 'middle' } },
              { content: perusahaan.nama, rowSpan: totalSiswa, styles: { fontStyle: 'bold', valign: 'middle' } },
              { content: perusahaan.guruPembimbing?.namaLengkap || "Belum di-plot", rowSpan: totalSiswa, styles: { valign: 'middle' } },
              { content: totalSiswa.toString(), rowSpan: totalSiswa, styles: { halign: 'center', valign: 'middle', fontStyle: 'bold' } },
              siswaList[0].namaLengkap,
              { content: siswaList[0].kelas || '-', styles: { halign: 'center' } }
            ]);

            // Remaining students
            for (let i = 1; i < totalSiswa; i++) {
              tableData.push([
                siswaList[i].namaLengkap,
                { content: siswaList[i].kelas || '-', styles: { halign: 'center' } }
              ]);
            }
          }
        });
      });

      // Render autoTable
      autoTable(doc, {
        startY: 180,
        head: [['No', 'Nama DUDI', 'Pembimbing', 'Plot', 'Nama Siswa', 'Kelas']],
        body: tableData,
        theme: 'grid',
        headStyles: { 
          fillColor: [93, 156, 236], // RGB matching #5d9cec
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          halign: 'center'
        },
        styles: { 
          fontSize: 9, 
          cellPadding: 4,
          textColor: [0, 0, 0]
        },
        columnStyles: {
          0: { cellWidth: 30, halign: 'center' }, // No
          1: { cellWidth: 140 }, // Nama DUDI
          2: { cellWidth: 110 }, // Pembimbing
          3: { cellWidth: 35, halign: 'center' }, // Plot
          4: { cellWidth: 150 }, // Nama Siswa
          5: { cellWidth: 50, halign: 'center' }  // Kelas
        },
        margin: { left: 40, right: 40 }
      });

      const pdfBlob = doc.output('blob');
      window.open(URL.createObjectURL(pdfBlob), '_blank');
    } catch (error) {
      console.error("Gagal membuat PDF:", error);
      alert("Terjadi kesalahan saat membuat file PDF.");
    }
  };

  const tglMulai = pengaturan?.pklMulaiDefault 
    ? new Date(pengaturan.pklMulaiDefault).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : '17 November 2025';

  const tglSelesai = pengaturan?.pklSelesaiDefault 
    ? new Date(pengaturan.pklSelesaiDefault).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : '04 April 2026';

  const dateRange = `Tanggal ${tglMulai} s/d ${tglSelesai}`;

  const schoolYear = pengaturan?.pklMulaiDefault
    ? `${new Date(pengaturan.pklMulaiDefault).getFullYear()}/${new Date(pengaturan.pklMulaiDefault).getFullYear() + 1}`
    : '2025/2026';

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 sm:px-6 print:bg-white print:py-0 print:px-0">
      {/* floating navigation bar - hidden in print */}
      <div className="max-w-5xl mx-auto mb-6 bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col sm:flex-row justify-between items-center gap-4 no-print font-sans">
        <div className="flex items-center gap-3">
          <Link 
            href="/admin/plotting"
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Cetak Laporan Plotting</h1>
            <p className="text-xs text-slate-500">Tampilan resmi format cetak PDF</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="p-2.5 text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5 text-sm font-semibold cursor-pointer"
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-bold shadow-sm cursor-pointer"
            disabled={loading}
          >
            <Printer size={18} />
            Cetak PDF / Print
          </button>
        </div>
      </div>

      {loading ? (
        <div className="max-w-5xl mx-auto bg-white rounded-xl border border-slate-200 p-24 flex flex-col items-center justify-center gap-3 shadow-sm no-print font-sans">
          <RefreshCw size={40} className="animate-spin text-blue-600" />
          <span className="text-sm font-semibold text-slate-500">Memuat laporan plotting...</span>
        </div>
      ) : (
        /* Print area */
        <div className="max-w-5xl mx-auto bg-white border border-slate-300 shadow-lg p-8 sm:p-12 print:shadow-none print:border-none print:p-0 print:max-w-full font-serif text-black">
          {/* Header Kop Surat */}
          <div className="flex items-center justify-between border-b-4 border-double border-black pb-3">
            <div className="w-[12%] flex justify-start items-center">
              <img 
                src="/logo_jatim.png" 
                alt="Logo Provinsi Jatim"
                className="w-16 h-auto max-h-[85px] object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
            <div className="w-[88%] text-center font-bold font-sans">
              <h2 className="text-md tracking-wide leading-tight uppercase">Pemerintah Provinsi Jawa Timur</h2>
              <h2 className="text-md tracking-wide leading-tight uppercase">Dinas Pendidikan</h2>
              <h1 className="text-xl font-extrabold tracking-normal uppercase leading-tight">SMK NEGERI 6 JEMBER</h1>
              <p className="text-[10px] font-normal font-serif lowercase leading-tight mt-0.5">
                Jl. PB. Sudirman No. 114 Telp/ Fax. (0336) 441347 Jember 68155
              </p>
              <p className="text-[10px] font-normal font-serif lowercase leading-tight italic">
                Email : smkn6.jember@yahoo.com website : smkn6.jember.sch.id
              </p>
            </div>
          </div>

          {/* Title Section */}
          <div className="text-center my-6 uppercase font-bold font-sans">
            <h3 className="text-md tracking-wide leading-tight">Ploting Pembimbing Praktik Kerja Lapangan (PKL)</h3>
            <h3 className="text-sm tracking-wide leading-tight mt-0.5 font-normal normal-case italic font-serif">
              {dateRange}
            </h3>
            <h3 className="text-sm tracking-wide leading-tight mt-0.5 font-sans">
              Tahun Pelajaran {schoolYear}
            </h3>
          </div>

          {/* Main Table */}
          <table className="w-full border-collapse border-2 border-black font-sans text-[12px] table-fixed">
            <thead className="bg-[#5d9cec]/40 text-black font-bold text-center">
              <tr className="border-2 border-black">
                <th className="border border-black w-[5%] p-2 font-sans font-bold uppercase">No</th>
                <th className="border border-black w-[25%] p-2 font-sans font-bold uppercase">Nama DUDI</th>
                <th className="border border-black w-[20%] p-2 font-sans font-bold uppercase">Pembimbing</th>
                <th className="border border-black w-[7%] p-2 font-sans font-bold uppercase">Plot</th>
                <th className="border border-black w-[30%] p-2 font-sans font-bold uppercase">Nama Siswa</th>
                <th className="border border-black w-[13%] p-2 font-sans font-bold uppercase">Kelas</th>
              </tr>
            </thead>
            <tbody>
              {sortedKecamatans.map(kecamatan => {
                const companiesInKec = grouped[kecamatan];
                return (
                  <React.Fragment key={`kec-${kecamatan}`}>
                    <tr className="bg-slate-100/50">
                      <td 
                        colSpan={6} 
                        className="border-2 border-black p-2.5 text-center font-bold tracking-widest text-[14px] uppercase font-sans border-t-2 border-b-2"
                      >
                        {kecamatan}
                      </td>
                    </tr>
                    
                    {companiesInKec.map((perusahaan, compIdx) => {
                      const siswaList = perusahaan.siswaMagang || [];
                      const totalSiswa = siswaList.length;

                      if (totalSiswa === 0) {
                        return (
                          <tr key={`perusahaan-${perusahaan.id}`} className="border border-black">
                            <td className="border border-black text-center p-2">{compIdx + 1}</td>
                            <td className="border border-black p-2 font-semibold text-left">{perusahaan.nama}</td>
                            <td className="border border-black p-2 text-left">{perusahaan.guruPembimbing?.namaLengkap || "Belum di-plot"}</td>
                            <td className="border border-black text-center p-2">0</td>
                            <td className="border border-black p-2 text-slate-400 italic text-left">Belum ada siswa</td>
                            <td className="border border-black p-2 text-center text-slate-400">-</td>
                          </tr>
                        );
                      }

                      return (
                        <React.Fragment key={`perusahaan-${perusahaan.id}`}>
                          <tr className="border border-black">
                            <td className="border border-black text-center p-2 align-middle font-sans" rowSpan={totalSiswa}>
                              {compIdx + 1}
                            </td>
                            <td className="border border-black p-2 align-middle font-semibold text-left font-sans" rowSpan={totalSiswa}>
                              {perusahaan.nama}
                            </td>
                            <td className="border border-black p-2 align-middle text-left font-sans" rowSpan={totalSiswa}>
                              {perusahaan.guruPembimbing?.namaLengkap || "Belum di-plot"}
                            </td>
                            <td className="border border-black text-center p-2 align-middle font-sans font-bold" rowSpan={totalSiswa}>
                              {totalSiswa}
                            </td>
                            <td className="border border-black p-2 text-left font-sans">
                              {siswaList[0].namaLengkap}
                            </td>
                            <td className="border border-black p-2 text-center font-sans">
                              {siswaList[0].kelas || '-'}
                            </td>
                          </tr>
                          
                          {siswaList.slice(1).map((siswa, sIdx) => (
                            <tr key={`siswa-${siswa.id}-${sIdx}`} className="border border-black">
                              <td className="border border-black p-2 text-left font-sans">
                                {siswa.namaLengkap}
                              </td>
                              <td className="border border-black p-2 text-center font-sans">
                                {siswa.kelas || '-'}
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* css styles specifically for window.print() */}
      <style jsx global>{`
        @media print {
          /* Force all containers to be visible and have auto height */
          html, body, #__next, div, main, aside, header, nav, .no-print {
            background: white !important;
            color: black !important;
          }
          
          /* Specifically reset the main wrapper divs that hide overflow */
          .flex, .h-screen, .overflow-hidden, .flex-1, .flex-col {
            height: auto !important;
            overflow: visible !important;
            display: block !important;
          }

          body, html {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
          }
          
          /* Hide layout side bars and headers */
          aside, header, nav, .no-print {
            display: none !important;
          }
          
          /* Reset main content container */
          main {
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            width: 100% !important;
            max-width: 100% !important;
            display: block !important;
            overflow: visible !important;
          }
          
          /* Remove layout page padding/margins */
          .mx-auto, .max-w-6xl, .flex-1, .p-4, .sm\:p-6, .lg\:p-8, .min-h-screen, .bg-slate-100 {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
            background: white !important;
            border: none !important;
            box-shadow: none !important;
          }
          
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          thead {
            display: table-header-group;
          }
        }
      `}</style>
    </div>
  );
}
