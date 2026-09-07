"use client";

import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import Swal from 'sweetalert2';

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Deteksi apakah aplikasi sudah berjalan dalam mode PWA (Standalone)
    const isAppStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                            ('standalone' in window.navigator && (window.navigator as any).standalone === true);
    
    setIsStandalone(isAppStandalone);

    // Deteksi perangkat iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Mencegah Chrome memunculkan prompt install bawaan agar kita bisa membuat tombol kustom
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!isAppStandalone) {
        setIsInstallable(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Jika berhasil di-install
    window.addEventListener('appinstalled', () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstallable(false);
      }
      setDeferredPrompt(null);
    } else if (isIOS && !isStandalone) {
      Swal.fire({
        title: 'Install di iPhone/iPad',
        html: `1. Buka aplikasi web ini melalui <b>Safari</b><br/>2. Tekan ikon <b>Share</b> (Bagikan) di bagian bawah layar<br/>3. Pilih <b>'Add to Home Screen'</b> (Tambahkan ke Layar Utama)`,
        icon: 'info',
        confirmButtonColor: '#1C587A',
        confirmButtonText: 'Tutup'
      });
    }
  };

  // Jika sudah ter-install, sembunyikan tombol
  if (isStandalone) return null;
  // Jika tidak bisa di-install (kecuali iOS yg memang butuh panduan manual), sembunyikan
  if (!isInstallable && !isIOS) return null;

  return (
    <button
      onClick={handleInstallClick}
      className="flex items-center gap-2 px-3 py-1.5 bg-smk-blue text-white text-sm font-semibold rounded-full hover:bg-smk-blue/90 transition-colors shadow-sm"
      title="Install Aplikasi"
    >
      <Download size={16} />
      <span className="hidden sm:inline">Install App</span>
    </button>
  );
}
