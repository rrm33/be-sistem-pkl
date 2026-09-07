import React from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, Building2, Users } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-smk-blue text-sm font-semibold mb-8">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-smk-blue"></span>
            </span>
            Sistem Informasi PKL v2.0
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight mb-6">
            Manajemen Praktik Kerja Lapangan
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-smk-blue to-blue-400 mt-2">
              SMK Negeri 6 Jember
            </span>
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-xl text-slate-500 mb-10">
            Platform terpadu untuk mengelola, memantau, dan mengevaluasi kegiatan Praktik Kerja Lapangan siswa dengan lebih efektif dan efisien.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/login"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-semibold text-white bg-smk-blue rounded-xl hover:bg-blue-700 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/20 transition-all duration-300"
            >
              Masuk ke Sistem
              <ArrowRight size={20} />
            </Link>
          </div>
        </div>

        <div className="mt-32 grid md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg transition-shadow duration-300">
            <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center text-smk-blue mb-6">
              <Users size={28} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Untuk Siswa</h3>
            <p className="text-slate-500 leading-relaxed">
              Pantau jadwal PKL, isi jurnal harian, catat presensi kehadiran, dan dapatkan informasi terbaru dari guru pembimbing secara *real-time*.
            </p>
          </div>
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg transition-shadow duration-300">
            <div className="w-14 h-14 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 mb-6">
              <BookOpen size={28} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Untuk Guru</h3>
            <p className="text-slate-500 leading-relaxed">
              Kelola data siswa bimbingan, pantau jurnal harian, evaluasi kinerja siswa, dan berikan nilai PKL dengan mudah dalam satu *dashboard*.
            </p>
          </div>
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg transition-shadow duration-300">
            <div className="w-14 h-14 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600 mb-6">
              <Building2 size={28} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Untuk DUDI</h3>
            <p className="text-slate-500 leading-relaxed">
              Verifikasi kehadiran siswa, setujui jurnal harian, dan berikan penilaian langsung dari industri untuk kompetensi keahlian siswa.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
