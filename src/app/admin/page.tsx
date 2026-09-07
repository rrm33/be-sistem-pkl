"use client";

import React, { useState, useEffect } from 'react';
import { Users, GraduationCap, Building2, MapPin, Activity, Map as MapIcon } from 'lucide-react';
import Cookies from 'js-cookie';
import dynamic from 'next/dynamic';

// Import map dynamically to avoid SSR issues with Leaflet
const MultiMapViewer = dynamic(() => import('@/components/MultiMapViewer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] bg-slate-100 rounded-xl animate-pulse flex items-center justify-center">
      <p className="text-slate-500 font-medium">Memuat Peta Persebaran...</p>
    </div>
  ),
});

export default function AdminDashboard() {
  const [userName, setUserName] = useState("Admin");
  const [userRole, setUserRole] = useState("ADMIN");
  
  // Dashboard Stats
  const [stats, setStats] = useState({ siswa: 0, guru: 0, dudi: 0, siswaAktif: 0 });
  const [mapMarkers, setMapMarkers] = useState<any[]>([]);

  useEffect(() => {
    const name = Cookies.get('userName');
    const role = Cookies.get('userRole');
    if (name) setUserName(name);
    if (role) setUserRole(role);

    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Panggil API secara paralel
      const [resSiswa, resGuru, resDudi] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/siswa`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/guru-pembimbing`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/perusahaan`)
      ]);

      const dataSiswa = await resSiswa.json();
      const dataGuru = await resGuru.json();
      const dataDudi = await resDudi.json();

      setStats({
        siswa: dataSiswa.length || 0,
        guru: dataGuru.length || 0,
        dudi: dataDudi.length || 0,
        // Asumsi siswa aktif adalah yang sudah memiliki perusahaanId
        siswaAktif: dataSiswa.filter((s: any) => s.perusahaanId).length || 0
      });

      // Parsing koordinat DUDI & Cabang untuk Peta
      const markers: any[] = [];
      const coordRegex = /(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/;

      dataDudi.forEach((dudi: any) => {
        // Parse main office/perusahaan location
        const fullAlamat = dudi.alamatLengkap || dudi.alamat;
        if (fullAlamat) {
          const match = fullAlamat.match(coordRegex);
          if (match && match.length >= 3) {
            markers.push({
              id: `perusahaan-${dudi.id}`,
              nama: dudi.nama,
              lat: parseFloat(match[1]),
              lng: parseFloat(match[2]),
              guruPembimbing: dudi.guruPembimbing,
              siswaMagang: dudi.siswaMagang ? dudi.siswaMagang.filter((s: any) => !s.cabangId) : []
            });
          }
        }

        // Parse cabang locations
        const cabangList = dudi.cabang || [];
        cabangList.forEach((cabang: any) => {
          if (cabang.alamat) {
            const match = cabang.alamat.match(coordRegex);
            if (match && match.length >= 3) {
              markers.push({
                id: `cabang-${dudi.id}-${cabang.id}`,
                nama: `${dudi.nama} (${cabang.namaCabang})`,
                lat: parseFloat(match[1]),
                lng: parseFloat(match[2]),
                guruPembimbing: dudi.guruPembimbing,
                siswaMagang: dudi.siswaMagang ? dudi.siswaMagang.filter((s: any) => s.cabangId === cabang.id) : []
              });
            }
          }
        });
      });
      setMapMarkers(markers);
    } catch (error) {
      console.error("Gagal menarik data dashboard:", error);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard Utama</h1>
          <p className="text-sm text-slate-500 mt-1">
            Selamat datang kembali, <span className="font-semibold text-smk-blue">{userName}</span>!
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
        {/* Card 1 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <Users size={28} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Siswa</p>
            <p className="text-2xl font-bold text-slate-900">{stats.siswa}</p>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
            <GraduationCap size={28} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Guru</p>
            <p className="text-2xl font-bold text-slate-900">{stats.guru}</p>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-14 h-14 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center shrink-0">
            <Building2 size={28} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Perusahaan</p>
            <p className="text-2xl font-bold text-slate-900">{stats.dudi}</p>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shrink-0">
            <MapPin size={28} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Siswa Aktif PKL</p>
            <p className="text-2xl font-bold text-slate-900">{stats.siswaAktif}</p>
          </div>
        </div>
      </div>

      {/* Peta Persebaran DUDI */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-smk-blue/10 text-smk-blue rounded-lg flex items-center justify-center">
            <MapIcon size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Peta Persebaran DUDI</h2>
            <p className="text-sm text-slate-500">Distribusi lokasi tempat Praktik Kerja Lapangan</p>
          </div>
        </div>
        
        <MultiMapViewer markers={mapMarkers} />
      </div>

    </div>
  );
}
