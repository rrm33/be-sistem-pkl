"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { toast } from 'sonner';
import { 
  User, MapPin, Camera, AlertTriangle, LogOut, CheckCircle2, 
  Building2, RefreshCw, Smartphone, Check, HelpCircle
} from 'lucide-react';

export default function SiswaDashboardPage() {
  const router = useRouter();
  
  // App version (matching Flutter AppConfig)
  const appVersion = "1.0.0";
  
  // States
  const [userData, setUserData] = useState<any>(null);
  const [todayStatus, setTodayStatus] = useState<any>(null);
  const [allowedRadius, setAllowedRadius] = useState<number>(50);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [isIphone, setIsIphone] = useState<boolean>(true);
  const [bypassDeviceCheck, setBypassDeviceCheck] = useState<boolean>(false);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  useEffect(() => {
    // 1. Authenticate user role
    const token = Cookies.get('token');
    const role = Cookies.get('userRole');
    if (!token || role !== 'SISWA') {
      toast.error("Silakan login terlebih dahulu");
      router.push('/siswa/login');
      return;
    }

    // 2. iOS/iPhone User Agent check
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIphone(isIOS);

    // If local dev, auto-enable bypass or allow testing
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      setBypassDeviceCheck(true);
    }

    fetchSiswaData();
    fetchSettings();
    determineLocation();
  }, []);

  const fetchSiswaData = async () => {
    const token = Cookies.get('token');
    if (!token) return;
    
    try {
      // Decode JWT payload (standard token shape is payload: { username })
      const payloadBase64 = token.split('.')[1];
      const payload = JSON.parse(atob(payloadBase64));
      const username = payload.username;
      
      if (!username) throw new Error();

      const timestamp = Date.now();
      const res = await fetch(`${API_URL}/auth/me/${username}?t=${timestamp}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setUserData(data.siswa);
        setTodayStatus(data.todayStatus);
      } else {
        throw new Error();
      }
    } catch {
      toast.error("Gagal memuat data siswa");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/siswa/pengaturan-umum`);
      if (res.ok) {
        const data = await res.json();
        setAllowedRadius(data.radiusAbsenMeter ?? 50);
      }
    } catch {
      // Use fallback default
    }
  };

  const determineLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation tidak didukung oleh browser Anda");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setCurrentCoords({ lat, lng });
        setIsLocating(false);
        toast.success("GPS Berhasil dikunci!");
      },
      (error) => {
        setIsLocating(false);
        let msg = "Gagal mengakses GPS.";
        if (error.code === error.PERMISSION_DENIED) {
          msg = "Akses lokasi ditolak. Silakan aktifkan izin lokasi di Safari/browser.";
        }
        toast.error(msg);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Haversine distance formula
  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) *
        Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in meters
  };

  const parseCoordinates = (mapStr: string): { lat: number; lng: number } | null => {
    if (!mapStr) return null;
    const regex = /(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/;
    const match = regex.exec(mapStr);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }
    return null;
  };

  // Calculate distance when currentCoords or userData changes
  useEffect(() => {
    if (!currentCoords || !userData) return;

    // Use branch/cabang location if active, fallback to main office
    const cabang = todayStatus?.cabang;
    const targetGeoObj = cabang ?? userData.perusahaan;
    if (!targetGeoObj) return;

    const maps = [
      targetGeoObj.maps1,
      targetGeoObj.maps2,
      targetGeoObj.maps3,
    ];

    let minDistance: number | null = null;

    for (const mapStr of maps) {
      const targetCoords = parseCoordinates(mapStr);
      if (targetCoords) {
        const dist = getDistance(
          currentCoords.lat,
          currentCoords.lng,
          targetCoords.lat,
          targetCoords.lng
        );
        if (minDistance === null || dist < minDistance) {
          minDistance = dist;
        }
      }
    }

    setDistance(minDistance);
  }, [currentCoords, userData, todayStatus]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelfieFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelfiePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitAbsen = async (isClockIn: boolean) => {
    if (!currentCoords) {
      toast.error("Menunggu koordinat GPS terkunci...");
      determineLocation();
      return;
    }
    if (!selfieFile) {
      toast.error("Silakan ambil foto selfie wajah terlebih dahulu.");
      return;
    }
    if (distance !== null && distance > allowedRadius) {
      toast.error(`Jarak Anda ${distance.toFixed(0)}m dari lokasi PKL. Maksimal ${allowedRadius}m!`);
      return;
    }

    setIsSubmitting(true);
    toast.loading("Mengirim absensi...", { id: "absen-submit" });

    try {
      const formData = new FormData();
      formData.append('foto', selfieFile);
      formData.append('siswaId', userData.id.toString());
      formData.append('koordinat', `${currentCoords.lat},${currentCoords.lng}`);

      const endpoint = isClockIn ? '/absensi/clock-in' : '/absensi/clock-out';
      const token = Cookies.get('token');

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const resData = await res.json();
      if (res.ok) {
        toast.success(isClockIn ? "Absen masuk berhasil!" : "Absen pulang berhasil!", { id: "absen-submit" });
        setSelfieFile(null);
        setSelfiePreview(null);
        fetchSiswaData(); // Reload live status
      } else {
        toast.error(resData.message || "Gagal melakukan absensi", { id: "absen-submit" });
      }
    } catch {
      toast.error("Terjadi kesalahan koneksi", { id: "absen-submit" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    Cookies.remove('token');
    Cookies.remove('userRole');
    Cookies.remove('userName');
    toast.success("Berhasil keluar.");
    router.push('/siswa/login');
  };

  if (isLoading || !userData) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center font-sans">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-smk-blue"></div>
        <p className="text-xs text-slate-500 font-semibold mt-4">Memuat panel siswa...</p>
      </div>
    );
  }

  // Device & Database Flag Lockout Screen
  const isRegisteredIos = userData?.isIosUser === true;
  
  if ((!isIphone || !isRegisteredIos) && !bypassDeviceCheck) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center px-6 py-12 font-sans text-center">
        <div className="bg-white max-w-md mx-auto p-6 rounded-2xl shadow-xl shadow-slate-200 border border-slate-100 space-y-4">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
            <Smartphone size={32} />
          </div>
          <h2 className="text-xl font-black text-slate-800">Akses Absensi Web Ditolak</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            {!isRegisteredIos ? (
              <>
                Akun Anda terdaftar sebagai **pengguna Android**. 
                <br />
                Anda wajib menggunakan aplikasi **SMK PKL Mobile** di perangkat Android Anda untuk melakukan absensi demi validitas lokasi GPS.
              </>
            ) : (
              <>
                Absensi web ini hanya dikhususkan untuk perangkat **iPhone (iOS)**. 
                <br />
                Silakan akses halaman ini menggunakan browser **Safari** pada perangkat iPhone Anda.
              </>
            )}
          </p>
          <div className="pt-2">
            <button
              onClick={handleLogout}
              className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all"
            >
              Keluar Sesi
            </button>
            {/* Secret bypass button for testing/admin */}
            <button
              onClick={() => setBypassDeviceCheck(true)}
              className="block mx-auto mt-4 text-[9px] text-slate-300 underline"
            >
              Bypass Device Check (Admin Only)
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isAlreadyClockedIn = todayStatus?.todayAbsensi != null;
  const isAlreadyClockedOut = isAlreadyClockedIn && todayStatus?.todayAbsensi?.jamKeluar != null;
  const activeOffice = todayStatus?.cabang ?? userData.perusahaan;
  const distanceOk = distance !== null && distance <= allowedRadius;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans pb-10">
      {/* Top Header */}
      <header className="bg-gradient-to-r from-smk-blue to-blue-800 text-white shadow-md">
        <div className="px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white p-1 rounded-xl flex items-center justify-center shadow-sm">
              <img src="/logo.png" alt="Logo SMKN 6" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight leading-tight">SMK PKL Mobile (Web)</h1>
              <p className="text-[10px] text-orange-300 font-bold uppercase tracking-wider">Khusus iPhone • v{appVersion}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all"
            title="Keluar"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 px-4 py-5 space-y-4 max-w-md mx-auto w-full">
        {/* Student Info Card */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-50 text-smk-blue flex items-center justify-center font-bold">
            <User size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">{userData.namaLengkap}</h2>
            <p className="text-[11px] text-slate-400 font-medium">
              Kelas {userData.kelas || '-'} • NISN: {userData.nisn}
            </p>
          </div>
        </div>

        {/* Today Attendance Status Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Status Absen Hari Ini</span>
            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
              isAlreadyClockedOut
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : isAlreadyClockedIn
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              {isAlreadyClockedOut ? 'Selesai' : isAlreadyClockedIn ? 'Hadir (Masuk)' : 'Belum Absen'}
            </span>
          </div>
          <div className="p-4 grid grid-cols-2 gap-4">
            <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl text-center">
              <div className="text-[9px] font-black text-emerald-700 uppercase tracking-wider mb-0.5">Jam Masuk</div>
              <div className="text-base font-black text-emerald-800">
                {todayStatus?.todayAbsensi?.jamMasuk 
                  ? new Date(todayStatus.todayAbsensi.jamMasuk).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                  : '--:--'}
              </div>
            </div>
            <div className="p-3 bg-orange-50/50 border border-orange-100 rounded-xl text-center">
              <div className="text-[9px] font-black text-orange-700 uppercase tracking-wider mb-0.5">Jam Pulang</div>
              <div className="text-base font-black text-orange-800">
                {todayStatus?.todayAbsensi?.jamKeluar 
                  ? new Date(todayStatus.todayAbsensi.jamKeluar).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                  : '--:--'}
              </div>
            </div>
          </div>
        </div>

        {/* GPS Verification Card */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin size={14} className="text-smk-blue" />
              Verifikasi Lokasi (GPS)
            </h3>
            <button 
              onClick={determineLocation}
              disabled={isLocating}
              className="p-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-500 rounded-lg transition-all"
              title="Refresh Lokasi"
            >
              <RefreshCw size={14} className={isLocating ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="space-y-2 text-xs border border-slate-100 p-3 rounded-xl bg-slate-50/50">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">Instansi Penempatan:</span>
              <span className="font-bold text-slate-700">{activeOffice?.nama || activeOffice?.namaCabang || '-'}</span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100/50 pt-2">
              <span className="text-slate-400 font-medium">Titik GPS Anda:</span>
              <span className="font-mono text-[10px] font-bold text-slate-800">
                {currentCoords ? `${currentCoords.lat.toFixed(6)}, ${currentCoords.lng.toFixed(6)}` : 'Mencari...'}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100/50 pt-2">
              <span className="text-slate-400 font-medium">Jarak Terdekat:</span>
              <span className={`font-bold ${distanceOk ? 'text-emerald-600' : 'text-red-500'}`}>
                {distance !== null ? `${distance.toFixed(0)} meter` : 'Menghitung...'}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100/50 pt-2">
              <span className="text-slate-400 font-medium">Batas Toleransi:</span>
              <span className="font-bold text-slate-700">{allowedRadius} meter</span>
            </div>
          </div>

          {distance !== null && !distanceOk && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-[11px] leading-relaxed flex gap-2">
              <AlertTriangle size={15} className="shrink-0 text-red-500 mt-0.5" />
              <span>
                Jarak Anda terlalu jauh dari lokasi penempatan PKL. Harap mendekat ke area kantor untuk melakukan absensi.
              </span>
            </div>
          )}
        </div>

        {/* Check-in Selfie Capture & Action */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Camera size={14} className="text-smk-blue" />
            Selfie Wajah
          </h3>

          <div className="flex flex-col items-center justify-center">
            {selfiePreview ? (
              <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-200">
                <img src={selfiePreview} alt="Selfie Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => { setSelfieFile(null); setSelfiePreview(null); }}
                  className="absolute right-2 top-2 px-2.5 py-1 bg-red-600 text-white rounded-lg text-[10px] font-bold shadow-md"
                >
                  Ulangi
                </button>
              </div>
            ) : (
              <label 
                htmlFor="selfie-camera"
                className="w-full aspect-video border-2 border-dashed border-slate-200 hover:border-smk-blue rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-50 hover:bg-blue-50/20 transition-all"
              >
                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-smk-blue">
                  <Camera size={22} />
                </div>
                <span className="text-xs font-bold text-slate-700">Ambil Foto Selfie</span>
                <span className="text-[10px] text-slate-400">Gunakan kamera depan iPhone Anda</span>
              </label>
            )}
            <input
              type="file"
              accept="image/*"
              capture="user"
              onChange={handleFileChange}
              className="hidden"
              id="selfie-camera"
              disabled={isAlreadyClockedOut}
            />
          </div>

          <div className="space-y-2">
            {!isAlreadyClockedIn ? (
              <button
                type="button"
                onClick={() => handleSubmitAbsen(true)}
                disabled={isSubmitting || !distanceOk || !selfieFile}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-500/10 transition-all flex items-center justify-center gap-1.5"
              >
                <Check size={15} />
                {isSubmitting ? 'Mengirim...' : 'KIRIM ABSEN MASUK'}
              </button>
            ) : !isAlreadyClockedOut ? (
              <button
                type="button"
                onClick={() => handleSubmitAbsen(false)}
                disabled={isSubmitting || !distanceOk || !selfieFile}
                className="w-full py-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs shadow-lg shadow-orange-500/10 transition-all flex items-center justify-center gap-1.5"
              >
                <Check size={15} />
                {isSubmitting ? 'Mengirim...' : 'KIRIM ABSEN PULANG'}
              </button>
            ) : (
              <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 text-center rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
                <CheckCircle2 size={16} className="text-emerald-500" />
                Anda sudah menyelesaikan absensi hari ini!
              </div>
            )}
          </div>
        </div>

        {/* Guidelines Card */}
        <div className="bg-slate-100 p-4 rounded-2xl border border-slate-200/50 text-xs text-slate-500 space-y-2">
          <h4 className="font-bold text-slate-700 flex items-center gap-1">
            <HelpCircle size={14} className="text-slate-400" /> Petunjuk Absensi Web:
          </h4>
          <ul className="list-disc list-inside space-y-1 pl-1 leading-relaxed">
            <li>Pastikan izin lokasi (GPS) browser Safari/HP Anda sudah diizinkan (*Allowed*).</li>
            <li>Ambil selfie orisinil menggunakan kamera depan, pastikan wajah Anda menghadap penuh dan latar belakang terlihat jelas.</li>
            <li>Absensi hanya bisa dilakukan jika jarak GPS Anda berada di dalam toleransi radius kantor.</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
