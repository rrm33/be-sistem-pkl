"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import { LayoutDashboard, GraduationCap, Users, Settings, LogOut, Menu, X, Bell, Layers, Building2, Briefcase, MapPin, Contact, BookUser, MessageCircle, Shield, CheckCircle2, Clock, UserCheck, CreditCard, BookOpen, Camera, SlidersHorizontal, CheckSquare, Award, FileText, Printer } from "lucide-react";
import { Toaster, toast } from 'sonner';
import Cookies from 'js-cookie';
import { io, Socket } from 'socket.io-client';
import InstallPWA from '@/components/InstallPWA';
import PullToRefresh from '@/components/PullToRefresh';
import Swal from 'sweetalert2';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userName, setUserName] = useState("Admin");
  const [userRole, setUserRole] = useState("Admin");
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const name = Cookies.get('userName');
    const role = Cookies.get('userRole');
    if (name) setUserName(name);
    if (role) setUserRole(role);

    const token = Cookies.get('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userId = payload.sub;
        
        // Fetch unread count
        fetch(`${process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}`}/chat/unread/${userId}`)
          .then(res => res.json())
          .then(data => setUnreadCount(data))
          .catch(() => {});

        // Listen for socket events for unread messages
        const socket = io(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}`, { query: { userId } });
        socket.on('receiveMessage', () => {
          setUnreadCount(prev => prev + 1);
        });
        
        // Kurangi jumlah unread jika pesan sudah dibaca di halaman chat
        socket.on('messagesRead', (data: { messageIds: number[] }) => {
          setUnreadCount(prev => Math.max(0, prev - data.messageIds.length));
        });

        // Register Service Worker for Push Notifications
        const registerServiceWorker = async () => {
          if ('serviceWorker' in navigator && 'PushManager' in window) {
            try {
              const registration = await navigator.serviceWorker.register('/sw.js');
              
              // Only request permission if not denied
              if (Notification.permission !== 'denied') {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                  const urlBase64ToUint8Array = (base64String: string) => {
                    const padding = '='.repeat((4 - base64String.length % 4) % 4);
                    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
                    const rawData = window.atob(base64);
                    const outputArray = new Uint8Array(rawData.length);
                    for (let i = 0; i < rawData.length; ++i) {
                      outputArray[i] = rawData.charCodeAt(i);
                    }
                    return outputArray;
                  };

                  // Public Vapid Key from Backend
                  const publicVapidKey = 'BCyogK0sIInk4eKdmMd8UQtKCbWBclp5nP_t5oFDoXzkVgeL350DLCxsvO-m9CRymz5hOFA7cB2XocVk3MNMn_s';
                  
                  let subscription = await registration.pushManager.getSubscription();
                  
                  if (!subscription) {
                    try {
                      subscription = await registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
                      });
                    } catch (subErr: any) {
                      console.error('Subscribe Error:', subErr);
                      if (subErr.message && subErr.message.includes('existing subscription')) {
                        // Unsubscribe and retry
                        const oldSub = await registration.pushManager.getSubscription();
                        if (oldSub) await oldSub.unsubscribe();
                        subscription = await registration.pushManager.subscribe({
                          userVisibleOnly: true,
                          applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
                        });
                      } else {
                        throw subErr;
                      }
                    }
                  }

                  // Send to backend
                  if (subscription) {
                    await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/push/subscribe`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ userId, subscription })
                    });
                  }
                }
              }
            } catch (err: any) {
              console.error('Push Service Error:', err.message || err);
            }
          }
        };

        registerServiceWorker();

        return () => {
          socket.disconnect();
        };
      } catch (e) {}
    }
  }, []);

  const handleLogout = () => {
    Swal.fire({
      title: 'Konfirmasi Keluar',
      text: "Apakah Anda yakin ingin keluar dari aplikasi?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#1C587A',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Ya, Keluar',
      cancelButtonText: 'Batal'
    }).then((result) => {
      if (result.isConfirmed) {
        Cookies.remove('token');
        Cookies.remove('userRole');
        Cookies.remove('userName');
        toast.success('Berhasil keluar');
        router.push('/login');
      }
    });
  };

  const navigationGroups = [
    {
      title: "UMUM",
      items: [
        { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
        { name: "Manajemen Pengguna", href: "/admin/users", icon: Shield },
      ]
    },
    {
      title: "MASTER DATA",
      items: [
        { name: "Data Jurusan", href: "/admin/jurusan", icon: GraduationCap },
        { name: "Data Kelas", href: "/admin/kelas", icon: Layers },
        { name: "Data Siswa", href: "/admin/siswa", icon: Users },
        { name: "Data Guru", href: "/admin/guru", icon: Contact },
        { name: "Data Perusahaan", href: "/admin/dudi", icon: Building2 },
      ]
    },
    {
      title: "MANAJEMEN PKL",
      items: [
        { name: "Kuota DUDI", href: "/admin/kuota", icon: Briefcase },
        { name: "Plotting Siswa", href: "/admin/plotting", icon: MapPin },
        { name: "Plotting Guru", href: "/admin/plotting-guru", icon: BookUser },
        { name: "Plotting Guru Nego", href: "/admin/plotting-nego", icon: BookUser },
        { name: "Laporan Plotting", href: "/admin/plotting/laporan", icon: Printer },
        { name: "Ajuan Edit Profil", href: "/admin/ajuan-profil", icon: UserCheck },
        { name: "Absensi", href: "/admin/absensi", icon: CheckCircle2 },
        { name: "Izin & Sakit", href: "/admin/izin", icon: Clock },
        { name: "Iuran BPJS", href: "/admin/bpjs", icon: CreditCard },
        { name: "Jurnal Harian", href: "/admin/jurnal", icon: BookOpen },
        { name: "Monitoring PKL", href: "/admin/monitoring", icon: Camera },
        { name: "Aspek Penilaian", href: "/admin/aspek-penilaian", icon: SlidersHorizontal },
        { name: "Penilaian Siswa", href: "/admin/penilaian", icon: CheckSquare },
        { name: "Sertifikat PKL", href: "/admin/sertifikat", icon: Award },
        { name: "Manajemen Surat", href: "/admin/surat-tugas", icon: FileText },
        { name: "Pengaturan PKL", href: "/admin/pengaturan-pkl", icon: Settings },
      ]
    },
    {
      title: "KOMUNIKASI",
      items: [
        { name: "Pesan", href: "/admin/chat", icon: MessageCircle },
      ]
    }
  ];

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-20 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed lg:static inset-y-0 left-0 w-72 bg-white border-r border-slate-200 z-30 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } shadow-2xl lg:shadow-none`}
      >
        <div className="h-24 flex items-center justify-between px-6 border-b border-slate-100 bg-white/50 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 flex items-center justify-center">
              <img src="/logo.png" alt="Logo SMKN 6 Jember" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-smk-blue leading-tight">Sistem PKL</h1>
              <p className="text-xs text-smk-orange font-semibold">POKJA PKL SMKN 6</p>
            </div>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {navigationGroups.map((group) => (
            <div key={group.title} className="space-y-0.5">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 mt-1.5 px-2.5">
                {group.title}
              </div>
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg transition-all duration-200 group relative overflow-hidden text-[13px] ${
                      isActive 
                        ? "text-smk-blue font-bold bg-smk-blue/5" 
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-smk-orange rounded-r-full shadow-[0_0_8px_rgba(231,120,38,0.6)]"></div>
                    )}
                    
                    <Icon 
                      size={18} 
                      className={`relative z-10 transition-colors ${
                        isActive ? "text-smk-orange" : "text-slate-400 group-hover:text-slate-600"
                      }`} 
                    />
                    <span className="relative z-10 flex-1 truncate">{item.name}</span>
                    {item.name === "Pesan" && unreadCount > 0 && (
                      <span className="relative z-10 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-slate-100">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2.5 px-2.5 py-1.5 w-full rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all duration-200 group text-[13px]"
          >
            <LogOut size={18} className="text-slate-400 group-hover:text-red-500 transition-colors" />
            <span className="font-semibold">Keluar</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-10">
          <div className="flex items-center justify-between h-full px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <Menu size={24} />
              </button>
            </div>

            <div className="flex items-center gap-5">
              <div className="flex items-center gap-2">
                <InstallPWA />
                <Link href="/admin/chat" className="relative p-2 rounded-full text-slate-400 hover:text-smk-blue hover:bg-slate-100 transition-colors">
                  <MessageCircle size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white border-2 border-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
                <button className="relative p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                  <Bell size={20} />
                  <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                </button>
              </div>
              
              <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
              
              <Link href="/admin/profil" className="flex items-center gap-3 cursor-pointer group">
                <div className="hidden sm:block text-right">
                  <div className="text-sm font-semibold text-slate-700 group-hover:text-smk-blue transition-colors">{userName}</div>
                  <div className="text-xs text-slate-500 font-medium capitalize">{userRole?.toLowerCase() || ''}</div>
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-100 border-2 border-white shadow-sm overflow-hidden group-hover:ring-2 group-hover:ring-smk-blue/20 transition-all">
                  <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${userName}&backgroundColor=f8fafc`} alt="Profile" className="w-full h-full object-cover" />
                </div>
              </Link>
            </div>
          </div>
        </header>
        
        {/* Page Content */}
        <PullToRefresh className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </PullToRefresh>
      </main>
      <Toaster position="top-right" richColors theme="light" />
    </div>
  );
}
